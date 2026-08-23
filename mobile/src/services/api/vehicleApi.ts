import { VEHICLE_API_URL } from '@/constants/api';
import { getAccessToken } from '@/services/auth/tokenStorage';
import { Vehicle, FuelLog, MaintenanceLog, Reminder } from '@/constants/Store';

// ---- Backend JSON shapes (services/vehicle-service/internal/vehicle) ----

export interface BackendVehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  plate_number: string;
  fuel_type: string;
  odometer: number;
  photo_url: string;
  is_primary: boolean;
  eff: number;
  cost_per_km: number;
  estimated_range_km: number;
  created_at: string;
}

export interface BackendFuelLog {
  id: string;
  vehicle_id: string;
  date: string;
  litres: number;
  cost: number;
  odometer: number;
  station: string;
  efficiency_km_l: number;
  cost_per_km: number;
  estimated_range_km: number;
  efficiency_drop_detected: boolean;
  created_at: string;
}

export interface BackendMaintenanceLog {
  id: string;
  vehicle_id: string;
  service_name: string;
  date: string;
  odometer: number;
  cost: number;
  next_due_date: string | null;
  next_due_odometer: number;
  receipt_url: string;
  created_at: string;
}

export type VehicleExpenseType =
  | 'insurance'
  | 'revenue_licence'
  | 'emission_test'
  | 'parking'
  | 'fine'
  | 'repair'
  | 'other';

export interface BackendVehicleExpense {
  id: string;
  vehicle_id: string;
  type: VehicleExpenseType;
  amount: number;
  date: string;
  note: string;
  created_at: string;
}

export type ReminderKind = 'insurance' | 'revenue_licence' | 'emission_test' | 'service' | 'custom';

export interface BackendReminder {
  id: string;
  vehicle_id: string;
  title: string;
  kind: ReminderKind;
  due_date: string | null;
  due_odometer: number;
  notify_days_before: number;
  created_at: string;
}

export interface CostOfOwnership {
  total: number;
  entries: { date: string; category: string; amount: number; running_total: number }[];
}

// ---- request helper ----

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${VEHICLE_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

// ---- vehicles ----

export interface VehicleInput {
  make: string;
  model: string;
  year: number;
  plate_number: string;
  fuel_type: string;
  odometer: number;
  photo_url?: string;
}

export function listVehicles() {
  return request<BackendVehicle[]>('/vehicle/vehicles');
}

export function getVehicle(id: string) {
  return request<BackendVehicle>(`/vehicle/vehicles/${id}`);
}

export function createVehicle(input: VehicleInput) {
  return request<BackendVehicle>('/vehicle/vehicles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateVehicle(id: string, input: VehicleInput) {
  return request<BackendVehicle>(`/vehicle/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteVehicle(id: string) {
  return request<void>(`/vehicle/vehicles/${id}`, { method: 'DELETE' });
}

export function setPrimaryVehicle(id: string) {
  return request<BackendVehicle>(`/vehicle/vehicles/${id}/primary`, { method: 'POST' });
}

// ---- fuel logs ----

export interface FuelLogInput {
  date?: string;
  litres: number;
  cost: number;
  odometer: number;
  station?: string;
}

export function listFuelLogs(vehicleId: string) {
  return request<BackendFuelLog[]>(`/vehicle/vehicles/${vehicleId}/fuel`);
}

export function createFuelLog(vehicleId: string, input: FuelLogInput) {
  return request<BackendFuelLog>(`/vehicle/vehicles/${vehicleId}/fuel`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteFuelLog(id: string) {
  return request<void>(`/vehicle/fuel/${id}`, { method: 'DELETE' });
}

// ---- maintenance logs ----

export interface MaintenanceLogInput {
  service_name: string;
  date?: string;
  odometer: number;
  cost: number;
  next_due_date?: string;
  next_due_odometer?: number;
  receipt_url?: string;
}

export function listMaintenanceLogs(vehicleId: string) {
  return request<BackendMaintenanceLog[]>(`/vehicle/vehicles/${vehicleId}/maintenance`);
}

export function createMaintenanceLog(vehicleId: string, input: MaintenanceLogInput) {
  return request<BackendMaintenanceLog>(`/vehicle/vehicles/${vehicleId}/maintenance`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteMaintenanceLog(id: string) {
  return request<void>(`/vehicle/maintenance/${id}`, { method: 'DELETE' });
}

// ---- expenses ----

export interface ExpenseInput {
  type: VehicleExpenseType;
  amount: number;
  date?: string;
  note?: string;
}

export function listExpenses(vehicleId: string) {
  return request<BackendVehicleExpense[]>(`/vehicle/vehicles/${vehicleId}/expenses`);
}

export function createExpense(vehicleId: string, input: ExpenseInput) {
  return request<BackendVehicleExpense>(`/vehicle/vehicles/${vehicleId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteExpense(id: string) {
  return request<void>(`/vehicle/expenses/${id}`, { method: 'DELETE' });
}

// ---- reminders ----

export interface ReminderInput {
  title: string;
  kind: ReminderKind;
  due_date?: string;
  due_odometer?: number;
  notify_days_before?: number;
}

export function listReminders(vehicleId: string) {
  return request<BackendReminder[]>(`/vehicle/vehicles/${vehicleId}/reminders`);
}

export function createReminder(vehicleId: string, input: ReminderInput) {
  return request<BackendReminder>(`/vehicle/vehicles/${vehicleId}/reminders`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateReminder(id: string, input: ReminderInput) {
  return request<BackendReminder>(`/vehicle/reminders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteReminder(id: string) {
  return request<void>(`/vehicle/reminders/${id}`, { method: 'DELETE' });
}

// ---- analytics ----

export function getCostOfOwnership(vehicleId: string) {
  return request<CostOfOwnership>(`/vehicle/vehicles/${vehicleId}/analytics/cost-of-ownership`);
}

// ---- mapping backend shapes onto the app's existing display types ----

const TONE_PALETTE = ['#C7F94B', '#6EC6FF', '#FFAB91', '#CE93D8', '#80CBC4', '#FFE082'];

function toneForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TONE_PALETTE[hash % TONE_PALETTE.length];
}

function formatShortDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

function dueLabel(reminder: BackendReminder) {
  const days = daysUntil(reminder.due_date);
  if (days !== null) {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'today';
    return `in ${days} day${days === 1 ? '' : 's'}`;
  }
  if (reminder.due_odometer > 0) return `at ${reminder.due_odometer.toLocaleString()} km`;
  return '—';
}

const REMINDER_ICON_BY_KIND: Record<ReminderKind, string> = {
  insurance: 'Shield',
  revenue_licence: 'Doc',
  emission_test: 'Receipt',
  service: 'Wrench',
  custom: 'Star',
};

export function mapFuelLog(f: BackendFuelLog): FuelLog {
  return {
    id: f.id,
    when: formatShortDate(f.date),
    litres: f.litres,
    cost: f.cost,
    odo: f.odometer,
    eff: Math.round(f.efficiency_km_l * 10) / 10,
    station: f.station || '—',
  };
}

export function mapMaintenanceLog(m: BackendMaintenanceLog): MaintenanceLog {
  const next = m.next_due_date
    ? `Due ${formatShortDate(m.next_due_date)}`
    : m.next_due_odometer > 0
      ? `Due at ${m.next_due_odometer.toLocaleString()} km`
      : '—';
  return {
    id: m.id,
    name: m.service_name,
    when: formatShortDate(m.date),
    odo: m.odometer,
    cost: m.cost,
    next,
  };
}

export function mapReminder(r: BackendReminder): Reminder {
  const days = daysUntil(r.due_date);
  return {
    id: r.id,
    title: r.title,
    due: dueLabel(r),
    date: r.due_date ? formatShortDate(r.due_date) : '—',
    kind: days !== null && days <= (r.notify_days_before || 7) ? 'urgent' : 'soon',
    iconName: REMINDER_ICON_BY_KIND[r.kind] || 'Star',
  };
}

/** Assembles a backend vehicle plus its fuel/maintenance/reminders/cost data into the
 * shape ScreenVehicles / ScreenVehicleDetail already render, so those screens don't
 * need to change. */
export async function getVehicleDetail(vehicleId: string): Promise<Vehicle> {
  const [v, fuel, maintenance, reminders, cost] = await Promise.all([
    getVehicle(vehicleId),
    listFuelLogs(vehicleId),
    listMaintenanceLogs(vehicleId),
    listReminders(vehicleId),
    getCostOfOwnership(vehicleId).catch(() => ({ total: 0, entries: [] })),
  ]);
  return {
    id: v.id,
    name: `${v.make} ${v.model}`.trim(),
    plate: v.plate_number,
    year: v.year,
    fuelType: v.fuel_type,
    odo: v.odometer,
    primary: v.is_primary,
    eff: v.eff,
    costPerKm: v.cost_per_km,
    spend: cost.total,
    tone: toneForId(v.id),
    range: v.estimated_range_km,
    photoUrl: v.photo_url,
    fuel: fuel.map(mapFuelLog),
    maintenance: maintenance.map(mapMaintenanceLog),
    reminders: reminders.map(mapReminder),
  };
}

export async function listVehiclesWithDetail(): Promise<Vehicle[]> {
  const vehicles = await listVehicles();
  return Promise.all(vehicles.map((v) => getVehicleDetail(v.id)));
}
