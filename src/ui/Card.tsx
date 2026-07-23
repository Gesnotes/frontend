import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  flat?: boolean;
  padded?: boolean;
};

export function Card({ flat = false, padded = false, className, children, ...rest }: CardProps) {
  const classes = ['ui-card', flat ? 'ui-card--flat' : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <div className={classes} {...rest}>
      {padded ? <div className="ui-card__body">{children}</div> : children}
    </div>
  );
}

type ClickableCardProps = ButtonHTMLAttributes<HTMLButtonElement> & { padded?: boolean };

/** Carte cliquable — rendue en <button> pour rester accessible au clavier. */
export function ClickableCard({ padded = true, className, children, type = 'button', ...rest }: ClickableCardProps) {
  const classes = ['ui-card', 'ui-card--interactive', className ?? ''].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} {...rest}>
      {padded ? <div className="ui-card__body">{children}</div> : children}
    </button>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="ui-section-title">
      <h2 className="ui-section-title__text">{children}</h2>
      {aside ? <div className="ui-section-title__aside">{aside}</div> : null}
    </div>
  );
}
