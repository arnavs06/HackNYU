import { useCallback, useMemo, useState } from 'react';

export interface PriceRangeState {
  min: string;
  max: string;
}

export interface NumericPriceRange {
  min: number | null;
  max: number | null;
}

const sanitizeCurrencyInput = (value: string) => value.replace(/[^0-9.]/g, '');

export function usePriceFilter<T>(
  items: T[],
  getPrice: (item: T) => number | null | undefined,
) {
  const [range, setRange] = useState<PriceRangeState>({ min: '', max: '' });

  const numericRange: NumericPriceRange = useMemo(() => ({
    min: range.min ? parseFloat(range.min) : null,
    max: range.max ? parseFloat(range.max) : null,
  }), [range]);

  const filteredItems = useMemo(() => {
    if (numericRange.min === null && numericRange.max === null) {
      return items;
    }

    return items.filter((item) => {
      const price = getPrice(item);
      if (price === null || price === undefined || Number.isNaN(price)) {
        return true;
      }
      if (numericRange.min !== null && price < numericRange.min) {
        return false;
      }
      if (numericRange.max !== null && price > numericRange.max) {
        return false;
      }
      return true;
    });
  }, [items, getPrice, numericRange]);

  const setMin = useCallback((value: string) => {
    setRange((prev) => ({ ...prev, min: sanitizeCurrencyInput(value) }));
  }, []);

  const setMax = useCallback((value: string) => {
    setRange((prev) => ({ ...prev, max: sanitizeCurrencyInput(value) }));
  }, []);

  const clearRange = useCallback(() => {
    setRange({ min: '', max: '' });
  }, []);

  return {
    range,
    numericRange,
    setMin,
    setMax,
    clearRange,
    filteredItems,
    hasActiveFilter: Boolean(range.min.length || range.max.length),
  };
}

export const priceFilterUtils = {
  sanitizeCurrencyInput,
};
