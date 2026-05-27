import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .regex(/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]*$/, 'Пароль должен содержать только латинские буквы, цифры и спецсимволы')
  .regex(/[a-zA-Z]/, 'Пароль должен содержать хотя бы одну латинскую букву')
  .regex(/[0-9]/, 'Пароль должен содержать хотя бы одну цифру');

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak';

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

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
