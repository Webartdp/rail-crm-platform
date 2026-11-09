import type { WorkOrder } from './work-orders';

export type OrderDetails = {
  object_name?: string;
  object_address?: string;
  customer_name?: string;
  work_title?: string;
  leistungsart?: string;
  zugnummer?: string;
  einsatzort?: string;
};

/** work_orders.details is JSON (string or object) holding object/customer/work data. */
export function orderDetails(order?: Pick<WorkOrder, 'details'> | null): OrderDetails {
  const details = order?.details;
  if (!details) return {};
  if (typeof details === 'object') return details as OrderDetails;
  try {
    return JSON.parse(details) as OrderDetails;
  } catch {
    return {};
  }
}
