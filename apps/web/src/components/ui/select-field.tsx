import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    'id' | 'className' | 'children'
  > {
  label: string;
  options: readonly SelectOption[];
}

export function SelectField({ label, options, ...props }: SelectFieldProps) {
  const id = useId();

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <select
        id={id}
        className="min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-base outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-600"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}