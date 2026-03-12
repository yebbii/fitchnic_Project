"use client";

interface TagPickerProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label: string;
}

export default function TagPicker({ options, value, onChange, label }: TagPickerProps) {
  return (
    <div className="mb-3">
      <div className="text-[13px] text-muted-foreground mb-1.5 font-semibold">{label}</div>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full px-4 py-[7px] text-sm font-medium border-[1.5px] cursor-pointer transition-all duration-150 ${
              value === o
                ? "bg-primary text-primary-foreground border-primary font-bold"
                : "bg-secondary text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
