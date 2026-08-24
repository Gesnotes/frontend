import { FileText, School, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import { errorMessage, schoolApi } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { Alert, Button, Skeleton, TextField, useToast } from '../../ui';

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
  const [values, setValues] = useState(initial);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Même logique de resynchronisation que PassingGradeCard : ne reprend le
  // serveur que tant que l'utilisateur n'a pas commencé à modifier le formulaire.
  const [syncedInitial, setSyncedInitial] = useState(initial);
  if (
    !edited &&
    (syncedInitial.email !== initial.email || syncedInitial.phone !== initial.phone || syncedInitial.address !== initial.address)
  ) {
    setSyncedInitial(initial);
    setValues(initial);
  }

  const dirty =
    values.email.trim() !== initial.email ||
    values.phone.trim() !== initial.phone ||
    values.address.trim() !== initial.address;

  function field(key: keyof typeof values) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      setEdited(true);
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
      setValues({ email: saved.email ?? '', phone: saved.phone ?? '', address: saved.address ?? '' });
      setEdited(false);
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
  const [value, setValue] = useState(String(current));
  // Distinct de `dirty` (qui compare juste value à current) : sert à ne
  // resynchroniser automatiquement que tant que l'utilisateur n'a pas
  // commencé à taper, pour ne jamais écraser une saisie en cours.
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Resynchronise avec le serveur si `current` change pendant que la page
   * reste ouverte (ex. refetch après une coupure réseau) — tant que
   * l'utilisateur n'a pas touché au champ, sans quoi un enregistrement
   * écraserait silencieusement une valeur plus récente qu'un autre admin
   * aurait entre-temps enregistrée. Ajustement pendant le rendu (pas un
   * effet) : le même style que `EvaluationSaisie` pour repartir d'un état
   * neuf quand une prop externe change.
   */
  const [syncedCurrent, setSyncedCurrent] = useState(current);
  if (current !== syncedCurrent && !edited) {
    setSyncedCurrent(current);
    setValue(String(current));
  }

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
      setValue(String(saved.passingGrade));
      setEdited(false);
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
          onChange={(e) => {
            setValue(e.target.value);
            setEdited(true);
          }}
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
