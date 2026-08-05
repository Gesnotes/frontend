import { useState } from 'react';

import { errorMessage, studentsApi, type ImportReport, type ImportRow } from '../../api';
import { formatCount, plural } from '../../lib/format';
import { Alert, Button, Chip, Modal } from '../../ui';

/**
 * Import d'une liste d'élèves, en deux temps.
 *
 * Le fichier est d'abord analysé sans rien écrire : on montre le rapport ligne
 * à ligne, et l'inscription n'a lieu qu'après validation explicite. Une
 * inscription de masse qu'on ne peut pas relire avant de valider est une
 * inscription qu'on passera la journée à défaire.
 *
 * Le fichier est lu dans le navigateur et son texte posté en JSON : pas de
 * dépendance d'upload à embarquer pour quelques dizaines de kilo-octets.
 */
export function ImportStudentsModal({
  open, onClose, onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (created: number) => void;
}) {
  const [filename, setFilename] = useState('');
  const [csv, setCsv] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFilename('');
    setCsv('');
    setReport(null);
    setError(null);
  }

  async function analyse(file: File) {
    reset();
    setFilename(file.name);
    setBusy(true);
    try {
      const text = await file.text();
      setCsv(text);
      setReport(await studentsApi.importStudents(text, true));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!report || report.counts.create === 0) return;
    setBusy(true);
    setError(null);
    try {
      const applied = await studentsApi.importStudents(csv, false);
      onImported(applied.counts.create);
      reset();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      width={640}
      title="Importer une liste d'élèves"
      subtitle="Fichier CSV — celui qu'Excel produit avec « Enregistrer sous » convient."
      footer={
        <>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Annuler
          </Button>
          <Button
            loading={busy}
            disabled={!report || report.counts.create === 0}
            onClick={() => void confirm()}
          >
            {report && report.counts.create > 0
              ? `Inscrire ${formatCount(report.counts.create)} ${plural(report.counts.create, 'élève')}`
              : 'Inscrire'}
          </Button>
        </>
      }
    >
      <div className="page-stack" style={{ gap: 'var(--space-4)' }}>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Alert tone="info">
          Colonnes attendues : <strong>Nom</strong>, <strong>Prénom</strong>,{' '}
          <strong>Classe</strong>, et <strong>Date de naissance</strong> (facultative). Les classes
          doivent exister au préalable — aucune n'est créée automatiquement, une classe inconnue
          étant presque toujours une faute de frappe.
        </Alert>

        <label className="ui-field">
          <span className="ui-field__label">Fichier</span>
          <input
            className="ui-input"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void analyse(file);
            }}
          />
          <span className="ui-field__hint">
            {filename ? `Fichier analysé : ${filename}` : 'Rien n’est enregistré avant validation.'}
          </span>
        </label>

        {report ? <ImportSummary report={report} /> : null}
      </div>
    </Modal>
  );
}

function ImportSummary({ report }: { report: ImportReport }) {
  const { counts, rows } = report;
  const problems = rows.filter((row) => row.status !== 'create');

  return (
    <div className="page-stack" style={{ gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Chip tone={counts.create > 0 ? 'success' : 'neutral'}>
          {formatCount(counts.create)} à inscrire
        </Chip>
        {counts.duplicate > 0 ? (
          <Chip tone="warning">{formatCount(counts.duplicate)} déjà inscrits</Chip>
        ) : null}
        {counts.error > 0 ? (
          <Chip tone="danger">{formatCount(counts.error)} en erreur</Chip>
        ) : null}
      </div>

      {counts.create === 0 ? (
        <Alert tone="danger">
          Aucune ligne exploitable. Corrigez le fichier d'après les motifs ci-dessous, puis
          resélectionnez-le.
        </Alert>
      ) : null}

      {problems.length > 0 ? (
        <>
          <p className="t-label-sm t-muted">Lignes ignorées</p>
          {/* Toutes les lignes fautives d'un coup : corriger son fichier une
              faute à la fois est le meilleur moyen d'abandonner. */}
          <div className="dash-bulletin__scroll" style={{ maxHeight: 260 }}>
            <table className="ui-table">
              <caption className="sr-only">Lignes ignorées par l'import</caption>
              <thead>
                <tr>
                  <th scope="col">Ligne</th>
                  <th scope="col">Élève</th>
                  <th scope="col">Classe</th>
                  <th scope="col">Motif</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((row) => (
                  <tr key={row.line}>
                    <td>{row.line}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{describe(row)}</td>
                    <td>{row.className || '—'}</td>
                    <td>
                      <Chip tone={row.status === 'duplicate' ? 'warning' : 'danger'}>
                        {row.reason ?? (row.status === 'duplicate' ? 'Doublon' : 'Erreur')}
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function describe(row: ImportRow): string {
  const name = `${row.lastName} ${row.firstName}`.trim();
  return name || '(nom manquant)';
}
