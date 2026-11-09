'use client';

import { useMemo } from 'react';
import { useI18n } from '../i18n';
import { employeeProfileName, type EmployeeProfile } from '../../lib/employee-profiles';
import { orderDetails } from '../../lib/order-details';
import { orderEmployeeIds, type WorkOrder } from '../../lib/work-orders';

function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function weekStart(dateIso: string) {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const shift = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - shift);
  return iso(date);
}

export function addDays(dateIso: string, days: number) {
  const [y, m, d] = dateIso.split('-').map(Number);
  return iso(new Date(y, m - 1, d + days));
}

function toMs(value?: string | null) {
  return value ? new Date(value.replace(' ', 'T')).getTime() : 0;
}

/**
 * Shift plan: employees × days of one week. Each cell lists the planned orders;
 * overlapping orders of one employee are flagged. An empty cell opens a new order for that day.
 */
export default function WeekPlanner({ start, orders, employees }: { start: string; orders: WorkOrder[]; employees: EmployeeProfile[] }) {
  const { t, fmt, localeCode } = useI18n();
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(start, index)), [start]);
  const todayIso = iso(new Date());

  const activeEmployees = useMemo(
    () => employees
      .filter((employee) => employee.is_active !== false && employee.is_active !== 0)
      .sort((a, b) => employeeProfileName(a).localeCompare(employeeProfileName(b))),
    [employees],
  );

  // employeeId -> date -> orders
  const grid = useMemo(() => {
    const map = new Map<number, Map<string, WorkOrder[]>>();
    orders.forEach((order) => {
      const date = (order.planned_start_at || '').slice(0, 10);
      if (!date || date < days[0] || date > days[6]) return;
      orderEmployeeIds(order).forEach((employeeId) => {
        const byDay = map.get(employeeId) || new Map<string, WorkOrder[]>();
        byDay.set(date, [...(byDay.get(date) || []), order].sort((a, b) => String(a.planned_start_at).localeCompare(String(b.planned_start_at))));
        map.set(employeeId, byDay);
      });
    });
    return map;
  }, [orders, days]);

  function conflicts(list: WorkOrder[]) {
    const ids = new Set<number>();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (toMs(list[j].planned_start_at) < toMs(list[i].planned_end_at)) {
          ids.add(list[i].id);
          ids.add(list[j].id);
        }
      }
    }
    return ids;
  }

  const weekdayFormat = new Intl.DateTimeFormat(localeCode, { weekday: 'short' });
  const dayFormat = new Intl.DateTimeFormat(localeCode, { day: '2-digit', month: '2-digit' });

  return (
    <div className="planner-scroll">
      <table className="planner">
        <thead>
          <tr>
            <th className="planner-corner">{t('commonEmployee')}</th>
            {days.map((day) => {
              const date = new Date(`${day}T12:00:00`);
              const weekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <th key={day} className={`${day === todayIso ? 'is-today' : ''} ${weekend ? 'is-weekend' : ''}`}>
                  <span>{weekdayFormat.format(date)}</span>
                  <strong>{dayFormat.format(date)}</strong>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {activeEmployees.map((employee) => {
            const byDay = grid.get(employee.id);
            const weekMinutes = days.reduce((sum, day) => sum + (byDay?.get(day) || []).reduce((acc, order) => acc + Math.max(0, (toMs(order.planned_end_at) - toMs(order.planned_start_at)) / 60000), 0), 0);
            return (
              <tr key={employee.id}>
                <th className="planner-employee">
                  <strong>{employeeProfileName(employee)}</strong>
                  <small>{weekMinutes ? t('plannerWeekHours', { hours: fmt.number(weekMinutes / 60, 1) }) : t('plannerFree')}</small>
                </th>
                {days.map((day) => {
                  const list = byDay?.get(day) || [];
                  const clash = conflicts(list);
                  return (
                    <td key={day} className={day === todayIso ? 'is-today' : ''}>
                      {list.map((order) => {
                        const details = orderDetails(order);
                        return (
                          <a className={`planner-shift ${clash.has(order.id) ? 'is-clash' : ''} status-${order.status || 'planned'}`} href={`/work-orders/${order.id}`} key={order.id} title={clash.has(order.id) ? t('plannerClash') : undefined}>
                            <span>{fmt.time(order.planned_start_at)}–{fmt.time(order.planned_end_at)}</span>
                            <strong>{details.object_name || details.work_title || order.title}</strong>
                            <small>{details.customer_name || ''}</small>
                          </a>
                        );
                      })}
                      <a className="planner-add" href={`/work-orders/new?date=${day}&employee=${employee.id}`} aria-label={t('plannerAdd', { name: employeeProfileName(employee), date: fmt.date(day) })}>+</a>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!activeEmployees.length ? <p className="empty-state">{t('empNone')}</p> : null}
    </div>
  );
}
