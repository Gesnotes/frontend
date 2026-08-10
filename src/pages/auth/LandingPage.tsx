import { Link, useNavigate } from 'react-router-dom';

import { DEMO_IDENTIFIER, DEMO_PASSWORD } from '../../api';
import { paths } from '../../routes/paths';
import { Button, BrandMark, StatTile } from '../../ui';

const HAS_DEMO = Boolean(DEMO_IDENTIFIER && DEMO_PASSWORD);

const FEATURES = [
  {
    icon: '◫',
    title: 'Notes et bulletins',
    body: 'Moyennes calculées automatiquement, bulletins prêts à remettre aux familles, période par période.',
  },
  {
    icon: '✓',
    title: 'Présence',
    body: "Un statut par élève et par jour : la feuille de présence pour l'administration comme pour l'enseignant référent.",
  },
  {
    icon: '✉',
    title: 'Communication avec les familles',
    body: "Notification aux parents dès qu'une note est saisie ou qu'une absence est signalée.",
    highlight: true,
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
 * compte.
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
      <header className="landing__header">
        <div className="landing__header-inner">
          <div className="landing__brand">
            <BrandMark size={30} />
            Gesnotes
          </div>
          <div className="landing__header-actions">
            <Link to={paths.login}>
              <Button variant="ghost">Se connecter</Button>
            </Link>
            <Link to={paths.signup}>
              <Button>Essayer Gesnotes</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing__section landing__hero">
          <div className="landing__hero-copy">
            <h1 className="landing__hero-title">Le suivi scolaire, simplifié pour toute l’école.</h1>
            <p className="t-body-lg t-muted">
              Notes, présence, bulletins et communication avec les familles — une seule plateforme,
              pensée pour être claire dès la première prise en main.
            </p>
            <div className="landing__hero-actions">
              <Link to={paths.signup}>
                <Button size="lg">Essayer Gesnotes dans mon école</Button>
              </Link>
              <Link to={paths.login}>
                <Button size="lg" variant="secondary">Se connecter</Button>
              </Link>
              {HAS_DEMO ? (
                <Button size="lg" variant="ghost" onClick={openDemo} type="button">
                  Voir une démo
                </Button>
              ) : null}
            </div>
          </div>

          <div className="landing__hero-visual" aria-hidden="true">
            <div className="landing__preview">
              <div className="landing__preview-header">
                <span className="t-title-md" style={{ fontWeight: 700 }}>Tableau de bord</span>
                <span className="t-label-sm t-subtle">École de la Colombe</span>
              </div>
              <div className="landing__preview-grid">
                <StatTile label="Élèves inscrits" value="128" />
                <StatTile label="Classes" value="12" />
                <StatTile label="Moyenne de l'école" value="13,8" unit="/ 20" />
                <StatTile label="Présents aujourd'hui" value="96%" />
              </div>
              <span className="t-label-sm t-subtle" style={{ textTransform: 'none' }}>
                Aperçu à titre d'exemple.
              </span>
            </div>
          </div>
        </section>

        <section className="landing__section" style={{ background: 'var(--surface-container-low)' }}>
          <div className="landing__section-head">
            <h2 className="t-headline-lg">Fonctionnalités clés</h2>
            <p className="t-body-lg t-muted">Ce que Gesnotes change au quotidien pour votre établissement.</p>
          </div>
          <div className="landing__features">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`landing__feature-card${feature.highlight ? ' landing__feature-card--highlight' : ''}`}
              >
                <span className="landing__feature-icon" aria-hidden="true">{feature.icon}</span>
                <h3 className="t-title-md" style={{ fontWeight: 700 }}>{feature.title}</h3>
                <p className={feature.highlight ? undefined : 't-muted'}>{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing__section">
          <div className="landing__section-head">
            <h2 className="t-headline-lg">Une solution pour chaque rôle</h2>
          </div>
          <div className="landing__audience">
            {AUDIENCE.map((item) => (
              <div key={item.title} className="landing__audience-item">
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
        </section>
      </main>

      <footer className="landing__footer">
        <div className="landing__footer-inner">
          <span className="landing__footer-brand">Gesnotes</span>
          <span className="landing__footer-meta">
            <a href="mailto:contact@gesnotes.app">contact@gesnotes.app</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
