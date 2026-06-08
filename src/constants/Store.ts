export interface Transaction {
  id: string;
  name: string;
  cat: string;
  amount: number;
  when: string;
  day: string;
  note: string;
}

export interface Budget {
  name: string;
  limit: number;
  spent: number;
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
  fuel: FuelLog[];
  maintenance: MaintenanceLog[];
  reminders: Reminder[];
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

  vehicles: [
    {
      id: 'v1', name: 'Toyota Aqua', plate: 'CAR-4821', year: 2017, fuelType: 'Hybrid',
      odo: 84210, primary: true, eff: 21.4, costPerKm: 13.8, spend: 28450, tone: '#C7F94B',
      range: 380,
      fuel: [
        { id: 'f1', when: 'Jun 6', litres: 28.4, cost: 6800, odo: 84210, eff: 21.4, station: 'Shell · Nugegoda' },
        { id: 'f2', when: 'May 28', litres: 30.1, cost: 7200, odo: 83602, eff: 20.2, station: 'IOC · Rajagiriya' },
        { id: 'f3', when: 'May 19', litres: 27.9, cost: 6680, odo: 82994, eff: 21.8, station: 'Shell · Nugegoda' },
        { id: 'f4', when: 'May 9', litres: 29.3, cost: 7010, odo: 82386, eff: 20.7, station: 'Lanka · Borella' },
      ],
      maintenance: [
        { id: 'm1', name: 'Engine oil change', when: 'May 2', odo: 81900, cost: 9800, next: 'Due at 86,900 km' },
        { id: 'm2', name: 'Tyre rotation', when: 'Apr 14', odo: 80100, cost: 1500, next: 'Due Aug 2026' },
        { id: 'm3', name: 'Brake pads (front)', when: 'Feb 20', odo: 76400, cost: 12400, next: '—' },
      ],
      reminders: [
        { id: 'r1', title: 'Insurance renewal', due: 'in 3 days', date: 'Jun 9', kind: 'urgent', iconName: 'Shield' },
        { id: 'r2', title: 'Revenue licence', due: 'in 6 days', date: 'Jun 12', kind: 'urgent', iconName: 'Doc' },
        { id: 'r3', title: 'Emission test', due: 'in 24 days', date: 'Jun 30', kind: 'soon', iconName: 'Receipt' },
        { id: 'r4', title: 'Next service', due: 'at 86,900 km', date: '~2,700 km', kind: 'soon', iconName: 'Wrench' },
      ],
    },
    {
      id: 'v2', name: 'Honda Dio', plate: 'BIKE-9930', year: 2021, fuelType: 'Petrol',
      odo: 18450, primary: false, eff: 45.2, costPerKm: 6.4, spend: 7200, tone: '#6EC6FF',
      range: 210,
      fuel: [
        { id: 'f5', when: 'Jun 4', litres: 4.2, cost: 1380, odo: 18450, eff: 45.2, station: 'Lanka · Borella' },
        { id: 'f6', when: 'May 22', litres: 4.0, cost: 1320, odo: 18260, eff: 44.1, station: 'IOC · Rajagiriya' },
      ],
      maintenance: [
        { id: 'm4', name: 'Engine oil change', when: 'Apr 30', odo: 17800, cost: 2200, next: 'Due at 20,800 km' },
      ],
      reminders: [
        { id: 'r5', title: 'Insurance renewal', due: 'in 41 days', date: 'Jul 17', kind: 'soon', iconName: 'Shield' },
      ],
    },
  ],

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
