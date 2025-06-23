// utils/workoutUtils.ts
import dayjs from 'dayjs';

export const normalizeDateInput = (input: string): string | null => {
  const digits = input.replace(/[^\d]/g, '');

  if (digits.length === 6) {
    const year = '20' + digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const day = digits.slice(4, 6);
    const formatted = `${year}-${month}-${day}`;

    const isValid = dayjs(formatted, 'YYYY-MM-DD', true).isValid();
    return isValid ? formatted : null;
  }

  if (dayjs(input, 'YYYY-MM-DD', true).isValid()) return input;

  return null;
};

export const handleKeyNavigation = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number,
    totalRows: number,
    totalCols: number,
    inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  ) => {
    const getRef = (r: number, c: number) => inputRefs.current[`${r}-${c}`];
    const isValid = (r: number, c: number) => {
      const input = getRef(r, c);
      return input && !input.disabled;
    };
  
    const move = (rDelta: number, cDelta: number) => {
      let r = rowIndex + rDelta;
      let c = colIndex + cDelta;
  
      while (r >= 0 && r < totalRows && c >= 0 && c < totalCols) {
        if (isValid(r, c)) {
          getRef(r, c)?.focus();
          break;
        }
        r += rDelta;
        c += cDelta;
      }
    };
  
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        move(0, 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        move(0, -1);
        break;
      case 'Tab':
      case 'ArrowDown':
      case 'Enter':
        e.preventDefault();
        move(1, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-1, 0);
        break;
      default:
        return;
    }
  };
