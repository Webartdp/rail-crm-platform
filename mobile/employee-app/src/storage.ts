import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';

const TOKEN_KEY = 'rail_crm_mobile_token';
const LOCALE_KEY = 'rail_crm_mobile_locale';

/** Login token lives in the device keychain / keystore. */
export const tokenStore = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

export async function getSavedLocale(): Promise<'de' | 'ru' | null> {
  try {
    const value = await SecureStore.getItemAsync(LOCALE_KEY);
    return value === 'de' || value === 'ru' ? value : null;
  } catch {
    return null;
  }
}

export async function saveLocale(locale: 'de' | 'ru') {
  try {
    await SecureStore.setItemAsync(LOCALE_KEY, locale);
  } catch {
    // not critical
  }
}

/**
 * Small JSON files in the app's document folder: last loaded data (so the app
 * opens without a connection) and the offline queue.
 */
function jsonFile(name: string) {
  return new File(Paths.document, `rail-crm-${name}.json`);
}

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const file = jsonFile(name);
    if (!file.exists) return fallback;
    return JSON.parse(await file.text()) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, value: unknown) {
  try {
    const file = jsonFile(name);
    if (!file.exists) file.create();
    file.write(JSON.stringify(value));
  } catch {
    // storage full or unavailable: the app keeps working online
  }
}

export function removeJson(name: string) {
  try {
    const file = jsonFile(name);
    if (file.exists) file.delete();
  } catch {
    // ignore
  }
}

/** Cached server data is per user; wipe it on logout. */
export const CACHE_FILES = ['me', 'orders', 'field-states', 'events', 'timesheet'];

export function clearCache() {
  CACHE_FILES.forEach(removeJson);
}
