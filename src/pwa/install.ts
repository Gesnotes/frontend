/**
 * Installation de l'application.
 *
 * Chrome et Edge émettent `beforeinstallprompt` quand l'application est
 * installable, mais l'événement n'est émis **qu'une fois** : capté trop tard,
 * il est perdu et le bouton d'installation ne peut plus rien faire. Il est
 * donc intercepté ici, au chargement du module, hors de tout composant React.
 *
 * Safari (iOS et macOS) n'implémente pas cet événement : l'installation y
 * passe par « Ajouter à l'écran d'accueil », d'où le mode d'emploi affiché à
 * la place du bouton.
 */

type InstallOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome }>;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;

function notify() {
  for (const listener of listeners) listener();
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Sans `preventDefault`, Chrome affiche sa propre mini-bannière et
    // l'événement n'est plus disponible pour notre bouton.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

export function subscribeInstall(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** L'application tourne-t-elle déjà en mode installé ? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS, qui n'expose pas `display-mode`.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function canPrompt(): boolean {
  return deferred !== null;
}

export function wasInstalled(): boolean {
  return installed;
}

/** Navigateur iOS : l'installation passe par le menu Partager de Safari. */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  // Chrome et Firefox sur iOS embarquent WebKit mais ne savent pas installer.
  return isIos && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

export async function promptInstall(): Promise<InstallOutcome | 'indisponible'> {
  if (!deferred) return 'indisponible';

  await deferred.prompt();
  const { outcome } = await deferred.userChoice;

  // L'événement n'est pas réutilisable : Chrome en émettra un nouveau si
  // l'utilisateur a refusé et redevient éligible.
  deferred = null;
  notify();

  return outcome;
}
