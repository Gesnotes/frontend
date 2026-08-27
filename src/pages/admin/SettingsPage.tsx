import {
  ChevronDown, ChevronUp, FileText, ListChecks, School, Trash2, Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { errorMessage, isApiError, referentialsApi, schoolApi, type GradeType } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import {
  Alert, Button, CheckboxChip, ConfirmDialog, Modal, ModalActions, Skeleton, TextField, useToast,
} from '../../ui';

/**
 * Réglages propres à l'école — pour l'instant, le seul champ configurable est
 * le seuil de passage (par défaut 10). D'autres pourront s'ajouter ici plus
 * tard, sans changer la place de cet écran.
 */
export default function SettingsPage() {
  const settings = schoolApi.useSchoolSettings();

  return (
    <>
      <div className="border-b border-gray-100 bg-white px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">Réglages propres à votre école</p>
      </div>

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        <QueryBoundary query={settings} loading={<SettingsSkeleton />}>
          {(data) => (
            <>
              <SchoolCard name={data.name} email={data.email} phone={data.phone} address={data.address} />
              <PassingGradeCard current={data.passingGrade} />
              <BulletinTemplateCard
                hasHeaderImage={data.hasBulletinHeaderImage}
                hasFooterImage={data.hasBulletinFooterImage}
              />
              <GradeTypesCard />
            </>
          )}
        </QueryBoundary>
      </div>
    </>
  );
}

function SchoolCard({
  name, email, phone, address,
}: { name: string; email: string | null; phone: string | null; address: string | null }) {
  const toast = useToast();
  const update = schoolApi.useUpdateContactInfo();

  const initial = { email: email ?? '', phone: phone ?? '', address: address ?? '' };
  // `null` tant que l'utilisateur n'a rien touché : le formulaire suit alors
  // directement les props (dérivé au rendu, pas un effet qui resynchronise
  // — un effet ici écraserait une saisie en cours si les props changent,
  // par ex. après l'invalidation de la requête déclenchée par `submit`).
  const [edited, setEdited] = useState<typeof initial | null>(null);
  const values = edited ?? initial;
  const [error, setError] = useState<string | null>(null);

  const dirty =
    values.email.trim() !== initial.email ||
    values.phone.trim() !== initial.phone ||
    values.address.trim() !== initial.address;

  function field(key: keyof typeof initial) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      setEdited({ ...values, [key]: e.target.value });
    };
  }

  async function submit() {
    setError(null);
    try {
      const saved = await update.mutateAsync({
        email: values.email.trim() || null,
        phone: values.phone.trim() || null,
        address: values.address.trim() || null,
      });
      setEdited({ email: saved.email ?? '', phone: saved.phone ?? '', address: saved.address ?? '' });
      toast.success('Coordonnées enregistrées');
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dde1ff] text-[#173bab]">
          <School size={20} aria-hidden="true" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Établissement</h2>
      </div>

      {error ? (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      <div className="space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nom de l'école</span>
          <input
            type="text"
            value={name}
            readOnly
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
          />
        </label>

        <TextField label="Email" type="email" value={values.email} onChange={field('email')} />
        <TextField label="Téléphone" type="tel" value={values.phone} onChange={field('phone')} />
        <TextField label="Adresse" value={values.address} onChange={field('address')} />

        <div className="flex justify-end">
          <Button disabled={!dirty} loading={update.isPending} onClick={() => void submit()}>
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}

function PassingGradeCard({ current }: { current: number }) {
  const toast = useToast();
  const update = schoolApi.useUpdatePassingGrade();
  // `null` tant que l'utilisateur n'a rien touché : le champ suit alors
  // directement `current` (dérivé au rendu, pas un effet qui resynchronise
  // — voir le même choix sur `SchoolCard` ci-dessus).
  const [edited, setEdited] = useState<string | null>(null);
  const value = edited ?? String(current);
  const [error, setError] = useState<string | null>(null);

  const dirty = value.trim() !== String(current);

  async function submit() {
    setError(null);
    const parsed = Number(value.replace(',', '.'));
    if (!value.trim() || Number.isNaN(parsed) || parsed < 0 || parsed > 20) {
      setError('Entrez une moyenne entre 0 et 20.');
      return;
    }
    try {
      const saved = await update.mutateAsync(parsed);
      setEdited(String(saved.passingGrade));
      toast.success('Seuil de passage enregistré');
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">Seuil de passage</h2>
      <p className="mt-1 mb-4 text-sm text-gray-500">
        Moyenne à partir de laquelle un élève est considéré admis dans une matière. Par défaut 10.
      </p>

      {error ? (
        <div className="mb-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      <div className="flex items-end gap-3">
        <TextField
          label="Seuil de passage"
          type="number"
          inputMode="decimal"
          min={0}
          max={20}
          step={0.25}
          value={value}
          onChange={(e) => setEdited(e.target.value)}
        />
        <Button disabled={!dirty} loading={update.isPending} onClick={() => void submit()}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

/** Lit un fichier choisi comme data URL (`data:image/png;base64,...`), le format attendu par l'API. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Personnalisation du bulletin PDF par image téléversée (logo, en-tête
 * officiel, cachet...) : l'en-tête remplace le nom de l'école, le pied de
 * page s'ajoute au-dessus de la mention générique (« Généré le... Gesnotes »),
 * jamais à sa place — voir bulletin/pdf.ts.
 */
function BulletinTemplateCard({
  hasHeaderImage, hasFooterImage,
}: { hasHeaderImage: boolean; hasFooterImage: boolean }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dde1ff] text-[#173bab]">
          <FileText size={20} aria-hidden="true" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Modèle de bulletin</h2>
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Une image (PNG ou JPEG, 1,5 Mo maximum) ajoutée au bulletin PDF téléchargé par
        l'administration, les enseignants et les familles — utile pour un en-tête déjà mis en
        forme (logo, cachet officiel) ou une ligne de signature en pied de page.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BulletinImageSlotCard
          slot="header"
          label="En-tête (remplace le nom de l'école)"
          hasImage={hasHeaderImage}
        />
        <BulletinImageSlotCard slot="footer" label="Pied de page" hasImage={hasFooterImage} />
      </div>
    </div>
  );
}

function BulletinImageSlotCard({
  slot, label, hasImage,
}: { slot: schoolApi.BulletinImageSlot; label: string; hasImage: boolean }) {
  const toast = useToast();
  const preview = schoolApi.useBulletinImagePreview(slot, hasImage);
  const upload = schoolApi.useUploadBulletinImage(slot);
  const remove = schoolApi.useRemoveBulletinImage(slot);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Objet URL propre au blob courant, recréé seulement quand le blob change ;
  // révoqué à chaque changement et au démontage, sinon chaque nouvel aperçu
  // fuit l'ancien.
  const previewUrl = useMemo(
    () => (preview.data ? URL.createObjectURL(preview.data) : null),
    [preview.data],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-choisir le même fichier après une erreur
    if (!file) return;

    setError(null);
    try {
      const dataUrl = await readAsDataUrl(file);
      await upload.mutateAsync(dataUrl);
      toast.success('Image enregistrée');
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function onRemove() {
    setError(null);
    try {
      await remove.mutateAsync();
      toast.success('Image retirée');
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  const busy = upload.isPending || remove.isPending;

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>

      <div className="mt-3 flex h-20 items-center justify-center rounded-lg bg-gray-50">
        {hasImage && previewUrl ? (
          <img src={previewUrl} alt="" className="max-h-16 max-w-full object-contain" />
        ) : hasImage && preview.isPending ? (
          <Skeleton width="80%" height={16} />
        ) : (
          <span className="text-xs text-gray-400">Aucune image</span>
        )}
      </div>

      {error ? (
        <div className="mt-3">
          <Alert tone="danger">{error}</Alert>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => void onFileChosen(e)}
        />
        <Button
          size="sm"
          variant="secondary"
          loading={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} aria-hidden="true" /> {hasImage ? 'Remplacer' : 'Téléverser'}
        </Button>
        {hasImage ? (
          <Button size="sm" variant="ghost" disabled={busy} loading={remove.isPending} onClick={() => void onRemove()}>
            <Trash2 size={14} aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Catégories de notes (interrogation, devoir, composition — et toute autre
 * catégorie ajoutée par l'école) et leur poids dans la moyenne.
 *
 * Le référentiel n'est plus fermé (voir gradeType.service.ts côté backend) :
 * l'administration peut désormais ajouter, modifier, réordonner et archiver
 * ses propres types — par exemple deux devoirs de même poids à la place du
 * duo devoir/composition. Un type déjà utilisé s'archive toujours (sort du
 * formulaire de saisie sans rien perdre) mais ne peut être supprimé pour de
 * bon que depuis les Archives, et seulement s'il n'est plus référencé par
 * aucune note.
 */
function GradeTypesCard() {
  const toast = useToast();
  const gradeTypes = referentialsApi.useGradeTypes();
  const archive = referentialsApi.useArchiveGradeType();
  const reorder = referentialsApi.useUpdateGradeType();

  const [creating, setCreating] = useState(false);
  const [creationKey, setCreationKey] = useState(0);
  const [editing, setEditing] = useState<GradeType | null>(null);
  const [toArchive, setToArchive] = useState<GradeType | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  function openCreate() {
    setCreationKey((key) => key + 1);
    setCreating(true);
  }

  async function confirmArchive() {
    if (!toArchive) return;
    setArchiveError(null);
    try {
      await archive.mutateAsync(toArchive.id);
      toast.success(`« ${toArchive.label} » archivé`);
      setToArchive(null);
    } catch (cause) {
      setArchiveError(errorMessage(cause));
      if (!isApiError(cause) || !cause.isConflict) toast.error(errorMessage(cause));
    }
  }

  /** Échange la position avec le voisin — pas de glisser-déposer pour une liste aussi courte. */
  async function move(list: GradeType[], index: number, direction: -1 | 1) {
    const current = list[index];
    const swapWith = list[index + direction];
    if (!current || !swapWith) return;
    await Promise.all([
      reorder.mutateAsync({ id: current.id, position: swapWith.position }),
      reorder.mutateAsync({ id: swapWith.id, position: current.position }),
    ]);
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dde1ff] text-[#173bab]">
            <ListChecks size={20} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Types de note</h2>
            <p className="text-sm text-gray-500">
              Catégories utilisées pour saisir les évaluations, et leur poids dans la moyenne.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>Ajouter un type</Button>
      </div>

      <QueryBoundary query={gradeTypes} loading={<Skeleton height={140} />}>
        {(items) =>
          items.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun type de note actif.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((gradeType, index) => (
                <div key={gradeType.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => void move(items, index, -1)}
                        className="text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-25"
                        aria-label={`Monter « ${gradeType.label} »`}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        disabled={index === items.length - 1}
                        onClick={() => void move(items, index, 1)}
                        className="text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-25"
                        aria-label={`Descendre « ${gradeType.label} »`}
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{gradeType.label}</span>
                        {gradeType.required ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            Obligatoire
                          </span>
                        ) : null}
                      </div>
                      <span className="text-sm text-gray-500">Poids {gradeType.weight}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="tonal" onClick={() => setEditing(gradeType)}>Modifier</Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setArchiveError(null);
                        setToArchive(gradeType);
                      }}
                    >
                      Archiver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </QueryBoundary>

      <GradeTypeModal
        key={editing ? editing.id : `new-${creationKey}`}
        open={creating || editing !== null}
        gradeType={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(label) => {
          setCreating(false);
          setEditing(null);
          toast.success(`« ${label} » enregistré`);
        }}
      />

      <ConfirmDialog
        open={toArchive !== null}
        title={`Archiver « ${toArchive?.label ?? ''} » ?`}
        description={
          archiveError ??
          "Ce type sort du formulaire de saisie, mais rien n'est perdu : vous pouvez le restaurer — ou le supprimer définitivement s'il n'est plus utilisé — depuis les Archives."
        }
        confirmLabel="Archiver"
        loading={archive.isPending}
        onCancel={() => setToArchive(null)}
        onConfirm={() => void confirmArchive()}
      />
    </div>
  );
}

function GradeTypeModal({
  open, gradeType, onClose, onSaved,
}: {
  open: boolean;
  gradeType: GradeType | null;
  onClose: () => void;
  onSaved: (label: string) => void;
}) {
  const create = referentialsApi.useCreateGradeType();
  const update = referentialsApi.useUpdateGradeType();

  const [label, setLabel] = useState(gradeType?.label ?? '');
  const [weight, setWeight] = useState(gradeType ? String(gradeType.weight) : '1');
  const [required, setRequired] = useState(gradeType?.required ?? false);
  const [error, setError] = useState<string | null>(null);

  const pending = create.isPending || update.isPending;

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError(null);

    const parsedWeight = Number(weight.replace(',', '.'));
    if (!label.trim()) {
      setError('Le libellé est obligatoire.');
      return;
    }
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setError('Le poids doit être un nombre strictement positif.');
      return;
    }

    const payload = { label: label.trim(), weight: parsedWeight, required };
    try {
      if (gradeType) await update.mutateAsync({ id: gradeType.id, ...payload });
      else await create.mutateAsync(payload);
      onSaved(payload.label);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={gradeType ? 'Modifier le type de note' : 'Ajouter un type de note'}
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void submit()}
          confirmLabel={gradeType ? 'Enregistrer' : 'Ajouter'}
          loading={pending}
        />
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <TextField
          label="Libellé"
          placeholder="Ex. Devoir 2"
          maxLength={50}
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <TextField
          label="Poids dans la moyenne"
          type="number"
          inputMode="decimal"
          min={0.01}
          step={0.5}
          required
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <CheckboxChip
          label="Obligatoire pour publier la moyenne"
          checked={required}
          onChange={(e) => setRequired(e.target.checked)}
        />
        <p className="text-xs text-gray-500">
          Une moyenne de matière n'est publiée que si l'élève a au moins une note de chaque type
          marqué obligatoire.
        </p>
      </form>
    </Modal>
  );
}

function SettingsSkeleton() {
  return (
    <>
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <Skeleton width="40%" height={20} />
        <Skeleton height={40} style={{ marginTop: 20 }} />
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <Skeleton width="40%" height={20} />
        <Skeleton width="90%" height={14} style={{ marginTop: 14 }} />
        <Skeleton height={40} style={{ marginTop: 20 }} />
      </div>
    </>
  );
}
