import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, ...props }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-11 w-full rounded-xl border bg-white px-3.5 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-600 ${
          error ? 'border-red-500' : 'border-stone-300'
        }`}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-stone-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}