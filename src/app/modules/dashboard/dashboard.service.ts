import { Injectable } from '@angular/core';
import { db } from '../../core/database/db';

export interface DashboardSummary {
  monthlyIncome: number;
  pendingIncome: number;
  monthlyExpenses: number;
  balance: number;
  upcomingPayments: { name: string; amount: number }[];
  pendingMedications: { name: string; time: string }[];
  pendingClients: { name: string; amount: number }[];
  upcomingReminders: { title: string; date: string }[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const today = now.toISOString().split('T')[0];

    // Ingresos del mes (sueldos)
    const salaries = await db.salaries
      .filter(s => {
        const d = new Date(s.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      })
      .toArray();
    const salaryIncome = salaries.reduce((sum, s) => sum + s.amount, 0);

    // Pagos SaaS del mes
    const activeClients = await db.saasClients.where('status').equals('active').toArray();
    const expectedSaas = activeClients.reduce((sum, c) => sum + c.monthlyAmount, 0);

    const payments = await db.saasPayments
      .where({ month, year })
      .toArray();
    const paidIncome = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingIncome = expectedSaas - paidIncome;

    // Gastos del mes
    const fixedExpenses = await db.fixedExpenses.toArray();
    const fixedTotal = fixedExpenses
      .filter(e => e.frequency === 'monthly')
      .reduce((sum, e) => sum + e.amount, 0);

    const variableExpenses = await db.variableExpenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      })
      .toArray();
    const variableTotal = variableExpenses.reduce((sum, e) => sum + e.amount, 0);

    const monthlyExpenses = fixedTotal + variableTotal;
    const monthlyIncome = salaryIncome + paidIncome;

    // Clientes SaaS pendientes de cobro
    const paidClientIds = new Set(payments.filter(p => p.status === 'paid').map(p => p.clientId));
    const pendingClients = activeClients
      .filter(c => !paidClientIds.has(c.id!))
      .map(c => ({ name: c.name, amount: c.monthlyAmount }));

    // Próximos pagos (gastos fijos próximos 7 días)
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const upcomingPayments = fixedExpenses
      .filter(e => e.nextPayment >= today && e.nextPayment <= nextWeek)
      .map(e => ({ name: e.name, amount: e.amount }));

    // Medicamentos pendientes hoy
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

    // Recordatorios próximos
    const upcomingReminders = await db.reminders
      .where('completed')
      .equals(0)
      .filter(r => r.date >= today && r.date <= nextWeek)
      .toArray();

    return {
      monthlyIncome,
      pendingIncome,
      monthlyExpenses,
      balance: monthlyIncome - monthlyExpenses,
      upcomingPayments,
      pendingMedications,
      pendingClients,
      upcomingReminders: upcomingReminders.map(r => ({ title: r.title, date: r.date })),
    };
  }
}
