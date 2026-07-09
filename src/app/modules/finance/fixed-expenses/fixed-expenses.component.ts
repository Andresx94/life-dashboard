import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { db, FixedExpense, FixedExpensePayment } from '../../../core/database/db';
import { formatMoney } from '../../../core/config';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-fixed-expenses',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './fixed-expenses.component.html',
})
export class FixedExpensesComponent implements OnInit {
  expenses: FixedExpense[] = [];
  payments: FixedExpensePayment[] = [];
  showForm = false;

  monthlyTotal = 0;
  paidTotal = 0;
  pendingTotal = 0;

  viewMonth: number;
  viewYear: number;
  monthLabel = '';
  isCurrentMonth = true;

  formatMoney = formatMoney;

  form: FixedExpense = {
    name: '', category: '', amount: 0,
    frequency: 'monthly', nextPayment: '', reminder: true,
  };

  categories = [
    'Salud', 'Tecnología', 'Servicios', 'Transporte',
    'Entretenimiento', 'Seguros', 'Educación', 'Otro',
  ];

  constructor() {
    const now = new Date();
    this.viewMonth = now.getMonth() + 1;
    this.viewYear = now.getFullYear();
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.expenses = await db.fixedExpenses.toArray();
    this.payments = await db.fixedExpensePayments
      .where('[month+year]')
      .equals([this.viewMonth, this.viewYear])
      .toArray();
    this.updateLabel();
    this.calculateSummary();
  }

  updateLabel() {
    this.monthLabel = `${MONTH_NAMES[this.viewMonth - 1]} ${this.viewYear}`;
    const now = new Date();
    this.isCurrentMonth = this.viewMonth === now.getMonth() + 1 && this.viewYear === now.getFullYear();
  }

  calculateSummary() {
    const monthlyExpenses = this.expenses.filter(e => e.frequency === 'monthly');
    this.monthlyTotal = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

    const paidIds = new Set(this.payments.map(p => p.expenseId));
    this.paidTotal = monthlyExpenses
      .filter(e => paidIds.has(e.id!))
      .reduce((sum, e) => sum + e.amount, 0);
    this.pendingTotal = this.monthlyTotal - this.paidTotal;
  }

  isPaid(expenseId: number): boolean {
    return this.payments.some(p => p.expenseId === expenseId);
  }

  async markPaid(expenseId: number) {
    await db.fixedExpensePayments.add({
      expenseId,
      month: this.viewMonth,
      year: this.viewYear,
      paidAt: new Date().toISOString().split('T')[0],
    });
    await this.load();
  }

  async unmarkPaid(expenseId: number) {
    const payment = this.payments.find(p => p.expenseId === expenseId);
    if (payment?.id) {
      await db.fixedExpensePayments.delete(payment.id);
      await this.load();
    }
  }

  prevMonth() {
    this.viewMonth--;
    if (this.viewMonth < 1) {
      this.viewMonth = 12;
      this.viewYear--;
    }
    this.load();
  }

  nextMonth() {
    if (this.isCurrentMonth) return;
    this.viewMonth++;
    if (this.viewMonth > 12) {
      this.viewMonth = 1;
      this.viewYear++;
    }
    this.load();
  }

  async save() {
    if (!this.form.name || !this.form.amount) return;
    await db.fixedExpenses.add({ ...this.form });
    this.cancel();
    await this.load();
  }

  async delete(id: number) {
    await db.fixedExpenses.delete(id);
    await this.load();
  }

  cancel() {
    this.form = { name: '', category: '', amount: 0, frequency: 'monthly', nextPayment: '', reminder: true };
    this.showForm = false;
  }
}
