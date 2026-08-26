import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, Building2, Calculator, Check, CheckCircle2, ChevronDown, FileText, Home, Mail, Smartphone, UserCheck,
} from 'lucide-react';

import { DEMO_IDENTIFIER, DEMO_PASSWORD } from '../../api';
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll';
import { paths } from '../../routes/paths';
import { Button, BrandMark } from '../../ui';

const HAS_DEMO = Boolean(DEMO_IDENTIFIER && DEMO_PASSWORD);

/**
 * Ce que la confiance des familles veut concrètement dire — trois choses déjà
 * construites (bus d'événements côté notifications, détail par catégorie du
 * bulletin, PWA mobile), pas des chiffres inventés pour l'occasion.
 */
const TRUST = [
  {
    icon: Bell,
    title: 'Informées en quelques secondes',
    body: "Une note saisie, une absence signalée : la famille reçoit une notification aussitôt — jamais découverte en fin de trimestre.",
  },
  {
    icon: Calculator,
    title: 'Un calcul jamais une boîte noire',
    body: 'Chaque moyenne se décompose devant les parents — interrogation, devoir, composition — pour qu’aucune contestation ne reste sans réponse.',
  },
  {
    icon: Smartphone,
    title: 'Depuis le téléphone qu’elles ont déjà',
    body: "Pas d'ordinateur ni de compte compliqué à créer : les familles suivent la scolarité depuis leur téléphone, comme le reste de leur quotidien.",
  },
];

const FEATURES = [
  {
    icon: Mail,
    title: 'Communication avec les familles',
    body: "Notification aux parents dès qu'une note est saisie ou qu'une absence est signalée — la confiance se construit note après note, pas au bulletin trimestriel.",
    highlight: true,
  },
  {
    icon: FileText,
    title: 'Notes et bulletins',
    body: 'Moyennes calculées automatiquement et vérifiables par les familles, bulletins prêts à remettre aux familles, période par période.',
  },
  {
    icon: UserCheck,
    title: 'Présence',
    body: "Un statut par élève et par jour, visible par la famille le jour même — la feuille de présence pour l'administration comme pour l'enseignant référent.",
  },
];

/**
 * Deux publics, deux lectures séparées plutôt qu'une liste de trois rôles à
 * plat : un visiteur qui arrive sur la page sait en un coup d'œil laquelle
 * des deux colonnes le concerne. « Établissement » régroupe direction et
 * enseignants — ce sont eux qui souscrivent — « parents d'élèves » est le
 * public qui vit le produit sans jamais s'inscrire lui-même.
 */
const PERSONAS = [
  {
    icon: Building2,
    title: 'Pour votre établissement',
    subtitle: 'Administrateurs, directeurs et enseignants',
    points: [
      "Tableau de bord centralisé : classes, enseignants, élèves, périodes scolaires et annuaires.",
      'Saisie des notes et de la présence en quelques secondes pour chaque enseignant.',
      'Bulletins calculés et générés automatiquement, prêts à remettre aux familles.',
    ],
  },
  {
    icon: Home,
    title: "Pour les parents d'élèves",
    subtitle: 'Le suivi de la scolarité au quotidien',
    points: [
      'Notes et bulletins consultables dès leur publication, sans attendre une réunion.',
      "Alerte immédiate en cas d'absence ou d'annonce importante de l'école.",
      'Tout depuis le téléphone déjà en poche — aucune application compliquée à installer.',
    ],
    note: "Le compte parent est ouvert par l'établissement de l'enfant, pas par une inscription libre.",
  },
];

/** Questions et réponses alignées mot pour mot avec le schéma FAQPage de
 * `index.html` — un contenu structuré qui ne correspond pas à ce qui est
 * visible sur la page est ignoré par Google, voire pénalisé. */
const FAQ = [
  {
    question: "Qu'est-ce que Gesnotes ?",
    answer:
      "Gesnotes est un logiciel de gestion scolaire en ligne conçu pour les établissements scolaires. Il centralise la saisie des notes, le calcul des moyennes, la génération des bulletins et la communication avec les parents dans une seule application accessible sur web et mobile.",
  },
  {
    question: 'Comment fonctionne la gestion des notes sur Gesnotes ?',
    answer:
      "Les enseignants saisissent les notes depuis leur espace dédié. Gesnotes calcule automatiquement les moyennes par matière et par période. Les bulletins sont générés instantanément et les parents reçoivent une notification push dès qu'une note est publiée.",
  },
  {
    question: 'Gesnotes est-il disponible pour les écoles au Bénin et en Afrique ?',
    answer:
      "Oui. Gesnotes est conçu pour les établissements scolaires d'Afrique francophone, avec une interface en français adaptée aux réalités locales (système de notation, calendrier scolaire, communication par notification mobile).",
  },
  {
    question: 'Les parents peuvent-ils suivre les notes de leurs enfants ?',
    answer:
      "Oui. Les parents disposent d'un espace personnel sur Gesnotes où ils peuvent consulter les notes, les bulletins, les absences et les annonces de l'école. Ils reçoivent des notifications push sur leur téléphone dès qu'il y a du nouveau.",
  },
  {
    question: 'Gesnotes fonctionne-t-il sans connexion internet ?',
    answer:
      'Oui. Gesnotes est une Progressive Web App (PWA) qui peut fonctionner partiellement hors connexion. Les données consultées récemment restent accessibles même sans réseau, ce qui est essentiel dans des zones à connectivité limitée.',
  },
  {
    question: 'Comment démarrer avec Gesnotes pour mon école ?',
    answer:
      "Il suffit de remplir le formulaire de demande d'accès sur gesnotes.bj. L'équipe Gesnotes vous recontacte pour configurer votre établissement, importer vos classes et vous accompagner dans la prise en main.",
  },
];

/** Réseaux sociaux du footer : liens en attente tant que les comptes ne sont
 * pas encore ouverts — remplacer chaque `href` par l'URL réelle dès qu'un
 * compte existe, pour ne jamais laisser un visiteur cliquer dans le vide. */
const SOCIALS = [
  { name: 'Facebook', kind: 'facebook', href: '#' },
  { name: 'LinkedIn', kind: 'linkedin', href: '#' },
  { name: 'Instagram', kind: 'instagram', href: '#' },
  { name: 'WhatsApp', kind: 'whatsapp', href: '#' },
] as const;

const revealCls = (visible: boolean) =>
  `transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:!opacity-100 motion-reduce:!translate-y-0 ${
    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
  }`;

/**
 * Racine publique. Un visiteur qui arrive sur le domaine principal sans
 * session doit trouver tout de suite comment essayer Gesnotes — pas
 * atterrir directement sur un formulaire de connexion qui suppose déjà un
 * compte. « Se connecter » reste accessible, mais discret : ce n'est pas ce
 * que vient chercher un visiteur qui découvre le produit.
 *
 * Positionnement : la confiance des familles, pas seulement le gain de temps
 * administratif — c'est ce qui distingue Gesnotes d'un simple carnet de notes
 * numérique. Le bandeau de confiance juste sous le hero porte cet argument en
 * premier, avant même la liste de fonctionnalités.
 *
 * Langage impersonnel à dessein : aucun texte visible n'accorde un adjectif
 * au genre du visiteur (pas de « prête », pas de « cliente ») — on ne
 * présume jamais qui lit la page.
 *
 * Mise en page en Tailwind (+ icônes lucide-react), comme l'espace admin
 * (`src/pages/admin`) — palette et échelle Tailwind natives plutôt qu'un
 * calque au pixel près de l'ancien `landing.css` : `primary`/`secondary`/
 * `accent`/`success` (thème DaisyUI « gesnotes », mêmes hex que
 * `tokens.css`) pour la marque, `gray-*` pour le neutre. Les composants
 * partagés (`Button`, `TextField`, `Card`...) restent inchangés — ils
 * gardent l'ancien système à jetons, comme dans l'admin déjà migré.
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  /** Pré-remplit la connexion avec les identifiants de démo — sans la soumettre à sa place, la dernière étape reste un geste volontaire. */
  function openDemo() {
    navigate(paths.login, {
      state: { demoIdentifier: DEMO_IDENTIFIER, demoPassword: DEMO_PASSWORD },
    });
  }

  return (
    <div className="min-h-full overflow-x-clip bg-[#F6F7FB]">
      <div className="h-1 bg-gradient-to-r from-accent via-primary to-secondary" aria-hidden="true" />

      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-shrink-0 items-center gap-2 text-xl font-extrabold text-gray-900">
            <BrandMark size={30} />
            Gesnotes
          </div>
          <nav className="hidden flex-1 items-center justify-center gap-6 lg:flex" aria-label="Sections de la page">
            <a href="#fonctionnalites" className="text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900">Fonctionnalités</a>
            <a href="#pour-qui" className="text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900">Pour qui ?</a>
            <a href="#faq" className="text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to={paths.login}
              className="hidden whitespace-nowrap text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900 sm:block"
            >
              Se connecter
            </Link>
            <Link to={paths.signup}>
              <Button>Demander un accès</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-7xl animate-[gn-rise_0.4s_ease_both] px-4 pb-12 pt-10 motion-reduce:animate-none sm:px-6 sm:pb-16 sm:pt-14 lg:pb-24 lg:pt-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-[10%] -top-[10%] z-[-1] h-[480px] blur-[40px]"
            style={{
              background:
                'radial-gradient(480px 280px at 20% 20%, rgba(30,64,175,0.55), transparent),'
                + 'radial-gradient(420px 260px at 80% 10%, rgba(221,225,255,0.65), transparent)',
            }}
          />

          <div className="flex flex-col items-center gap-10 text-center lg:flex-row lg:items-center lg:justify-between lg:text-left">
            <div className="flex max-w-xl flex-col items-center gap-5 lg:items-start">
              <span className="inline-flex items-center rounded-full bg-[#dde1ff] px-4 py-1 text-xs font-bold uppercase tracking-wider text-[#173bab]">
                Conçu pour la confiance des familles
              </span>
              {/* h1 optimisé SEO — mots-clés naturels (logiciel de gestion scolaire) + promesse produit */}
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
                Gesnotes, le logiciel de gestion scolaire qui garde les familles informées.
              </h1>
              <p className="text-base text-gray-500 sm:text-lg">
                Notes, présences et bulletins saisis par l'école, partagés en temps réel avec les
                parents d'élèves — une seule plateforme pensée pour les établissements d'Afrique
                francophone.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link to={paths.signup}>
                  <Button size="lg">Demander à essayer Gesnotes</Button>
                </Link>
                {HAS_DEMO ? (
                  <Button size="lg" variant="ghost" onClick={openDemo} type="button">
                    Voir une démo
                  </Button>
                ) : null}
              </div>
              <Link
                to={paths.login}
                className="text-sm font-semibold text-gray-500 transition-colors hover:text-primary"
              >
                Vous avez déjà un compte ? Se connecter →
              </Link>
            </div>

            <div className="hidden w-[340px] flex-shrink-0 lg:block" aria-hidden="true">
              <div className="relative -rotate-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-secondary font-bold text-white">
                    AK
                  </span>
                  <div>
                    <strong className="block text-base text-gray-900">Aïcha K.</strong>
                    <span className="text-sm text-gray-500">6ème A</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
                  <span>Mathématiques — Composition</span>
                  <span className="flex-shrink-0 rounded-full bg-success/15 px-2.5 py-0.5 text-sm font-extrabold text-success">
                    16/20
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
                  <span>Présence — Aujourd'hui</span>
                  <span className="flex-shrink-0 rounded-full bg-gray-200 px-2.5 py-0.5 text-sm font-extrabold text-gray-600">
                    Présent
                  </span>
                </div>

                <div className="absolute -right-4 -top-4 flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-100 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg">
                  <CheckCircle2 size={16} className="text-success" />
                  Famille notifiée à l'instant
                </div>
              </div>
            </div>
          </div>
        </section>

        <RevealSection className="bg-gradient-to-br from-accent to-primary text-white">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 md:grid-cols-3">
            {TRUST.map((item, index) => (
              <div key={item.title} className="flex gap-3" style={{ transitionDelay: `${index * 80}ms` }}>
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white/15">
                  <item.icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm text-white/85">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </RevealSection>

        <RevealSection id="fonctionnalites" className="bg-[#F0F3FF]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="mx-auto mb-10 flex max-w-2xl flex-col gap-2 text-center">
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Ce qui fait la confiance, au quotidien</h2>
              <p className="text-base text-gray-500 sm:text-lg">Ce que Gesnotes change pour votre établissement — et pour les familles qui le suivent.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <div
                  key={feature.title}
                  style={{ transitionDelay: `${index * 80}ms` }}
                  className={
                    feature.highlight
                      ? 'flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-secondary to-accent p-6 text-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg'
                      : 'flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg'
                  }
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-full ${feature.highlight ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                    <feature.icon size={22} aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className={feature.highlight ? 'text-white/85' : 'text-gray-500'}>{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection id="pour-qui" className="bg-[#F6F7FB]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="mx-auto mb-10 flex max-w-2xl flex-col gap-2 text-center">
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Pensé pour l'école, indispensable pour les parents</h2>
              <p className="text-base text-gray-500 sm:text-lg">Deux points de vue, une seule source d'information fiable.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {PERSONAS.map((persona) => (
                <div key={persona.title} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6">
                  <span className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <persona.icon size={22} aria-hidden="true" />
                  </span>
                  <h3 className="text-xl font-bold text-gray-900">{persona.title}</h3>
                  <p className="text-sm text-gray-500">{persona.subtitle}</p>
                  <ul className="mt-4 flex flex-col gap-3">
                    {persona.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm leading-relaxed text-gray-600">
                        <Check size={16} className="mt-0.5 flex-shrink-0 text-success" aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  {persona.note ? (
                    <p className="mt-5 border-t border-gray-100 pt-4 text-sm italic text-gray-500">{persona.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        {/* ── Section FAQ ────────────────────────────────────────────────────
            Visible et crawlable : signal GEO fort pour les LLMs qui lisent le
            HTML. Également utile pour le SEO classique (rich snippets FAQ).
        ─────────────────────────────────────────────────────────────────── */}
        <RevealSection id="faq" className="bg-[#F0F3FF]">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <div className="mx-auto mb-10 flex max-w-2xl flex-col gap-2 text-center">
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Questions fréquentes</h2>
              <p className="text-base text-gray-500 sm:text-lg">Tout ce qu'il faut savoir avant de démarrer avec Gesnotes.</p>
            </div>
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {FAQ.map((item) => (
                <details key={item.question} className="group rounded-xl border border-gray-100 bg-white open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <ChevronDown size={18} className="flex-shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="px-5 pb-4 text-sm leading-relaxed text-gray-500">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection className="bg-gradient-to-br from-accent to-primary text-white">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
            <h2 className="text-2xl font-bold sm:text-3xl">Envie d'essayer Gesnotes dans votre école ?</h2>
            <p className="text-base text-white/85 sm:text-lg">
              Décrivez votre établissement, l'équipe Gesnotes vous recontacte pour la mise en route.
            </p>
            <Link to={paths.signup}>
              <Button size="lg" variant="secondary">Demander un accès</Button>
            </Link>
          </div>
        </RevealSection>
      </main>

      {/* ── Footer enrichi E-E-A-T ───────────────────────────────────────
          Adresse, contact, réseaux et positionnement géographique : signaux
          Experience-Expertise-Authoritativeness-Trustworthiness pour Google.
      ─────────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-gray-900 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="flex max-w-xs flex-col items-start gap-3 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-lg font-extrabold">
              <BrandMark size={28} />
              Gesnotes
            </div>
            <p className="text-sm text-gray-400">La confiance des familles, à chaque note.</p>
            <div className="flex items-center gap-2">
              {SOCIALS.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  aria-label={social.name}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/25 text-white transition-colors hover:border-white hover:bg-white/10"
                >
                  <SocialIcon kind={social.kind} />
                </a>
              ))}
            </div>
          </div>

          <nav className="flex flex-col items-start gap-3" aria-label="Produit">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Produit</span>
            <a href="#fonctionnalites" className="text-sm text-gray-400 transition-colors hover:text-white">Fonctionnalités</a>
            <a href="#pour-qui" className="text-sm text-gray-400 transition-colors hover:text-white">Pour qui ?</a>
            <a href="#faq" className="text-sm text-gray-400 transition-colors hover:text-white">Questions fréquentes</a>
          </nav>

          <nav className="flex flex-col items-start gap-3" aria-label="Accès">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Accès</span>
            <Link to={paths.signup} className="text-sm text-gray-400 transition-colors hover:text-white">Demander un accès</Link>
            <Link to={paths.login} className="text-sm text-gray-400 transition-colors hover:text-white">Se connecter</Link>
          </nav>

          <div className="flex flex-col items-start gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Contact</span>
            <a href="mailto:contact@gesnotes.bj" className="text-sm text-gray-400 transition-colors hover:text-white">contact@gesnotes.bj</a>
            <a href="mailto:support@gesnotes.bj" className="text-sm text-gray-400 transition-colors hover:text-white">support@gesnotes.bj</a>
          </div>
        </div>

        <div className="border-t border-white/10">
          <p className="mx-auto max-w-7xl px-4 py-4 text-sm text-gray-400 sm:px-6">
            © {year} Gesnotes — Logiciel de gestion scolaire, Bénin &amp; Afrique francophone
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Fait glisser une section vers le haut la première fois qu'elle entre dans le viewport. */
function RevealSection({
  id, className, children,
}: {
  id?: string;
  className: string;
  children: ReactNode;
}) {
  const [ref, visible] = useRevealOnScroll<HTMLElement>();
  return (
    <section id={id} ref={ref} className={`scroll-mt-[88px] ${className} ${revealCls(visible)}`}>
      {children}
    </section>
  );
}

/** Icônes de réseaux sociaux dessinées en interne — lucide-react ne fournit
 * pas d'icônes de marque (retirées de la bibliothèque) ; traits génériques
 * reconnaissables, pas de reproduction exacte des logos. */
function SocialIcon({ kind }: { kind: (typeof SOCIALS)[number]['kind'] }) {
  switch (kind) {
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <text x="12" y="13" textAnchor="middle" dominantBaseline="central" fontSize="13" fontWeight="700" fill="currentColor">f</text>
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="12" cy="12" r="10.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <text x="12" y="13" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill="currentColor">in</text>
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <rect x="1.75" y="1.75" width="20.5" height="20.5" rx="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="17.1" cy="6.9" r="1.1" fill="currentColor" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 2.5c-5.25 0-9.5 4.25-9.5 9.5 0 1.7.45 3.29 1.24 4.66L2.5 21.5l5.02-1.22A9.45 9.45 0 0 0 12 21.5c5.25 0 9.5-4.25 9.5-9.5S17.25 2.5 12 2.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}
