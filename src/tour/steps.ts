import type { Step } from 'react-joyride';
import type { NavigateFunction } from 'react-router-dom';

import { paths } from '../routes/paths';

/**
 * Un pas d'intro centré, sans cible réelle — convention react-joyride pour
 * ouvrir un tutoriel avant de pointer sur la première vraie zone de l'écran.
 */
function intro(content: string): Step {
  return { target: 'body', placement: 'center', content };
}

/**
 * Attend qu'un sélecteur apparaisse dans le DOM, jusqu'à `timeoutMs`.
 *
 * `targetWaitTimeout` (l'option native de react-joyride) ne suffit pas ici :
 * elle ne couvre que l'attente interne de la librairie, pas un changement de
 * page déclenché depuis `before` — vérifié en pratique, le `before` d'une
 * étape se résout en quelques millisecondes après `navigate()`, bien avant
 * que la nouvelle page (et sa propre requête de données) n'ait eu le temps
 * de s'afficher, ce que react-joyride ne rattrape pas tout seul.
 */
async function waitForTarget(selector: string, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (document.querySelector(selector)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Une étape qui change d'écran : navigue vers `path`, puis attend que sa
 * propre cible soit bien apparue avant de laisser react-joyride l'afficher.
 */
function step(target: string, content: string, navigate: NavigateFunction, path: string): Step {
  return {
    target,
    content,
    before: async () => {
      navigate(path);
      await waitForTarget(target);
    },
  };
}

/**
 * Parcourt tous les onglets de l'espace admin dans l'ordre où ils servent
 * réellement à monter une école : une période avant tout (sans elle, la
 * saisie est bloquée), puis classes → matières → enseignants → élèves (dont
 * les parents, associés depuis la fiche de chaque élève), puis les écrans
 * du quotidien. Chaque étape pointe sur le bouton « Ajouter » de la page
 * quand il y en a un, sinon sur l'onglet lui-même.
 */
export function adminSteps(navigate: NavigateFunction): Step[] {
  return [
    intro(
      "Bienvenue sur Gesnotes ! Ce tour parcourt tous les écrans de l'espace administration, dans l'ordre où ils servent à monter une école — vous pourrez le revoir à tout moment depuis le tableau de bord.",
    ),
    step(
      '[data-tour="admin-nav-dashboard"]',
      "Le tableau de bord : vue d'ensemble de l'établissement, moyennes, dernières notes saisies.",
      navigate,
      paths.admin.dashboard,
    ),
    step(
      '[data-tour="admin-add-periode"]',
      "Ouvrez d'abord une période (trimestre ou semestre) : sans période active, la saisie des notes reste bloquée pour tout le monde.",
      navigate,
      `${paths.admin.schoolYears}?tab=periods`,
    ),
    step(
      '[data-tour="admin-add-classe"]',
      'Créez ensuite vos classes, en choisissant leur mode : « notes » (matières et évaluations) ou « présence » (maternelle, garderie).',
      navigate,
      paths.admin.classes,
    ),
    step(
      '[data-tour="admin-add-matiere"]',
      'Les matières enseignées, avec leur coefficient — nécessaires pour toute classe en mode « notes ».',
      navigate,
      paths.admin.subjects,
    ),
    step(
      '[data-tour="admin-add-enseignant"]',
      'Invitez vos enseignants ici, puis affectez-les à leurs classes et matières.',
      navigate,
      paths.admin.teachers,
    ),
    step(
      '[data-tour="admin-add-eleve"]',
      "Ajoutez vos élèves ici, un par un ou en une fois depuis un tableur. C'est aussi depuis la fiche de chaque élève que vous associez ses parents, pour qu'ils reçoivent notes et annonces.",
      navigate,
      paths.admin.students,
    ),
    step(
      '[data-tour="admin-nav-schedule"]',
      "L'emploi du temps de chaque classe : les créneaux dont vos enseignants ont besoin pour faire l'appel et saisir les notes.",
      navigate,
      paths.admin.schedule,
    ),
    step(
      '[data-tour="admin-nav-grade-entry"]',
      'Vous pouvez aussi saisir des notes vous-même depuis ici, exactement comme un enseignant.',
      navigate,
      paths.admin.gradeEntry,
    ),
    step(
      '[data-tour="admin-add-annonce"]',
      'Envoyez une annonce, une convocation ou signalez un incident aux parents concernés.',
      navigate,
      paths.admin.annonces,
    ),
    step(
      '[data-tour="admin-nav-holidays"]',
      "Le calendrier des jours fériés et de congé de l'établissement.",
      navigate,
      paths.admin.holidays,
    ),
    step(
      '[data-tour="admin-nav-archives"]',
      'Tout ce qui a été archivé (classes, élèves, périodes…) reste ici, restaurable à tout moment.',
      navigate,
      paths.admin.archives,
    ),
    step(
      '[data-tour="admin-nav-audit-log"]',
      "Le journal des actions sensibles : qui a modifié une note, déplacé un élève, supprimé un compte…",
      navigate,
      paths.admin.auditLog,
    ),
    step(
      '[data-tour="admin-nav-settings"]',
      "Les réglages de l'école : seuil de passage, types de note, modèle de bulletin…",
      navigate,
      paths.admin.settings,
    ),
  ];
}

export function teacherSteps(navigate: NavigateFunction): Step[] {
  return [
    intro(
      "Bienvenue ! Ce tour parcourt tous les écrans de votre espace — vous pourrez le revoir à tout moment depuis l'accueil.",
    ),
    step(
      '[data-tour="teacher-home"]',
      "L'accueil : vos cours du jour et l'avancement de votre saisie de notes.",
      navigate,
      paths.teacher.dashboard,
    ),
    step(
      '[data-tour="teacher-grade-entry"]',
      'Saisissez les notes de vos classes ici, matière par matière.',
      navigate,
      paths.teacher.gradeEntry,
    ),
    step(
      '[data-tour="teacher-attendance"]',
      "Faites l'appel pour chacun de vos cours du jour.",
      navigate,
      paths.teacher.attendance,
    ),
    step(
      '[data-tour="teacher-annonces"]',
      'Envoyez une annonce, une convocation ou signalez un incident aux parents de vos élèves.',
      navigate,
      paths.teacher.annonces,
    ),
    step(
      '[data-tour="teacher-schedule"]',
      'Votre emploi du temps de la semaine.',
      navigate,
      paths.teacher.schedule,
    ),
    step(
      '[data-tour="teacher-history"]',
      "Retrouvez ici l'historique de vos saisies récentes.",
      navigate,
      paths.teacher.history,
    ),
  ];
}

export function parentSteps(navigate: NavigateFunction): Step[] {
  return [
    intro(
      "Bienvenue ! Ce tour parcourt tous les écrans pour suivre la scolarité de votre enfant — vous pourrez le revoir à tout moment depuis l'accueil.",
    ),
    step(
      '[data-tour="parent-home"]',
      "L'accueil : un résumé de la scolarité de votre enfant et les dernières annonces non lues.",
      navigate,
      paths.parent.home,
    ),
    step(
      '[data-tour="parent-scolarite"]',
      'Le bulletin et les moyennes de votre enfant, période par période.',
      navigate,
      paths.parent.scolarite,
    ),
    step(
      '[data-tour="parent-suivi-parental"]',
      'Un suivi au quotidien : présences, retards et absences.',
      navigate,
      paths.parent.suiviParental,
    ),
    step(
      '[data-tour="parent-notifications"]',
      "Les annonces, convocations et incidents envoyés par l'école apparaissent ici.",
      navigate,
      paths.parent.notifications,
    ),
  ];
}
