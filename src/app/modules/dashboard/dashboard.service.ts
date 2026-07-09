import { Injectable } from '@angular/core';
import { db } from '../../core/database/db';

export interface DashboardSummary {
  monthlyIncome: number;
  pendingIncome: number;
  monthlyExpenses: number;
  expensesPaid: number;
  expensesPending: number;
  balance: number;
  pendingClients: { name: string; amount: number }[];
  pendingFixedExpenses: { name: string; amount: number }[];
  pendingMedications: { name: string; time: string }[];
  upcomingReminders: { title: string; date: string }[];
  upcomingMaintenances: { type: string; detail: string }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = now.toISOString().split('T')[0];

    // === INGRESOS ===
    // Sueldos del mes
    const salaries = await db.salaries
      .filter(s => {
        const d = new Date(s.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      })
      .toArray();
    const salaryIncome = salaries.reduce((sum, s) => sum + s.amount, 0);

    // Clientes SaaS
    const activeClients = await db.saasClients.where('status').equals('active').toArray();
    const saasPayments = await db.saasPayments
      .where('[month+year]')
      .equals([month, year])
      .toArray();
    const paidSaas = saasPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const monthlyIncome = salaryIncome + paidSaas;

    // Pendiente por cobrar
    const expectedSaas = activeClients.reduce((sum, c) => sum + c.monthlyAmount, 0);
    const pendingIncome = expectedSaas - paidSaas;

    // Clientes que no pagaron
    const paidClientIds = new Set(saasPayments.filter(p => p.status === 'paid').map(p => p.clientId));
    const pendingClients = activeClients
      .filter(c => !paidClientIds.has(c.id!))
      .map(c => ({ name: c.name, amount: c.monthlyAmount }));

    // === GASTOS ===
    // Gastos fijos mensuales
    const fixedExpenses = await db.fixedExpenses.toArray();
    const monthlyFixed = fixedExpenses.filter(e => e.frequency === 'monthly');
    const fixedTotal = monthlyFixed.reduce((sum, e) => sum + e.amount, 0);

    // Cuáles ya se pagaron este mes
    const fixedPayments = await db.fixedExpensePayments
      .where('[month+year]')
      .equals([month, year])
      .toArray();
    const paidFixedIds = new Set(fixedPayments.map(p => p.expenseId));
    const fixedPaid = monthlyFixed
      .filter(e => paidFixedIds.has(e.id!))
      .reduce((sum, e) => sum + e.amount, 0);
    const fixedPending = fixedTotal - fixedPaid;

    // Gastos fijos pendientes (lista)
    const pendingFixedExpenses = monthlyFixed
      .filter(e => !paidFixedIds.has(e.id!))
      .map(e => ({ name: e.name, amount: e.amount }));

    // Gastos variables del mes
    const variableExpenses = await db.variableExpenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      })
      .toArray();
    const variableTotal = variableExpenses.reduce((sum, e) => sum + e.amount, 0);

    const monthlyExpenses = fixedTotal + variableTotal;
    const expensesPaid = fixedPaid + variableTotal;
    const expensesPending = fixedPending;

    // === MEDICAMENTOS ===
    const medications = await db.medications
      .filter(m => {
        const active = !m.endDate || m.endDate >= today;
        return active && m.startDate <= today;
      })
      .toArray();

    const todayLogs = await db.medicationLogs
      .where('date')
      .equals(today)
      .toArray();

    const takenIds = new Set(todayLogs.filter(l => l.taken).map(l => l.medicationId));
    const pendingMedications = medications
      .filter(m => !takenIds.has(m.id!))
      .map(m => ({ name: m.name, time: m.time }));

    // === VEHÍCULO ===
    const vehicles = await db.vehicles.toArray();
    const vehicle = vehicles[0];
    let upcomingMaintenances: { type: string; detail: string }[] = [];

    if (vehicle) {
      const maintenances = await db.maintenances
        .where('vehicleId')
        .equals(vehicle.id!)
        .toArray();

      // Último mantenimiento por tipo con próximo programado
      const latestByType = new Map<string, any>();
      for (const m of maintenances) {
        if (m.nextDate || m.nextKm) {
          if (!latestByType.has(m.type) || m.date > latestByType.get(m.type).date) {
            latestByType.set(m.type, m);
          }
        }
      }

      for (const [type, m] of latestByType) {
        const overdueDate = m.nextDate && m.nextDate < today;
        const overdueKm = m.nextKm && vehicle.currentKm >= m.nextKm;
        const soonDate = m.nextDate && !overdueDate &&
          m.nextDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const soonKm = m.nextKm && !overdueKm && (m.nextKm - vehicle.currentKm) <= 1000;

        if (overdueDate || overdueKm || soonDate || soonKm) {
          let detail = '';
          if (overdueDate || overdueKm) detail = '⚠️ Vencido';
          else if (m.nextDate) detail = m.nextDate;
          else if (m.nextKm) detail = `${m.nextKm} km`;
          upcomingMaintenances.push({ type, detail });
        }
      }
    }

    // === RECORDATORIOS ===
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    let upcomingReminders: { title: string; date: string }[] = [];
    try {
      const reminders = await db.reminders
        .where('completed')
        .equals(0)
        .filter(r => r.date >= today && r.date <= nextWeek)
        .toArray();
      upcomingReminders = reminders.map(r => ({ title: r.title, date: r.date }));
    } catch { }

    return {
      monthlyIncome,
      pendingIncome,
      monthlyExpenses,
      expensesPaid,
      expensesPending,
      balance: monthlyIncome - monthlyExpenses,
      pendingClients,
      pendingFixedExpenses,
      pendingMedications,
      upcomingReminders,
      upcomingMaintenances,
    };
  }
}
