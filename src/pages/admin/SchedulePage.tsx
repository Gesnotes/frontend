import { useMemo, useState } from 'react';

import { classesApi, type ID } from '../../api';
import { QueryBoundary } from '../../components/QueryBoundary';
import { ClassSchedulePanel } from './ClassSchedulePanel';

/**
 * Emploi du temps, accessible depuis le menu principal — plus besoin de
 * passer par la fiche d'une classe pour construire son planning.
 *
 * Le sélecteur de classe remplace le filtre classe/enseignant de la
 * maquette : nos créneaux appartiennent à une classe (pas à un enseignant
 * affiché sur plusieurs classes à la fois), donc une classe à la fois reste
 * la bonne granularité. Réutilise `ClassSchedulePanel` tel quel — même
 * glisser-déposer, même détection de chevauchement, qu'on y accède depuis
 * ici ou depuis l'onglet « Emploi du temps » de la fiche classe.
 */
export default function SchedulePage() {
  const classes = classesApi.useClasses();
  const [classId, setClassId] = useState<ID | ''>('');

  const scheduledClasses = useMemo(
    () => (classes.data ?? []).filter((c) => c.mode === 'notes'),
    [classes.data],
  );

  // Dérivé plutôt que synchronisé par effet : aucune classe choisie pour
  // l'instant ? on retombe sur la première disponible, sans aller-retour de
  // rendu.
  const selectedClassId: ID | '' = classId === '' ? (scheduledClasses[0]?.id ?? '') : classId;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-white px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emploi du temps</h1>
          <p className="mt-1 text-sm text-gray-500">Planning hebdomadaire d'une classe</p>
        </div>
        {scheduledClasses.length > 0 ? (
          <label className="flex flex-col gap-1.5">
            <span className="sr-only">Classe</span>
            <select
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={selectedClassId}
              onChange={(e) => setClassId(Number(e.target.value))}
            >
              {scheduledClasses.map((klass) => (
                <option key={klass.id} value={klass.id}>{klass.name} · {klass.level}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="p-8">
        <QueryBoundary query={classes} loading={null}>
          {() =>
            scheduledClasses.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <p className="font-semibold text-gray-900">Aucune classe en mode notes</p>
                <p className="mt-1 text-sm text-gray-500">
                  L'emploi du temps ne concerne que les classes en mode « notes » — la présence
                  (maternelle, garderie) se prend jour par jour, sans horaire par matière.
                </p>
              </div>
            ) : typeof selectedClassId === 'number' ? (
              <ClassSchedulePanel classId={selectedClassId} />
            ) : null
          }
        </QueryBoundary>
      </div>
    </>
  );
}
