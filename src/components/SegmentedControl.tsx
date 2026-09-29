
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    sm: 'p-0.5 text-xs h-7',
    md: 'p-1 text-sm h-9',
    lg: 'p-1 text-base h-11',
  };

  return (
    <div
      className={`inline-flex w-full items-center bg-[#767680]/[0.12] rounded-[9px] relative select-none ${sizeClasses[size]} ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex items-center justify-center font-medium rounded-[7px] transition-all duration-150 py-1 px-2 z-10 ${
              isSelected
                ? 'bg-white text-black shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] font-semibold'
                : 'text-[#8E8E93] hover:text-black'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
