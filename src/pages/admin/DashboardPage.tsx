import {
  AlertTriangle, ChevronDown, ChevronRight, ClipboardCheck, GraduationCap, Mail, NotebookPen,
  Phone, School, TrendingUp, type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { dashboardApi, type AdminDashboard, type ID, type RecentGrade } from '../../api';
import { useAuth } from '../../auth/auth-context';
import { QueryBoundary } from '../../components/QueryBoundary';
import { useTermContext } from '../../context/term-context';
import { formatCount, formatGrade, formatPercent, formatRelative, plural } from '../../lib/format';
import { personName } from '../../lib/text';
import { TermSelect } from '../../layouts/TermSelect';
import { InstallCard } from '../../pwa/InstallCard';
import { paths } from '../../routes/paths';
import {
  Button, Skeleton, StatCardIcon, gradeTone, toneClasses,
} from '../../ui';
import { ClassBulletinPanel } from './ClassBulletinPanel';

export default function DashboardPage() {
  const { displayName } = useAuth();
  const { termId, term } = useTermContext();
  const dashboard = dashboardApi.useDashboard(termId);
  const recent = dashboardApi.useRecentGrades(8);

  return (
    <QueryBoundary
      query={dashboard}
      loading={
        <>
          <DashHeader title="Tableau de bord" subtitle="Vue d'ensemble de l'établissement" />
          <div className="p-8">
            <StatsSkeleton />
          </div>
        </>
      }
    >
      {(data) => (
        <>
          <DashHeader
            title={`Bonjour, ${displayName}`}
            subtitle={term ? `${data.school.name} · ${term.label}` : data.school.name}
          />
          <div className="space-y-8 p-8">
            <InstallCard compact />
            <SupportCard />

            {isSetupIncomplete(data) ? (
              <OnboardingChecklist data={data} />
            ) : (
              <>
                <DashboardBody data={data} />

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-100 px-6 py-4">
                      <h2 className="text-base font-bold text-gray-900">Dernières notes saisies</h2>
                    </div>
                    <QueryBoundary query={recent} loading={<RowsSkeleton />}>
                      {(grades) => <RecentGrades grades={grades} />}
                    </QueryBoundary>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                      <h2 className="text-base font-bold text-gray-900">Moyennes par classe</h2>
                      <Link to={paths.admin.classes} className="text-sm font-semibold text-primary hover:underline">
                        Toutes les classes
                      </Link>
                    </div>
                    <div className="p-2">
                      <ClassAverages data={data} termId={termId} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </QueryBoundary>
  );
}

function DashHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 bg-white px-8 py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>
      <TermSelect />
    </div>
  );
}

/**
 * Contact rapide de l'équipe Gesnotes. Une école n'a souvent qu'une seule
 * personne pour la dépanner en cas de blocage (import raté, période
 * introuvable...) : mieux vaut que le moyen de la joindre soit visible dès
 * l'arrivée sur le tableau de bord plutôt qu'enterré dans un menu.
 */
function SupportCard() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#dde1ff] text-[#173bab]">
        <Phone size={20} aria-hidden="true" />
      </div>
      <div className="min-w-[220px] flex-1">
        <div className="font-semibold text-gray-900">Besoin d'aide ?</div>
        <div className="text-sm text-gray-500">L'équipe Gesnotes répond par email ou par téléphone.</div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <a href="mailto:contact@gesnotes.bj" className="inline-flex items-center gap-1.5 text-primary hover:underline">
          <Mail size={16} aria-hidden="true" /> contact@gesnotes.bj
        </a>
        <a href="tel:+2290160888668" className="inline-flex items-center gap-1.5 text-primary hover:underline">
          <Phone size={16} aria-hidden="true" /> +229 01 60 88 86 68
        </a>
      </div>
    </div>
  );
}

/**
 * Liste de tâches d'accueil (DESIGN.md §6) : remplace un tableau de bord
 * vide à la première connexion, plutôt que d'afficher des moyennes et des
 * effectifs à zéro qui n'apprennent rien à l'administration.
 *
 * Couvre aussi les matières et la période : sans elles, la saisie de notes
 * échoue silencieusement une fois les classes/enseignants/élèves en place —
 * mieux vaut le dire ici que laisser l'administration le découvrir plus tard,
 * bloquée, sans configuration à portée de main.
 */
function isSetupIncomplete({ effectifs, periode }: AdminDashboard): boolean {
  return (
    effectifs.classes === 0 ||
    effectifs.matieres === 0 ||
    effectifs.enseignants === 0 ||
    effectifs.eleves === 0 ||
    periode === null
  );
}

function OnboardingChecklist({ data }: { data: AdminDashboard }) {
  const { effectifs, periode } = data;
  const steps = [
    {
      done: effectifs.classes > 0,
      label: 'Ajouter vos classes, avec leur mode (notes ou présence)',
      cta: 'Commencer par les classes',
      to: paths.admin.classes,
    },
    {
      done: effectifs.matieres > 0,
      label: 'Ajouter vos matières',
      cta: 'Ajouter vos matières',
      to: paths.admin.subjects,
    },
    {
      done: effectifs.enseignants > 0,
      label: 'Inviter vos enseignants',
      cta: 'Inviter vos enseignants',
      to: paths.admin.teachers,
    },
    {
      done: effectifs.eleves > 0,
      label: 'Importer la liste de vos élèves',
      cta: 'Importer vos élèves',
      to: paths.admin.students,
    },
    {
      done: periode !== null,
      label: 'Ouvrir une période (trimestre ou semestre)',
      cta: 'Ouvrir une période',
      to: paths.admin.periods,
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done) ?? steps[0]!;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">Bienvenue, configurons votre école</h2>
      <p className="mt-1 mb-4 text-sm text-gray-500">{doneCount} sur {steps.length} terminé</p>

      <div className="mb-4 space-y-2">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.done ? 'bg-emerald-100 text-emerald-600' : 'border border-gray-300 text-transparent'
              }`}
            >
              {step.done ? '✓' : ''}
            </span>
            <span className={step.done ? 'text-gray-400 line-through' : 'text-gray-700'}>{step.label}</span>
          </div>
        ))}
      </div>

      <Link to={next.to}>
        <Button variant="primary">{next.cta}</Button>
      </Link>
    </div>
  );
}

function DashboardBody({ data }: { data: AdminDashboard }) {
  const { effectifs, activite, saisie, presence, creneaux, moyenneEcole } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardIcon
          icon={GraduationCap}
          tone="bg-blue-50 text-blue-600"
          label="Élèves inscrits"
          value={formatCount(effectifs.eleves)}
        />
        <StatCardIcon
          icon={School}
          tone="bg-violet-50 text-violet-600"
          label="Classes"
          value={formatCount(effectifs.classes)}
          hint={`${formatCount(effectifs.enseignants)} enseignants · ${formatCount(effectifs.matieres)} matières`}
        />
        <StatCardIcon
          icon={TrendingUp}
          tone="bg-[#dde1ff] text-[#173bab]"
          label="Moyenne de l'école"
          value={`${formatGrade(moyenneEcole)} / 20`}
          hint={data.periode ? data.periode.label : 'Sélectionnez une période'}
        />
        <StatCardIcon
          icon={NotebookPen}
          tone="bg-amber-50 text-amber-600"
          label="Notes saisies (7 j.)"
          value={formatCount(activite.notesDerniers7Jours)}
          hint={`${formatCount(activite.notesTotal)} au total sur la période`}
        />
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-gray-900">Actions prioritaires</h2>
        </div>

        <div className="space-y-3">
          <PresenceAlert presence={presence} />
          <CreneauxAlert creneaux={creneaux} />
          {saisie ? <GradingAlert saisie={saisie} /> : null}
        </div>
      </div>
    </div>
  );
}

/** Une ligne d'alerte du bloc « Actions prioritaires », couleur pilotée par la sévérité. */
function AlertRow({
  icon: Icon, tone, title, description, cta,
}: {
  icon: LucideIcon;
  tone: 'warning' | 'success';
  title: string;
  description: string;
  cta?: { label: string; to: string };
}) {
  const toneStyles = tone === 'success'
    ? { border: 'border-emerald-200', bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-700' }
    : { border: 'border-amber-200', bg: 'bg-amber-50', icon: 'text-amber-600', text: 'text-amber-700' };

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-4 ${toneStyles.border} ${toneStyles.bg}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${toneStyles.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold ${toneStyles.text}`}>{title}</div>
        <div className="mt-0.5 text-sm text-gray-600">{description}</div>
      </div>
      {cta ? (
        <Link
          to={cta.to}
          className={`shrink-0 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold ${toneStyles.text} hover:bg-white/60`}
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}

/** Présence du jour, école entière — indépendante de la période sélectionnée. */
function PresenceAlert({ presence }: { presence: AdminDashboard['presence'] }) {
  if (presence.classesTotal === 0) return null;

  const taux = Math.round((presence.classesAvecAppel / presence.classesTotal) * 100);
  const ok = taux >= 85;

  return (
    <AlertRow
      icon={ok ? ClipboardCheck : AlertTriangle}
      tone={ok ? 'success' : 'warning'}
      title={`Présence du jour : ${formatPercent(taux)}`}
      description={
        presence.classesSansAppel.length > 0
          ? `Aucun appel : ${presence.classesSansAppel.join(', ')}.`
          : `${formatCount(presence.classesAvecAppel)} ${plural(presence.classesAvecAppel, 'classe')} sur ${formatCount(presence.classesTotal)} ${plural(presence.classesAvecAppel, 'a fait', 'ont fait')} l'appel aujourd'hui.`
      }
      cta={!ok ? { label: 'Voir les classes', to: paths.admin.classes } : undefined}
    />
  );
}

/** Appel du jour, classes mode `notes`, par créneau — chaque enseignant fait le sien. */
function CreneauxAlert({ creneaux }: { creneaux: AdminDashboard['creneaux'] }) {
  if (creneaux.creneauxTotal === 0) return null;

  const taux = Math.round((creneaux.creneauxCouverts / creneaux.creneauxTotal) * 100);
  const ok = taux >= 85;

  return (
    <AlertRow
      icon={ok ? ClipboardCheck : AlertTriangle}
      tone={ok ? 'success' : 'warning'}
      title={`Appel par créneau : ${formatPercent(taux)}`}
      description={
        creneaux.creneauxNonCouverts.length > 0
          ? creneaux.creneauxNonCouverts
              .map((slot) => `${slot.className} · ${slot.subjectName} ${slot.startTime}`)
              .join(', ')
          : `${formatCount(creneaux.creneauxCouverts)} ${plural(creneaux.creneauxCouverts, 'créneau')} sur ${formatCount(creneaux.creneauxTotal)} couverts aujourd'hui.`
      }
    />
  );
}

/** Avancement de la saisie : le chiffre qui dit quelles classes relancer. */
function GradingAlert({ saisie }: { saisie: NonNullable<AdminDashboard['saisie']> }) {
  if (saisie.elevesTotal === 0) return null;
  const ok = saisie.taux !== null && saisie.taux >= 85;

  return (
    <AlertRow
      icon={ok ? ClipboardCheck : AlertTriangle}
      tone={ok ? 'success' : 'warning'}
      title={`Avancement de la saisie : ${formatPercent(saisie.taux)}`}
      description={
        saisie.classesSansAucuneNote.length > 0
          ? `Aucune note : ${saisie.classesSansAucuneNote.join(', ')}.`
          : `${formatCount(saisie.elevesEvalues)} élèves évalués sur ${formatCount(saisie.elevesTotal)}.`
      }
      cta={!ok ? { label: 'Saisir des notes', to: paths.admin.gradeEntry } : undefined}
    />
  );
}

function RecentGrades({ grades }: { grades: RecentGrade[] }) {
  if (grades.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-gray-500">
        Aucune note saisie. Les notes apparaîtront ici dès que les enseignants commenceront la saisie.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {grades.map((grade) => (
        <div key={grade.id} className="flex items-center gap-3 px-6 py-3">
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses(gradeTone(grade.value, grade.maxValue))}`}>
            {grade.value} / {grade.maxValue}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">
              {grade.matiere.name} · {grade.eleve.classe.name}
            </div>
            <div className="truncate text-xs text-gray-500">
              {personName(grade.professeur, 'Enseignant retiré')} · {grade.type.label}
            </div>
          </div>
          <span className="shrink-0 text-xs text-gray-400">{formatRelative(grade.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Moyennes par classe, chaque ligne dépliable sur son bulletin.
 *
 * L'administration voulait voir les matières, les notes et la moyenne d'une
 * classe sans quitter le tableau de bord : c'est la question qu'on se pose en
 * l'ouvrant, et il fallait deux navigations pour y répondre. Le bulletin
 * complet reste accessible d'un lien, pour le détail par catégorie.
 */
function ClassAverages({ data, termId }: { data: AdminDashboard; termId: ID | undefined }) {
  // Une seule classe ouverte à la fois : le bulletin est large, deux tableaux
  // dépliés côte à côte rendraient la carte illisible.
  const [openId, setOpenId] = useState<ID | null>(null);

  if (data.classes.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-gray-500">
        Sélectionnez une période pour laquelle des notes ont été saisies.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {data.classes.map((row) => {
        const open = openId === row.classId;
        return (
          <div key={row.classId}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50"
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : row.classId)}
            >
              {open ? (
                <ChevronDown size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
              ) : (
                <ChevronRight size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
              )}
              <span className="flex-1 truncate text-sm font-semibold text-gray-900">{row.className}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${toneClasses(gradeTone(row.average))}`}>
                {formatGrade(row.average)}
              </span>
            </button>

            {open ? (
              <div className="px-3 pb-3">
                <ClassBulletinPanel classId={row.classId} termId={termId} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 p-8 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <Skeleton width="60%" height={12} />
          <Skeleton width="45%" height={28} style={{ marginTop: 14 }} />
        </div>
      ))}
    </div>
  );
}

function RowsSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} height={40} />
      ))}
    </div>
  );
}
