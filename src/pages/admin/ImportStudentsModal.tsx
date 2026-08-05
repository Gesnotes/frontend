import { useState } from 'react';

import { errorMessage, studentsApi, type ImportReport, type ImportRow } from '../../api';
import { downloadBlob } from '../../lib/download';
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
/**
 * Modèle à remplir.
 *
 * Beaucoup plus sûr qu'une consigne écrite : le fichier porte déjà les bons
 * titres de colonnes, le bon séparateur et le bon encodage. Le secrétariat
 * remplace les deux lignes d'exemple et n'a rien à comprendre au format.
 */
function downloadExample() {
  const content =
    '﻿Nom;Prénom;Classe;Date de naissance\r\n' +
    'SAGBO;Adjovi;6e A;12/03/2012\r\n' +
    'ZINSOU;Kofi;6e A;\r\n';

  downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8' }), 'modele-eleves.csv');
}

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
      title="Ajouter plusieurs élèves à partir d'un fichier"
      subtitle="Vous choisissez le fichier, nous vous montrons ce qui sera ajouté, et vous validez."
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
          Tout en haut de votre fichier, la première ligne donne le titre de chaque colonne :{' '}
          <strong>Nom</strong>, <strong>Prénom</strong>, <strong>Classe</strong>, et{' '}
          <strong>Date de naissance</strong> si vous l'avez. Ensuite, un élève par ligne.
          <br />
          Les classes doivent déjà exister dans Gesnotes : celles du fichier ne sont pas créées
          toutes seules. Si une classe n'est pas reconnue, les élèves concernés sont simplement
          laissés de côté, et vous verrez lesquels.
        </Alert>

        <div>
          <Button size="sm" variant="secondary" onClick={downloadExample}>
            Télécharger un fichier d'exemple
          </Button>
          <p className="t-label-sm t-subtle" style={{ textTransform: 'none', marginTop: 'var(--space-2)' }}>
            Ouvrez-le dans Excel, remplacez les lignes par vos élèves, puis enregistrez-le au
            format CSV.
          </p>
        </div>

        <label className="ui-field">
          <span className="ui-field__label">Votre fichier</span>
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
            {filename
              ? `Fichier examiné : ${filename}`
              : "Rien n'est enregistré tant que vous n'avez pas validé."}
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
          {formatCount(counts.create)} {plural(counts.create, 'élève')} à inscrire
        </Chip>
        {counts.duplicate > 0 ? (
          <Chip tone="warning">{formatCount(counts.duplicate)} déjà inscrits</Chip>
        ) : null}
        {counts.error > 0 ? (
          <Chip tone="danger">{formatCount(counts.error)} à corriger</Chip>
        ) : null}
      </div>

      {counts.create === 0 ? (
        <Alert tone="danger">
          Aucun élève ne peut être inscrit pour le moment. Corrigez votre fichier en suivant les
          explications ci-dessous, puis choisissez-le à nouveau.
        </Alert>
      ) : null}

      {problems.length > 0 ? (
        <>
          <p className="t-label-sm t-muted">Élèves qui ne seront pas inscrits</p>
          {/* Toutes les lignes fautives d'un coup : corriger son fichier une
              faute à la fois est le meilleur moyen d'abandonner. */}
          <div className="dash-bulletin__scroll" style={{ maxHeight: 260 }}>
            <table className="ui-table">
              <caption className="sr-only">Élèves laissés de côté par l'import</caption>
              <thead>
                <tr>
                  <th scope="col">Ligne du fichier</th>
                  <th scope="col">Élève</th>
                  <th scope="col">Classe</th>
                  <th scope="col">Pourquoi</th>
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
                        {row.reason ??
                          (row.status === 'duplicate'
                            ? 'Cet élève est déjà inscrit.'
                            : 'Ligne incomplète.')}
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
