import { useId, useState } from 'react';
import type {
  InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeOff } from 'lucide-react';

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; invalid: boolean; describedBy?: string }) => ReactNode;
};

function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>{label}</label>
      {children({ id, invalid: Boolean(error), describedBy })}
      {error ? <span className="ui-field__error" id={errorId}>{error}</span> : null}
      {hint ? <span className="ui-field__hint" id={hintId}>{hint}</span> : null}
    </div>
  );
}

type Common = { label: string; hint?: string; error?: string };

export function TextField({
  label, hint, error, ...rest
}: Common & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = rest.type === 'password';

  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, invalid, describedBy }) => (
        isPassword ? (
          <div className="ui-input-wrap">
            <input
              id={id}
              className="ui-input ui-input--password"
              aria-invalid={invalid}
              aria-describedby={describedBy}
              {...rest}
              type={revealed ? 'text' : 'password'}
            />
            <button
              type="button"
              className="ui-input-reveal"
              onClick={() => setRevealed((current) => !current)}
              aria-label={revealed ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              aria-pressed={revealed}
            >
              {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        ) : (
          <input id={id} className="ui-input" aria-invalid={invalid} aria-describedby={describedBy} {...rest} />
        )
      )}
    </FieldShell>
  );
}

export type SelectOption = { value: string; label: string };

export function SelectField({
  label, hint, error, options, placeholder, ...rest
}: Common & { options: SelectOption[]; placeholder?: string } & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, invalid, describedBy }) => (
        <select id={id} className="ui-select" aria-invalid={invalid} aria-describedby={describedBy} {...rest}>
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  label, hint, error, ...rest
}: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, invalid, describedBy }) => (
        <textarea id={id} className="ui-textarea" aria-invalid={invalid} aria-describedby={describedBy} {...rest} />
      )}
    </FieldShell>
  );
}

export function CheckboxChip({
  label, ...rest
}: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label className="ui-checkbox">
      <input type="checkbox" {...rest} />
      {label}
    </label>
  );
}
