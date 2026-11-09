import { auth } from './auth';
import { billing } from './billing';
import { common } from './common';
import { directory } from './directory';
import { documents } from './documents';
import { employees } from './employees';
import { reports } from './reports';
import { workday } from './workday';

type Messages = { ru: Record<string, string>; de: Record<string, string> };

const modules: Messages[] = [common, auth, reports, billing, documents, employees, workday, directory];

export const pageMessages: Messages = modules.reduce<Messages>(
  (all, module) => ({ ru: { ...all.ru, ...module.ru }, de: { ...all.de, ...module.de } }),
  { ru: {}, de: {} },
);
