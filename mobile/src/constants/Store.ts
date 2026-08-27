export interface Transaction {
  id: string;
  name: string;
  cat: string;
  amount: number;
  when: string;
  day: string;
  note: string;
  photoUrl?: string;
}

export interface Budget {
  id?: string; // backend budget id — present once loaded from finance-service, needed to PATCH it
  name: string;
  limit: number;
  spent: number;
  rollover?: boolean;
}

export interface FuelLog {
  id: string;
  when: string;
  litres: number;
  cost: number;
  odo: number;
  eff: number;
  station: string;
}

export interface MaintenanceLog {
  id: string;
  name: string;
  when: string;
  odo: number;
  cost: number;
  next: string;
}

export interface Reminder {
  id: string;
  title: string;
  due: string;
  date: string;
  kind: 'urgent' | 'soon';
  iconName: string; // Map key for custom icons
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  year: number;
  fuelType: string;
  odo: number;
  primary: boolean;
  eff: number;
  costPerKm: number;
  spend: number;
  tone: string;
  range: number;
  photoUrl: string;
  fuel: FuelLog[];
  maintenance: MaintenanceLog[];
  reminders: Reminder[];
}

export interface VehicleExpense {
  id: string;
  vehicleId: string;
  type: 'insurance' | 'revenue_licence' | 'emission_test' | 'parking' | 'fine' | 'repair' | 'other';
  amount: number;
  when: string;
  note: string;
}

export interface StoreType {
  user: string;
  month: string;
  income: number;
  expenses: number;
  net: number;
  budget: { limit: number; used: number };
  transactions: Transaction[];
  categories: { name: string; amount: number; pct: number }[];
  budgets: Budget[];
  vehicles: Vehicle[];
  trend: { m: string; v: number }[];
  savingsRate: number;
  vehicleBreakdown: { label: string; v: number; color: string }[];
}

export const INITIAL_STORE: StoreType = {
  user: 'Kavya',
  month: 'June',
  income: 185000,
  expenses: 112400,
  net: 72600,
  budget: { limit: 130000, used: 112400 },

  transactions: [
    { id: 't1', name: 'Shell Fuel Station', cat: 'Fuel', amount: -6800, when: 'Today · 8:14 AM', day: 'Today', note: 'Full tank' },
    { id: 't2', name: 'Keells Super', cat: 'Shopping', amount: -4250, when: 'Today · 7:02 PM', day: 'Today', note: 'Groceries' },
    { id: 't3', name: 'Netflix', cat: 'Entertainment', amount: -1490, when: 'Yesterday', day: 'Yesterday', note: 'Monthly plan' },
    { id: 't4', name: 'Pizza Hut', cat: 'Food', amount: -3200, when: 'Yesterday', day: 'Yesterday', note: 'Family dinner' },
    { id: 't5', name: 'CEB Electricity', cat: 'Bills', amount: -5640, when: 'Jun 3', day: 'Jun 3', note: 'May bill' },
    { id: 't6', name: 'Pharmacy', cat: 'Health', amount: -2180, when: 'Jun 2', day: 'Jun 2', note: '' },
    { id: 't7', name: 'Monthly Salary', cat: 'Income', amount: 185000, when: 'Jun 1', day: 'Jun 1', note: 'Acme Pvt Ltd' },
    { id: 't8', name: 'Spotify', cat: 'Entertainment', amount: -990, when: 'Jun 1', day: 'Jun 1', note: '' },
    { id: 't9', name: 'Cafe Kumbuk', cat: 'Food', amount: -2450, when: 'May 31', day: 'May 31', note: 'Brunch' },
    { id: 't10', name: 'Dialog Reload', cat: 'Bills', amount: -1500, when: 'May 30', day: 'May 30', note: 'Data' },
  ],

  categories: [
    { name: 'Food', amount: 24600, pct: 0.34 },
    { name: 'Fuel', amount: 18200, pct: 0.25 },
    { name: 'Shopping', amount: 15300, pct: 0.21 },
    { name: 'Bills', amount: 8900, pct: 0.13 },
    { name: 'Entertainment', amount: 5400, pct: 0.07 },
  ],

  budgets: [
    { name: 'Food', limit: 30000, spent: 24600 },
    { name: 'Fuel', limit: 22000, spent: 18200 },
    { name: 'Shopping', limit: 18000, spent: 15300 },
    { name: 'Bills', limit: 12000, spent: 8900 },
    { name: 'Entertainment', limit: 8000, spent: 5400 },
  ],

  vehicles: [],

  trend: [
    { m: 'Jan', v: 88000 }, { m: 'Feb', v: 102000 }, { m: 'Mar', v: 79000 },
    { m: 'Apr', v: 115000 }, { m: 'May', v: 96000 }, { m: 'Jun', v: 112400 },
  ],
  savingsRate: 0.39,
  vehicleBreakdown: [
    { label: 'Fuel', v: 18200, color: '#C7F94B' },
    { label: 'Maintenance', v: 7800, color: '#FFAB91' },
    { label: 'Insurance', v: 2450, color: '#6EC6FF' },
  ],
};

// Currency helper
export const rs = (val: number) => {
  return 'Rs\u202F' + val.toLocaleString('en-US');
};

export const signRs = (val: number) => {
  const prefix = val > 0 ? '+' : '';
  const num = Math.abs(val);
  return `${prefix}Rs\u202F${num.toLocaleString('en-US')}`;
};
