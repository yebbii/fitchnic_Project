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
      <div className="text-sm text-muted-foreground mb-2 font-medium">{label}</div>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-xl px-5 py-2 text-sm font-medium border-[1.5px] cursor-pointer transition-all duration-150 ${
              value === o
                ? "bg-primary text-white border-primary"
                : "bg-white text-muted-foreground border-border/60 hover:border-primary/30"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
