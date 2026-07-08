import Dexie, { type Table } from 'dexie';

export interface Salary {
  id?: number;
  company: string;
  amount: number;
  date: string;
  notes: string;
}

export interface SaasClient {
  id?: number;
  name: string;
  company: string;
  monthlyAmount: number;
  status: 'active' | 'inactive' | 'paused';
  notes: string;
}

export interface SaasPayment {
  id?: number;
  clientId: number;
  month: number;
  year: number;
  amount: number;
  paidAt: string | null;
  status: 'paid' | 'pending';
}

export interface FixedExpense {
  id?: number;
  name: string;
  category: string;
  amount: number;
  frequency: 'monthly' | 'yearly' | 'weekly' | 'biweekly';
  nextPayment: string;
  reminder: boolean;
}

export interface VariableExpense {
  id?: number;
  category: string;
  amount: number;
  date: string;
  description: string;
  receipt?: string;
}

export interface Medication {
  id?: number;
  name: string;
  dose: string;
  frequency: string;
  time: string;
  startDate: string;
  endDate: string | null;
  notes: string;
}

export interface MedicationLog {
  id?: number;
  medicationId: number;
  date: string;
  taken: boolean;
}

export interface Contact {
  id?: number;
  name: string;
  company: string;
  position: string;
  phone: string;
  email: string;
  web: string;
  photoFront?: string;
  photoBack?: string;
  notes: string;
}

export interface Vehicle {
  id?: number;
  brand: string;
  model: string;
  year: number;
  plate: string;
  currentKm: number;
}

export interface Maintenance {
  id?: number;
  vehicleId: number;
  type: string;
  date: string;
  km: number;
  cost: number;
  notes: string;
  nextDate: string | null;
  nextKm: number | null;
}

export interface Reminder {
  id?: number;
  module: string;
  referenceId: number | null;
  title: string;
  date: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  completed: boolean;
}

class AppDatabase extends Dexie {
  salaries!: Table<Salary>;
  saasClients!: Table<SaasClient>;
  saasPayments!: Table<SaasPayment>;
  fixedExpenses!: Table<FixedExpense>;
  variableExpenses!: Table<VariableExpense>;
  medications!: Table<Medication>;
  medicationLogs!: Table<MedicationLog>;
  contacts!: Table<Contact>;
  vehicles!: Table<Vehicle>;
  maintenances!: Table<Maintenance>;
  reminders!: Table<Reminder>;

  constructor() {
    super('LifeDashboard');

    this.version(1).stores({
      salaries: '++id, company, date',
      saasClients: '++id, name, status',
      saasPayments: '++id, clientId, [month+year], status',
      fixedExpenses: '++id, category, nextPayment',
      variableExpenses: '++id, category, date',
      medications: '++id, name',
      medicationLogs: '++id, medicationId, date',
      contacts: '++id, name, company',
      vehicles: '++id',
      maintenances: '++id, vehicleId, type, date',
      reminders: '++id, module, date, completed',
    });
  }
}

export const db = new AppDatabase();
