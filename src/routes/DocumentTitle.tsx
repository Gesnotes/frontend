import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { paths } from './paths';

const SUFFIX = 'Gesnotes';

/**
 * Titre du document, dérivé de la route courante.
 *
 * Toutes les pages partageaient le même `<title>` : l'historique du navigateur
 * et les onglets épinglés étaient illisibles, et les favoris de l'utilisateur
 * indiscernables les uns des autres.
 *
 * La table est tenue ici plutôt que dans chaque page : un titre est une
 * propriété de la route, et les regrouper évite qu'un écran ajouté plus tard
 * hérite silencieusement du titre du précédent.
 */
const TITLES: Record<string, string> = {
  // Racine : redirige aussitôt vers l'espace du rôle, mais le rendu passe par
  // là — sans entrée, l'onglet clignoterait sur « Page introuvable ».
  '/': 'Le suivi scolaire, en toute confiance',

  [paths.login]: 'Connexion',
  [paths.forgotPassword]: 'Mot de passe oublié',
  [paths.resetPassword]: 'Définir un mot de passe',
  '/reset-password': 'Définir un mot de passe',
  [paths.signup]: 'Essayer Gesnotes',

  [paths.admin.dashboard]: 'Tableau de bord',
  [paths.admin.classes]: 'Classes',
  [paths.admin.gradeEntry]: 'Saisie des notes',
  [paths.admin.subjects]: 'Matières',
  [paths.admin.teachers]: 'Enseignants',
  [paths.admin.students]: 'Élèves',
  [paths.admin.schoolYears]: 'Années scolaires et périodes',
  [paths.admin.archives]: 'Archives',
  [paths.admin.settings]: 'Paramètres',

  // `/enseignant` redirige vers la saisie : le titre ne doit pas annoncer un
  // écran « Mes classes » qui n'existe plus.
  [paths.teacher.dashboard]: 'Saisie des notes',
  [paths.teacher.gradeEntry]: 'Saisie des notes',
  [paths.teacher.attendance]: 'Présence',
  [paths.teacher.history]: 'Historique des saisies',

  [paths.parent.home]: 'Accueil',
  [paths.parent.scolarite]: 'Scolarité',
  [paths.parent.suiviParental]: 'Suivi parental',
  [paths.parent.grades]: 'Notes',
  [paths.parent.attendance]: 'Présence',
  [paths.parent.notifications]: 'Alertes',

  [paths.staff.login]: 'Équipe Gesnotes',
  [paths.staff.dashboard]: "Vue d'ensemble",
  [paths.staff.signupRequests]: "Demandes d'inscription",
  [paths.staff.schools]: 'Écoles',
};

/**
 * Titres des routes à paramètre, reconnues par leur forme.
 *
 * L'identifiant n'apporte rien dans un onglet ; le nom de l'élève, lui, n'est
 * pas connu ici — et n'a rien à faire dans un titre de fenêtre partagé à
 * l'écran.
 */
function dynamicTitle(pathname: string): string | undefined {
  if (/^\/admin\/classes\/[^/]+\/bulletin$/.test(pathname)) return 'Bulletin de classe';
  if (/^\/admin\/classes\/[^/]+\/presence$/.test(pathname)) return 'Présence';
  if (/^\/admin\/classes\/[^/]+\/reinscription$/.test(pathname)) return 'Réinscription';
  if (/^\/admin\/classes\/[^/]+$/.test(pathname)) return 'Détail de la classe';
  if (/^\/admin\/eleves\/[^/]+$/.test(pathname)) return "Fiche de l'élève";
  if (/^\/admin\/enseignants\/[^/]+$/.test(pathname)) return "Fiche de l'enseignant";
  if (/^\/parent\/enfants\/[^/]+$/.test(pathname)) return 'Résultats de mon enfant';
  if (/^\/parent\/notes\/[^/]+$/.test(pathname)) return 'Détail de la note';
  return undefined;
}

export function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = TITLES[pathname] ?? dynamicTitle(pathname) ?? 'Page introuvable';
    document.title = `${page} · ${SUFFIX}`;
  }, [pathname]);

  return null;
}
