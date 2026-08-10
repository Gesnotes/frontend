import { useState } from 'react';

import { errorMessage, schoolApi } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { PageContent, PageHeader } from '../../layouts/PageHeader';
import { Alert, Button, Card, SectionTitle, Skeleton, TextField, useToast } from '../../ui';

/**
 * Réglages propres à l'école — pour l'instant, le seul champ configurable est
 * le seuil de passage (par défaut 10). D'autres pourront s'ajouter ici plus
 * tard, sans changer la place de cet écran.
 */
export default function SettingsPage() {
  const settings = schoolApi.useSchoolSettings();

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Réglages propres à votre école" />
      <PageContent>
        <QueryBoundary query={settings} loading={<SettingsSkeleton />}>
          {(data) => <PassingGradeCard current={data.passingGrade} />}
        </QueryBoundary>
      </PageContent>
    </>
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
    <Card padded style={{ maxWidth: 480 }}>
      <SectionTitle>Seuil de passage</SectionTitle>
      <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
        <p className="t-body-md t-subtle" style={{ margin: 0, textTransform: 'none' }}>
          Moyenne à partir de laquelle un élève est considéré admis dans une matière. Par défaut 10.
        </p>

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-3)' }}>
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
    </Card>
  );
}

function SettingsSkeleton() {
  return (
    <Card padded style={{ maxWidth: 480 }}>
      <Skeleton width="40%" height={20} />
      <Skeleton width="90%" height={14} style={{ marginTop: 14 }} />
      <Skeleton height={40} style={{ marginTop: 20 }} />
    </Card>
  );
}
