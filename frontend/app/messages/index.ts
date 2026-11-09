import { auth } from './auth';
import { common } from './common';

type Messages = { ru: Record<string, string>; de: Record<string, string> };

const modules: Messages[] = [common, auth];

export const pageMessages: Messages = modules.reduce<Messages>(
  (all, module) => ({ ru: { ...all.ru, ...module.ru }, de: { ...all.de, ...module.de } }),
  { ru: {}, de: {} },
);
