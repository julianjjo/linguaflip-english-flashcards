import { useCallback } from 'react';

/**
 * Custom hook for handling numeric input changes with validation and constraints
 *
 * @template T - The type of the object containing the numeric fields
 * @param updateFunction - Function to update the parent state with new values
 * @param options - Configuration options for input validation
 * @param options.min - Minimum allowed value (optional)
 * @param options.max - Maximum allowed value (optional)
 * @param options.step - Step size for rounding values (default: 1)
 * @param options.allowEmpty - Whether to allow empty string values (default: false)
 * @returns Object containing handlers for numeric input changes
 *
 * @example
 * ```typescript
 * const { handleNumericChange } = useNumericInput(updateSettings, {
 *   min: 0,
 *   max: 100,
 *   step: 0.1
 * });
 *
 * // Use in input onChange
 * <input onChange={handleNumericChange('volume')} />
 * ```
 */
export const useNumericInput = <T extends Record<string, any>>(
  updateFunction: (updates: Partial<T>) => void,
  options: {
    min?: number;
    max?: number;
    step?: number;
    allowEmpty?: boolean;
  } = {}
) => {
  const { min, max, step = 1, allowEmpty = false } = options;

  const handleNumericChange = useCallback(
    (field: keyof T) =>
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;

        if (allowEmpty && value === '') {
          updateFunction({ [field]: '' } as Partial<T>);
          return;
        }

        const numericValue = parseFloat(value);

        if (isNaN(numericValue)) {
          return; // Don't update if not a valid number
        }

        // Apply constraints
        let constrainedValue = numericValue;

        if (min !== undefined) {
          constrainedValue = Math.max(constrainedValue, min);
        }

        if (max !== undefined) {
          constrainedValue = Math.min(constrainedValue, max);
        }

        // Round to step precision
        if (step !== 1) {
          constrainedValue = Math.round(constrainedValue / step) * step;
        }

        updateFunction({ [field]: constrainedValue } as Partial<T>);
      },
    [updateFunction, min, max, step, allowEmpty]
  );

  const createInputProps = useCallback(
    (field: keyof T, currentValue: number) => ({
      type: 'range' as const,
      value: currentValue,
      onChange: handleNumericChange(field),
      min,
      max,
      step,
    }),
    [handleNumericChange, min, max, step]
  );

  return {
    handleNumericChange,
    createInputProps,
  };
};