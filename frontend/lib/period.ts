// Date helpers for period filters (local calendar dates, YYYY-MM-DD).
function iso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso() {
  return iso(new Date());
}

export function monthStartIso(offset = 0) {
  const now = new Date();
  return iso(new Date(now.getFullYear(), now.getMonth() + offset, 1));
}

export function monthEndIso(offset = 0) {
  const now = new Date();
  return iso(new Date(now.getFullYear(), now.getMonth() + offset + 1, 0));
}
