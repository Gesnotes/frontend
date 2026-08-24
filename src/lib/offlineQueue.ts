import { isApiError } from '../api';
import { saveGradeBatch } from '../api/resources/grades';
import type { GradeBatchPayload, GradeBatchResult } from '../api';

/**
 * File d'attente des saisies parties hors connexion.
 *
 * Un enseignant qui saisit une composition dans une salle sans réseau ne doit
 * pas perdre son travail ni avoir à le recommencer. Le lot est donc stocké
 * localement et rejoué dès le retour de la connexion.
 *
 * **Ce mécanisme n'est sûr que parce que `PUT /teachers/me/grades` est
 * idempotent** : le lot décrit l'état voulu d'une évaluation, pas une suite
 * de créations. Réémettre un lot déjà passé — cas classique quand la réponse
 * s'est perdue mais que l'écriture a eu lieu — ne produit aucun doublon, le
 * backend répond simplement `unchanged`. Avec l'ancien `POST /grades`, la
 * même file aurait dupliqué les notes de toute une classe.
 *
 * **Liée au compte, pas à l'appareil** : `bind(userId)` (appelé par
 * `AuthProvider` à chaque changement de session) fait basculer la file sur
 * le stockage propre à ce compte. Sur un poste partagé, un enseignant qui
 * se reconnecte après une expiration de session récupère sa propre file ;
 * un collègue qui se connecte ensuite sur le même poste ne voit — et ne
 * peut envoyer — que la sienne, jamais celle laissée par le précédent.
 */

const STORAGE_KEY = 'gesnotes.pending-batches';

export type PendingBatch = {
  id: string;
  /** Libellé lisible, ex. « Mathématiques · 3e A · Composition ». */
  label: string;
  queuedAt: string;
  payload: GradeBatchPayload;
  /** Dernier motif d'échec, pour l'afficher sans relancer un envoi. */
  lastError?: string;
};

export type FlushReport = {
  sent: number;
  failed: number;
  dropped: { label: string; reason: string }[];
  results: GradeBatchResult[];
};

type Listener = (queue: PendingBatch[]) => void;

class OfflineQueue {
  private userId: number | null = null;
  private queue: PendingBatch[] = [];
  private listeners = new Set<Listener>();
  private flushing = false;

  list(): PendingBatch[] {
    return this.queue;
  }

  get size(): number {
    return this.queue.length;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Fait basculer la file sur le compte donné, `null` hors session.
   *
   * Recharge son stockage propre plutôt que de garder la file du compte
   * précédent en mémoire : sans ça, un poste partagé qui passe d'un
   * enseignant à un autre continuerait de proposer — et de pouvoir envoyer
   * sous le nouveau compte — les saisies encore en attente de l'ancien.
   * Se reconnecter sous le MÊME compte (session expirée pendant une saisie
   * hors connexion) recharge au contraire cette même file, intacte : c'est
   * le cas que ce mécanisme doit justement préserver (voir `AuthProvider`).
   */
  bind(userId: number | null): void {
    if (userId === this.userId) return;
    this.userId = userId;
    this.queue = userId === null ? [] : read(userId);
    this.notify();
  }

  /**
   * Met un lot en attente.
   *
   * Un lot déjà en file pour la même évaluation est **remplacé** : l'écran
   * décrit un état voulu, et c'est la dernière version saisie qui fait foi.
   * Empiler les versions successives ferait clignoter les notes des familles
   * au fil du rejeu.
   */
  enqueue(payload: GradeBatchPayload, label: string): PendingBatch {
    const key = evaluationKey(payload);
    const entry: PendingBatch = {
      id: key,
      label,
      queuedAt: new Date().toISOString(),
      payload,
    };

    this.queue = [...this.queue.filter((item) => item.id !== key), entry];
    this.persist();
    return entry;
  }

  remove(id: string): void {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.persist();
  }

  clear(): void {
    this.queue = [];
    this.persist();
  }

  /**
   * Tente de rejouer toute la file.
   *
   * Une erreur réseau ou serveur laisse le lot en attente ; une erreur
   * définitive (période supprimée, affectation retirée) le **retire** avec son
   * motif — le garder ferait échouer chaque tentative suivante sans que rien
   * ne puisse le débloquer.
   */
  async flush(): Promise<FlushReport> {
    const report: FlushReport = { sent: 0, failed: 0, dropped: [], results: [] };
    if (this.flushing || this.queue.length === 0) return report;

    this.flushing = true;
    try {
      for (const entry of [...this.queue]) {
        try {
          report.results.push(await saveGradeBatch(entry.payload));
          report.sent += 1;
          this.remove(entry.id);
        } catch (error) {
          const retryable = !isApiError(error) || error.isRetryable;
          const reason = isApiError(error) ? error.message : 'Erreur inconnue';

          if (retryable) {
            report.failed += 1;
            this.update(entry.id, { lastError: reason });
          } else {
            report.dropped.push({ label: entry.label, reason });
            this.remove(entry.id);
          }
        }
      }
    } finally {
      this.flushing = false;
    }

    return report;
  }

  private update(id: string, patch: Partial<PendingBatch>) {
    this.queue = this.queue.map((item) => (item.id === id ? { ...item, ...patch } : item));
    this.persist();
  }

  private persist() {
    // Sans compte lié, la file reste valable pour l'onglet mais n'est pas
    // écrite sous une clé non scopée — voir `bind`.
    if (this.userId !== null) write(this.userId, this.queue);
    this.notify();
  }

  private notify() {
    for (const listener of this.listeners) listener(this.queue);
  }
}

/** Une saisie en attente est identifiée par son évaluation. */
function evaluationKey(payload: GradeBatchPayload): string {
  return String(payload.evaluationId);
}

function storageKey(userId: number): string {
  return `${STORAGE_KEY}.${userId}`;
}

function read(userId: number): PendingBatch[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingBatch[]) : [];
  } catch {
    // Stockage indisponible ou contenu corrompu : on repart d'une file vide
    // plutôt que d'empêcher l'application de démarrer.
    return [];
  }
}

function write(userId: number, queue: PendingBatch[]): void {
  try {
    const key = storageKey(userId);
    if (queue.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(queue));
  } catch {
    // Quota atteint ou mode privé : la file reste valable pour cet onglet.
  }
}

export const offlineQueue = new OfflineQueue();
