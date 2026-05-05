import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Composes Tailwind classes safely — clsx handles conditionals,
// twMerge resolves conflicts (e.g. "px-2 px-4" → "px-4"). Standard
// shadcn/ui utility wired into every primitive's variant API.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
