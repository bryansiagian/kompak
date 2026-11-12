import { useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> {
  label: string;
  error?: string;
}

export function TextArea({ label, error, rows = 4, ...props }: TextAreaProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-600 ${
          error ? 'border-red-500' : 'border-stone-300'
        }`}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}