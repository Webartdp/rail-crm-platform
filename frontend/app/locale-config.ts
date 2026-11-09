// Shared by server (layout) and client code. Must NOT have 'use client'.
export type Locale = 'ru' | 'de';
export const LOCALES: Locale[] = ['de', 'ru'];
export const DEFAULT_LOCALE: Locale = 'de';
export const LOCALE_STORAGE_KEY = 'rail-crm-locale';
export const LOCALE_COOKIE = 'rail-crm-locale';

export function isLocale(value: unknown): value is Locale {
  return value === 'ru' || value === 'de';
}
