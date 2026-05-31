"use client";

interface FilterSliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
}

export default function FilterSlider({
  label,
  min,
  max,
  value,
  onChange,
  unit = "%",
}: FilterSliderProps) {
  return (
    <label className="filter-slider">
      <span className="filter-slider__row">
        <span>{label}</span>
        <span className="filter-slider__value">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
