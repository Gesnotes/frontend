import type { CSSProperties, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
    icon: '◷',
    title: 'Informées en quelques secondes',
    body: "Une note saisie, une absence signalée : la famille reçoit une notification aussitôt — jamais découverte en fin de trimestre.",
  },
  {
    icon: '▤',
    title: 'Un calcul jamais une boîte noire',
    body: 'Chaque moyenne se décompose devant les parents — interrogation, devoir, composition — pour qu’aucune contestation ne reste sans réponse.',
  },
  {
    icon: '▦',
    title: 'Depuis le téléphone qu’elles ont déjà',
    body: "Pas d'ordinateur ni de compte compliqué à créer : les familles suivent la scolarité depuis leur téléphone, comme le reste de leur quotidien.",
  },
];

const FEATURES = [
  {
    icon: '✉',
    title: 'Communication avec les familles',
    body: "Notification aux parents dès qu'une note est saisie ou qu'une absence est signalée — la confiance se construit note après note, pas au bulletin trimestriel.",
    highlight: true,
  },
  {
    icon: '◫',
    title: 'Notes et bulletins',
    body: 'Moyennes calculées automatiquement et vérifiables par les familles, bulletins prêts à remettre aux familles, période par période.',
  },
  {
    icon: '✓',
    title: 'Présence',
    body: "Un statut par élève et par jour, visible par la famille le jour même — la feuille de présence pour l'administration comme pour l'enseignant référent.",
  },
];

const AUDIENCE = [
  {
    icon: '⚙',
    title: 'Administrateurs',
    body: "Gérez tout l'établissement depuis un tableau de bord centralisé : classes, enseignants, élèves, périodes.",
  },
  {
    icon: '✎',
    title: 'Enseignants',
    body: 'Gagnez du temps sur la saisie des notes et de la présence, pour vous concentrer sur vos élèves.',
  },
  {
    icon: '⌂',
    title: 'Parents',
    body: 'Suivez la scolarité de votre enfant en toute transparence, prévenus dès qu’il y a du nouveau.',
  },
];

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
 */
export default function LandingPage() {
  const navigate = useNavigate();

  /** Pré-remplit la connexion avec les identifiants de démo — sans la soumettre à sa place, la dernière étape reste un geste volontaire. */
  function openDemo() {
    navigate(paths.login, {
      state: { demoIdentifier: DEMO_IDENTIFIER, demoPassword: DEMO_PASSWORD },
    });
  }

  return (
    <div className="landing">
      <div className="landing__accent-bar" aria-hidden="true" />

      <header className="landing__header">
        <div className="landing__header-inner">
          <div className="landing__brand">
            <BrandMark size={30} />
            Gesnotes
          </div>
          <div className="landing__header-actions">
            <Link to={paths.login} className="landing__login-link">Se connecter</Link>
            <Link to={paths.signup}>
              <Button>Demander un accès</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing__section landing__hero">
          <div className="landing__hero-glow" aria-hidden="true" />
          <div className="landing__hero-copy">
            <span className="landing__badge">Conçu pour la confiance des familles</span>
            <h1 className="landing__hero-title">Des familles informées, une école de confiance.</h1>
            <p className="t-body-lg t-muted">
              Notes, présence et bulletins partagés avec les parents dès qu'ils existent — la
              transparence devient une habitude, pas un effort de plus pour l'administration.
            </p>
            <div className="landing__hero-actions">
              <Link to={paths.signup}>
                <Button size="lg">Demander à essayer Gesnotes</Button>
              </Link>
              {HAS_DEMO ? (
                <Button size="lg" variant="ghost" onClick={openDemo} type="button">
                  Voir une démo
                </Button>
              ) : null}
            </div>
            <Link to={paths.login} className="landing__hero-login">
              Déjà cliente ? Se connecter →
            </Link>
          </div>
        </section>

        <RevealSection className="landing__trust">
          <div className="landing__trust-inner">
            {TRUST.map((item, index) => (
              <div key={item.title} className="landing__trust-item" style={{ transitionDelay: `${index * 80}ms` }}>
                <span className="landing__trust-icon" aria-hidden="true">{item.icon}</span>
                <div>
                  <h3 className="t-title-md" style={{ fontWeight: 700 }}>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </RevealSection>

        <RevealSection className="landing__section" style={{ background: 'var(--surface-container-low)' }}>
          <div className="landing__section-head">
            <h2 className="t-headline-lg">Ce qui fait la confiance, au quotidien</h2>
            <p className="t-body-lg t-muted">Ce que Gesnotes change pour votre établissement — et pour les familles qui le suivent.</p>
          </div>
          <div className="landing__features">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className={`landing__feature-card${feature.highlight ? ' landing__feature-card--highlight' : ''}`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <span className="landing__feature-icon" aria-hidden="true">{feature.icon}</span>
                <h3 className="t-title-md" style={{ fontWeight: 700 }}>{feature.title}</h3>
                <p className={feature.highlight ? undefined : 't-muted'}>{feature.body}</p>
              </div>
            ))}
          </div>
        </RevealSection>

        <RevealSection className="landing__section">
          <div className="landing__section-head">
            <h2 className="t-headline-lg">Une solution pour chaque rôle</h2>
          </div>
          <div className="landing__audience">
            {AUDIENCE.map((item, index) => (
              <div key={item.title} className="landing__audience-item" style={{ transitionDelay: `${index * 80}ms` }}>
                <span className="landing__audience-icon" aria-hidden="true">{item.icon}</span>
                <div>
                  <h4 className="t-title-md" style={{ fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                    {item.title}
                  </h4>
                  <p className="t-body-md t-muted">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </RevealSection>

        <RevealSection className="landing__cta">
          <div className="landing__cta-inner">
            <h2 className="t-headline-lg">Prête à donner aux familles la transparence qu'elles attendent ?</h2>
            <p className="t-body-lg" style={{ opacity: 0.85 }}>
              Décrivez votre établissement, l'équipe Gesnotes vous recontacte pour la mise en route.
            </p>
            <Link to={paths.signup}>
              <Button size="lg" variant="secondary">Demander un accès</Button>
            </Link>
          </div>
        </RevealSection>
      </main>

      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <div>
            <span className="landing__footer-brand">Gesnotes</span>
            <p className="landing__footer-tagline">La confiance des familles, à chaque note.</p>
          </div>
          <span className="landing__footer-meta">
            <a href="mailto:contact@gesnotes.bj">contact@gesnotes.bj</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

/** Fait glisser une section vers le haut la première fois qu'elle entre dans le viewport. */
function RevealSection({
  className, style, children,
}: {
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [ref, visible] = useRevealOnScroll<HTMLElement>();
  return (
    <section
      ref={ref}
      className={`${className}${visible ? ' landing--visible' : ' landing--pre-reveal'}`}
      style={style}
    >
      {children}
    </section>
  );
}
