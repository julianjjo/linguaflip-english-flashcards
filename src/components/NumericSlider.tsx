import React from 'react';

interface NumericSliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
  showValue?: boolean;
  disabled?: boolean;
}

/**
 * Reusable NumericSlider component for consistent number input UI
 * Provides standardized styling and behavior for numeric range inputs
 */
export const NumericSlider: React.FC<NumericSliderProps> = ({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  description,
  showValue = true,
  disabled = false,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        {showValue && (
          <span className="text-sm font-semibold text-gray-900">
            {value.toFixed(step < 1 ? 1 : 0)}
            {unit}
          </span>
        )}
      </div>

      <div className="relative">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
          }}
        />

        {/* Custom thumb styling via global CSS */}
        {/* Note: These styles should be added to your global CSS file */}
      </div>

      {/* Min/Max labels */}
      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>

      {/* Description */}
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
};
