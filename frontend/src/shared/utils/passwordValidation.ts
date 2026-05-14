import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .regex(/[a-zA-Zа-яА-Я]/, 'Должна быть хотя бы одна буква')
  .regex(/[0-9]/, 'Должна быть хотя бы одна цифра');

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-zа-я]/.test(password)) score++;
  if (/[A-ZА-Я]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Zа-яА-Я0-9]/.test(password)) score++;

  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

export const STRENGTH_LABELS: Record<PasswordStrength, string> = {
  weak: 'Слабый',
  medium: 'Средний',
  strong: 'Надёжный',
};

export const STRENGTH_COLORS: Record<PasswordStrength, 'error' | 'warning' | 'success'> = {
  weak: 'error',
  medium: 'warning',
  strong: 'success',
};
