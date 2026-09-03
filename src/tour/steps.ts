import type { Step } from 'react-joyride';

/**
 * Un pas d'intro centré, sans cible réelle — convention react-joyride pour
 * ouvrir un tutoriel avant de pointer sur la première vraie zone de l'écran.
 */
function intro(content: string): Step {
  return { target: 'body', placement: 'center', content };
}

export const ADMIN_TOUR_STEPS: Step[] = [
  intro(
    "Bienvenue sur Gesnotes ! Ce tour rapide présente les écrans principaux de l'espace administration — vous pourrez le revoir à tout moment depuis le tableau de bord.",
  ),
  {
    target: '[data-tour="admin-classes"]',
    content: "Créez vos classes ici, en choisissant leur mode : « notes » (matières et évaluations) ou « présence » (maternelle, garderie).",
  },
  {
    target: '[data-tour="admin-subjects"]',
    content: 'Les matières enseignées dans votre établissement, avec leur coefficient.',
  },
  {
    target: '[data-tour="admin-teachers"]',
    content: 'Invitez vos enseignants et affectez-les à leurs classes et matières.',
  },
  {
    target: '[data-tour="admin-students"]',
    content: "Importez la liste de vos élèves, un par un ou en une fois depuis un tableur.",
  },
  {
    target: '[data-tour="admin-school-years"]',
    content: "Ouvrez une période (trimestre ou semestre) : sans période active, la saisie des notes n'est pas possible.",
  },
  {
    target: '[data-tour="admin-settings"]',
    content: "Les réglages de l'école (seuil de passage, types de note, modèle de bulletin…) vous attendent ici.",
  },
];

export const TEACHER_TOUR_STEPS: Step[] = [
  intro(
    "Bienvenue ! Voici les écrans principaux de votre espace — vous pourrez revoir ce tour à tout moment depuis l'accueil.",
  ),
  {
    target: '[data-tour="teacher-grade-entry"]',
    content: 'Saisissez les notes de vos classes ici, matière par matière.',
  },
  {
    target: '[data-tour="teacher-attendance"]',
    content: "Faites l'appel pour chacun de vos cours du jour.",
  },
  {
    target: '[data-tour="teacher-annonces"]',
    content: 'Envoyez une annonce, une convocation ou signalez un incident aux parents de vos élèves.',
  },
  {
    target: '[data-tour="teacher-schedule"]',
    content: 'Votre emploi du temps de la semaine.',
  },
  {
    target: '[data-tour="teacher-history"]',
    content: 'Retrouvez ici l\'historique de vos saisies récentes.',
  },
];

export const PARENT_TOUR_STEPS: Step[] = [
  intro(
    "Bienvenue ! Voici comment suivre la scolarité de votre enfant — vous pourrez revoir ce tour à tout moment depuis l'accueil.",
  ),
  {
    target: '[data-tour="parent-scolarite"]',
    content: 'Le bulletin et les moyennes de votre enfant, période par période.',
  },
  {
    target: '[data-tour="parent-suivi-parental"]',
    content: "Un suivi au quotidien : présences, retards et absences.",
  },
  {
    target: '[data-tour="parent-notifications"]',
    content: "Les annonces, convocations et incidents envoyés par l'école apparaissent ici.",
  },
];
