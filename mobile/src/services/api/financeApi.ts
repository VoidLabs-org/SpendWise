import { GATEWAY_API_URL } from '@/constants/api';
import { getAccessToken } from '@/services/auth/tokenStorage';
import { Transaction, Budget } from '@/constants/Store';

// ---- Backend JSON shapes (services/finance-service/internal/finance) ----

export interface BackendTransaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string;
  photo_url?: string;
  source?: string | null;
  occurred_at: string;
  created_at: string;
}

export interface BackendCategory {
  id: string;
  user_id?: string | null;
  name: string;
  icon: string;
  color: string;
  archived: boolean;
}

export interface BackendBudget {
  id: string;
  user_id: string;
  category: string;
  limit_amount: number;
  month: string;
  rollover: boolean;
  last_alert_threshold: number;
  spent: number;
}

export interface MonthlyReport {
  month: string;
  income: number;
  expenses: number;
  savings_rate: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
}

export interface TrendPoint {
  month: string;
  expenses: number;
}

export interface VehicleCostReport {
  month: string;
  total: number;
}

export interface VehicleCategoryAmount {
  category: string;
  amount: number;
}

export interface BackendRecurringTransaction {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  note: string;
  photo_url?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  next_occurrence: string;
  created_at: string;
}

// ---- request helper (identical pattern to vehicleApi.ts) ----

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${GATEWAY_API_URL}${path}`, {
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

// ---- transactions ----

export interface TransactionInput {
  amount: number;
  category: string;
  note?: string;
  photo_url?: string;
  occurred_at?: string;
}

export function listTransactions(filter?: { category?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filter?.category) params.set('category', filter.category);
  if (filter?.from) params.set('from', filter.from);
  if (filter?.to) params.set('to', filter.to);
  const qs = params.toString();
  return request<BackendTransaction[]>(`/finance/transactions${qs ? `?${qs}` : ''}`);
}

export function createTransaction(input: TransactionInput) {
  return request<BackendTransaction>('/finance/transactions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTransaction(id: string, input: TransactionInput) {
  return request<BackendTransaction>(`/finance/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteTransaction(id: string) {
  return request<void>(`/finance/transactions/${id}`, { method: 'DELETE' });
}

// ---- recurring transactions ----

export interface RecurringTransactionInput {
  amount: number;
  category: string;
  note?: string;
  photo_url?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
}

export function listRecurring() {
  return request<BackendRecurringTransaction[]>('/finance/recurring');
}

export function createRecurring(input: RecurringTransactionInput) {
  return request<BackendRecurringTransaction>('/finance/recurring', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteRecurring(id: string) {
  return request<void>(`/finance/recurring/${id}`, { method: 'DELETE' });
}

// ---- categories ----

export interface CategoryInput {
  name: string;
  icon?: string;
  color?: string;
}

export function listCategories(includeArchived = false) {
  return request<BackendCategory[]>(`/finance/categories${includeArchived ? '?include_archived=true' : ''}`);
}

export function createCategory(input: CategoryInput) {
  return request<BackendCategory>('/finance/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function patchCategory(id: string, patch: { icon?: string; color?: string; archived?: boolean }) {
  return request<BackendCategory>(`/finance/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// ---- budgets ----

export interface BudgetInput {
  category: string;
  limit_amount: number;
  month: string;
  rollover?: boolean;
}

export function listBudgets(month?: string) {
  return request<BackendBudget[]>(`/finance/budgets${month ? `?month=${month}` : ''}`);
}

export function createBudget(input: BudgetInput) {
  return request<BackendBudget>('/finance/budgets', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function patchBudget(id: string, patch: { limit_amount?: number; rollover?: boolean }) {
  return request<BackendBudget>(`/finance/budgets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// ---- reports ----

export function getMonthlyReport(month?: string) {
  return request<MonthlyReport>(`/finance/reports/monthly${month ? `?month=${month}` : ''}`);
}

export function getCategoryBreakdown(month?: string) {
  return request<CategoryBreakdown[]>(`/finance/reports/categories${month ? `?month=${month}` : ''}`);
}

export function getTrend(month?: string) {
  return request<TrendPoint[]>(`/finance/reports/trend${month ? `?month=${month}` : ''}`);
}

export function getVehicleCostReport(month?: string) {
  return request<VehicleCostReport>(`/finance/reports/vehicle-cost${month ? `?month=${month}` : ''}`);
}

export function getVehicleBreakdown(month?: string) {
  return request<VehicleCategoryAmount[]>(`/finance/reports/vehicle-breakdown${month ? `?month=${month}` : ''}`);
}

// ---- mapping backend shapes onto the app's existing display types ----

function dayBucket(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWhen(iso: string): string {
  const bucket = dayBucket(iso);
  const time = new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return bucket === 'Today' || bucket === 'Yesterday' ? `${bucket} · ${time}` : bucket;
}

/** The mobile Transaction type has no field distinct from category for a display "name" —
 * AddTransactionSheet already sets name = category (or 'Income'), so mirroring that here
 * keeps behavior identical to before the API was wired up. */
export function mapTransaction(t: BackendTransaction): Transaction {
  return {
    id: t.id,
    name: t.category,
    cat: t.category,
    amount: t.amount,
    when: formatWhen(t.occurred_at),
    day: dayBucket(t.occurred_at),
    note: t.note,
    photoUrl: t.photo_url || undefined,
  };
}

export function mapBudget(b: BackendBudget): Budget {
  return { id: b.id, name: b.category, limit: b.limit_amount, spent: b.spent, rollover: b.rollover };
}

export async function listTransactionsMapped(): Promise<Transaction[]> {
  const list = await listTransactions();
  return list.map(mapTransaction);
}

export async function listBudgetsMapped(month?: string): Promise<Budget[]> {
  const list = await listBudgets(month);
  return list.map(mapBudget);
}

const MONTH_SHORT_LABEL: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

/** Maps a "YYYY-MM" trend point to the { m, v } shape TrendChart already renders. */
export async function getTrendMapped(month?: string): Promise<{ m: string; v: number }[]> {
  const points = await getTrend(month);
  return points.map((p) => ({ m: MONTH_SHORT_LABEL[p.month.slice(5, 7)] || p.month, v: p.expenses }));
}

const VEHICLE_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  fuel: { label: 'Fuel', color: '#C7F94B' },
  maintenance: { label: 'Maintenance', color: '#FFAB91' },
  insurance: { label: 'Insurance', color: '#6EC6FF' },
  revenue_licence: { label: 'Revenue Licence', color: '#CE93D8' },
  emission_test: { label: 'Emission Test', color: '#80CBC4' },
  parking: { label: 'Parking', color: '#FFE082' },
  fine: { label: 'Fines', color: '#EF9A9A' },
  repair: { label: 'Repairs', color: '#90CAF9' },
};
const OTHER_VEHICLE_CATEGORY = { label: 'Other', color: '#B0BEC5' };

/** Maps the backend's {category, amount} rows onto the { label, v, color } shape the vehicle
 * cost card renders — label/color are a display-only concern the backend doesn't need to know
 * about, so they're assigned here from a fixed palette keyed by the vehicle expense subtype. */
export async function getVehicleBreakdownMapped(month?: string): Promise<{ label: string; v: number; color: string }[]> {
  const rows = await getVehicleBreakdown(month);
  return rows
    .filter((r) => r.amount > 0)
    .map((r) => {
      const meta = VEHICLE_CATEGORY_LABELS[r.category] || OTHER_VEHICLE_CATEGORY;
      return { label: meta.label, v: r.amount, color: meta.color };
    });
}
