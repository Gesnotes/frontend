import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'danger' | 'danger-solid' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'ui-btn',
    `ui-btn--${variant}`,
    size !== 'md' ? `ui-btn--${size}` : '',
    block ? 'ui-btn--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading ? (
        <span className="ui-spinner" aria-hidden="true" />
      ) : icon ? (
        // Élément à part entière, pas du texte brut adjacent au libellé : le
        // `gap` du bouton ne sépare que des enfants distincts, deux textes
        // bruts collés fusionnent en une seule boîte anonyme sans espace.
        <span className="ui-btn__icon" aria-hidden="true">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
