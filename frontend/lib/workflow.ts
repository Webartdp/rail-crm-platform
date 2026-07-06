import { workEventRoutes } from './api';

export const workflowSteps = [
  { label: 'Gasfahrt', route: workEventRoutes.gasfahrtStart },
  { label: 'Gasfahrt beendet', route: workEventRoutes.gasfahrtStop },
  { label: 'Dienstbeginn', route: workEventRoutes.dienstbeginn },
  { label: 'Stop', route: workEventRoutes.arbeitStop },
  { label: 'Start Dienstfahrt', route: workEventRoutes.dienstfahrtStart },
  { label: 'Stop Dienstfahrt', route: workEventRoutes.dienstfahrtStop },
];
