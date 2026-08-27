export type DateFormatPref = 'DD/MM/YYYY' | 'MM/DD/YYYY';

// Module-level (not React state) because financeApi.ts/vehicleApi.ts format dates in plain
// mapping functions outside the component tree — index.tsx pushes the current preference in
// here on boot and whenever it changes, rather than threading it through every call site.
let preference: DateFormatPref = 'DD/MM/YYYY';

export function setDateFormatPreference(pref: DateFormatPref) {
  preference = pref;
}

export function getDateFormatPreference(): DateFormatPref {
  return preference;
}

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** A short date like "3 Jun" (day-first) or "Jun 3" (month-first), matching the preference —
 * replaces ad-hoc `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` calls. */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = MONTH_ABBR[d.getMonth()];
  return preference === 'DD/MM/YYYY' ? `${day} ${month}` : `${month} ${day}`;
}

/** A full numeric date like "03/06/2026" or "06/03/2026", matching the preference. */
export function formatFullDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return preference === 'DD/MM/YYYY' ? `${dd}/${mm}/${yyyy}` : `${mm}/${dd}/${yyyy}`;
}
