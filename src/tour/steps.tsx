import {
  Archive, BookOpen, Bell, CalendarClock, CalendarDays, CalendarOff, CalendarRange, ClipboardCheck,
  Contact, GraduationCap, History, Home, LayoutDashboard, Link2, Megaphone, NotebookPen, School,
  ScrollText, Settings, Sparkles, Type,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Step } from 'react-joyride';
import type { NavigateFunction } from 'react-router-dom';

import { paths } from '../routes/paths';
import { TourStepCard } from './TourStepCard';

/**
 * Attend qu'un sélecteur apparaisse dans le DOM, jusqu'à `timeoutMs`.
 *
 * `targetWaitTimeout` (l'option native de react-joyride) ne suffit pas ici :
 * elle ne couvre que l'attente interne de la librairie, pas un changement de
 * page ou d'état déclenché depuis `before` — vérifié en pratique, le
 * `before` d'une étape se résout en quelques millisecondes après
 * `navigate()` ou un clic, bien avant que le nouveau rendu n'ait eu le temps
 * de s'afficher, ce que react-joyride ne rattrape pas tout seul.
 */
async function waitForTarget(selector: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (document.querySelector(selector)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function clickAll(selectors: string[]): Promise<void> {
  for (const selector of selectors) {
    await waitForTarget(selector);
    (document.querySelector(selector) as HTMLElement | null)?.click();
  }
}

type StepConfig = {
  /** Sélecteur de l'élément mis en évidence par cette étape. */
  target: string;
  content: ReactNode;
  /** Page à ouvrir avant cette étape (mêmes onglet/état sinon inchangés). */
  path?: string;
  /** Cliqués avant la navigation — typiquement fermer une modale déjà ouverte. */
  preClicks?: string[];
  /** Cliqués après la navigation — ouvrir une modale, changer d'onglet. */
  postClicks?: string[];
};

/**
 * Une étape du tour : ferme/ouvre ce qu'il faut (modale, onglet), navigue si
 * besoin, puis attend que sa cible soit bien apparue avant de laisser
 * react-joyride l'afficher.
 */
function step(navigate: NavigateFunction, { target, content, path, preClicks, postClicks }: StepConfig): Step {
  return {
    target,
    content,
    before: async () => {
      if (preClicks) await clickAll(preClicks);
      if (path) navigate(path);
      if (postClicks) await clickAll(postClicks);
      await waitForTarget(target);
    },
  };
}

/** Ferme toute modale ouverte (bouton « Fermer » de `src/ui/Modal.tsx`). */
const CLOSE_MODAL = 'button[aria-label="Fermer"]';

function intro(content: ReactNode): Step {
  return { target: 'body', placement: 'center', content };
}

export function adminSteps(navigate: NavigateFunction): Step[] {
  return [
    intro(
      <TourStepCard icon={Sparkles} title="Bienvenue sur Gesnotes !" centered>
        Ce tour parcourt tous les écrans de l'espace administration, dans l'ordre où ils servent à
        monter une école — vous pourrez le revoir à tout moment depuis le tableau de bord.
      </TourStepCard>,
    ),
    step(navigate, {
      target: '[data-tour="admin-nav-dashboard"]',
      path: paths.admin.dashboard,
      content: (
        <TourStepCard icon={LayoutDashboard} title="Tableau de bord">
          Vue d'ensemble de l'établissement : moyennes, dernières notes saisies, présence du jour.
        </TourStepCard>
      ),
    }),

    // Années scolaires — facultatives, mais à créer en premier : Préparer la
    // rentrée suivante et le calcul de moyenne annuelle en dépendent.
    step(navigate, {
      target: '[data-tour="admin-open-annee"]',
      path: paths.admin.schoolYears,
      content: (
        <TourStepCard icon={CalendarDays} title="Années scolaires">
          Créez d'abord l'année scolaire : elle regroupe classes et périodes, et permet de préparer
          une rentrée à l'avance sans toucher à l'année en cours. Cliquez ici pour en ouvrir une.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-annee-libelle"]',
      postClicks: ['[data-tour="admin-open-annee"]'],
      content: (
        <TourStepCard icon={Type} title="Libellé">
          Le nom affiché partout où l'année est choisie — par exemple « 2026-2027 ».
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-annee-debut"]',
      content: (
        <TourStepCard icon={CalendarRange} title="Début et fin">
          Facultatives, mais c'est ce qui permet à Gesnotes de détecter automatiquement quelle année
          est « en cours ». Deux années ne peuvent pas se chevaucher.
        </TourStepCard>
      ),
    }),

    // Périodes — obligatoires : rien ne se calcule sans elles.
    step(navigate, {
      target: '[data-tour="admin-add-periode"]',
      preClicks: [CLOSE_MODAL],
      postClicks: ['[data-tour="admin-tab-periodes"]'],
      content: (
        <TourStepCard icon={CalendarRange} title="Périodes">
          Les trimestres ou semestres : toute moyenne, tout bulletin est calculé par période. Sans
          période, l'application ne peut afficher aucun résultat. Cliquez ici pour en créer une.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-periode-libelle"]',
      postClicks: ['[data-tour="admin-add-periode"]'],
      content: (
        <TourStepCard icon={Type} title="Libellé">
          Le nom de la période — par exemple « Trimestre 1 ».
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-periode-debut"]',
      content: (
        <TourStepCard icon={CalendarRange} title="Début et fin">
          Comme pour l'année scolaire : sans ces deux dates, la période ne pourra jamais être
          détectée comme « en cours ». Deux périodes ne peuvent pas se chevaucher.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-periode-annee"]',
      content: (
        <TourStepCard icon={Link2} title="Année scolaire">
          Rattache la période à l'année créée juste avant. Facultatif, mais nécessaire pour que la
          moyenne annuelle de l'élève puisse être calculée.
        </TourStepCard>
      ),
    }),

    step(navigate, {
      target: '[data-tour="admin-add-classe"]',
      preClicks: [CLOSE_MODAL],
      path: paths.admin.classes,
      content: (
        <TourStepCard icon={School} title="Classes">
          Créez ensuite vos classes, en choisissant leur mode : « notes » (matières et évaluations)
          ou « présence » (maternelle, garderie).
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-add-matiere"]',
      path: paths.admin.subjects,
      content: (
        <TourStepCard icon={BookOpen} title="Matières">
          Les matières enseignées, avec leur coefficient — nécessaires pour toute classe en mode «
          notes ».
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-add-enseignant"]',
      path: paths.admin.teachers,
      content: (
        <TourStepCard icon={Contact} title="Enseignants">
          Invitez vos enseignants ici, puis affectez-les à leurs classes et matières.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-add-eleve"]',
      path: paths.admin.students,
      content: (
        <TourStepCard icon={GraduationCap} title="Élèves">
          Ajoutez vos élèves ici, un par un ou en une fois depuis un tableur. C'est aussi depuis la
          fiche de chaque élève que vous associez ses parents, pour qu'ils reçoivent notes et
          annonces.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-nav-schedule"]',
      path: paths.admin.schedule,
      content: (
        <TourStepCard icon={CalendarClock} title="Emploi du temps">
          L'emploi du temps de chaque classe : les créneaux dont vos enseignants ont besoin pour
          faire l'appel et saisir les notes.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-nav-grade-entry"]',
      path: paths.admin.gradeEntry,
      content: (
        <TourStepCard icon={NotebookPen} title="Saisie des notes">
          Vous pouvez aussi saisir des notes vous-même depuis ici, exactement comme un enseignant.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-add-annonce"]',
      path: paths.admin.annonces,
      content: (
        <TourStepCard icon={Megaphone} title="Annonces & incidents">
          Envoyez une annonce, une convocation ou signalez un incident aux parents concernés.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-nav-holidays"]',
      path: paths.admin.holidays,
      content: (
        <TourStepCard icon={CalendarOff} title="Calendrier scolaire">
          Le calendrier des jours fériés et de congé de l'établissement.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-nav-archives"]',
      path: paths.admin.archives,
      content: (
        <TourStepCard icon={Archive} title="Archives">
          Tout ce qui a été archivé (classes, élèves, périodes…) reste ici, restaurable à tout
          moment.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-nav-audit-log"]',
      path: paths.admin.auditLog,
      content: (
        <TourStepCard icon={ScrollText} title="Journal d'audit">
          Le journal des actions sensibles : qui a modifié une note, déplacé un élève, supprimé un
          compte…
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="admin-nav-settings"]',
      path: paths.admin.settings,
      content: (
        <TourStepCard icon={Settings} title="Réglages">
          Les réglages de l'école : seuil de passage, types de note, modèle de bulletin…
        </TourStepCard>
      ),
    }),
  ];
}

export function teacherSteps(navigate: NavigateFunction): Step[] {
  return [
    intro(
      <TourStepCard icon={Sparkles} title="Bienvenue !" centered>
        Ce tour parcourt tous les écrans de votre espace — vous pourrez le revoir à tout moment
        depuis l'accueil.
      </TourStepCard>,
    ),
    step(navigate, {
      target: '[data-tour="teacher-home"]',
      path: paths.teacher.dashboard,
      content: (
        <TourStepCard icon={LayoutDashboard} title="Accueil">
          Vos cours du jour et l'avancement de votre saisie de notes.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="teacher-grade-entry"]',
      path: paths.teacher.gradeEntry,
      content: (
        <TourStepCard icon={NotebookPen} title="Saisie">
          Saisissez les notes de vos classes ici, matière par matière.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="teacher-attendance"]',
      path: paths.teacher.attendance,
      content: (
        <TourStepCard icon={ClipboardCheck} title="Présence">
          Faites l'appel pour chacun de vos cours du jour.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="teacher-annonces"]',
      path: paths.teacher.annonces,
      content: (
        <TourStepCard icon={Megaphone} title="Annonces">
          Envoyez une annonce, une convocation ou signalez un incident aux parents de vos élèves.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="teacher-schedule"]',
      path: paths.teacher.schedule,
      content: (
        <TourStepCard icon={CalendarClock} title="Emploi du temps">
          Votre emploi du temps de la semaine.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="teacher-history"]',
      path: paths.teacher.history,
      content: (
        <TourStepCard icon={History} title="Historique">
          Retrouvez ici l'historique de vos saisies récentes.
        </TourStepCard>
      ),
    }),
  ];
}

export function parentSteps(navigate: NavigateFunction): Step[] {
  return [
    intro(
      <TourStepCard icon={Sparkles} title="Bienvenue !" centered>
        Ce tour parcourt tous les écrans pour suivre la scolarité de votre enfant — vous pourrez le
        revoir à tout moment depuis l'accueil.
      </TourStepCard>,
    ),
    step(navigate, {
      target: '[data-tour="parent-home"]',
      path: paths.parent.home,
      content: (
        <TourStepCard icon={Home} title="Accueil">
          Un résumé de la scolarité de votre enfant et les dernières annonces non lues.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="parent-scolarite"]',
      path: paths.parent.scolarite,
      content: (
        <TourStepCard icon={BookOpen} title="Scolarité">
          Le bulletin et les moyennes de votre enfant, période par période.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="parent-suivi-parental"]',
      path: paths.parent.suiviParental,
      content: (
        <TourStepCard icon={ClipboardCheck} title="Suivi parental">
          Un suivi au quotidien : présences, retards et absences.
        </TourStepCard>
      ),
    }),
    step(navigate, {
      target: '[data-tour="parent-notifications"]',
      path: paths.parent.notifications,
      content: (
        <TourStepCard icon={Bell} title="Alertes">
          Les annonces, convocations et incidents envoyés par l'école apparaissent ici.
        </TourStepCard>
      ),
    }),
  ];
}
