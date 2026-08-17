import { School } from 'lucide-react';
import { useState } from 'react';

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
              <SchoolCard name={data.name} />
              <PassingGradeCard current={data.passingGrade} />
            </>
          )}
        </QueryBoundary>
      </div>
    </>
  );
}

function SchoolCard({ name }: { name: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#dde1ff] text-[#173bab]">
          <School size={20} aria-hidden="true" />
        </div>
        <h2 className="text-base font-bold text-gray-900">Établissement</h2>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nom de l'école</span>
        <input
          type="text"
          value={name}
          readOnly
          className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
        />
      </label>
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
