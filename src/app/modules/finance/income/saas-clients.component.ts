import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { db, SaasClient, SaasPayment } from '../../../core/database/db';
import { formatMoney } from '../../../core/config';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-saas-clients',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './saas-clients.component.html',
  styles: [`
    .status-badge {
      font-size: 0.6875rem;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      text-transform: capitalize;
    }
    .status-active { background: rgba(34,197,94,0.1); color: #22c55e; }
    .status-inactive { background: rgba(239,68,68,0.1); color: #ef4444; }
    .status-paused { background: rgba(245,158,11,0.1); color: #f59e0b; }
  `],
})
export class SaasClientsComponent implements OnInit {
  clients: SaasClient[] = [];
  payments: SaasPayment[] = [];
  showForm = false;
  editingId: number | null = null;
  form: SaasClient = { name: '', company: '', monthlyAmount: 0, status: 'active', notes: '' };

  expected = 0;
  collected = 0;
  pending = 0;

  viewMonth: number;
  viewYear: number;
  monthLabel = '';
  isCurrentMonth = true;

  formatMoney = formatMoney;

  constructor() {
    const now = new Date();
    this.viewMonth = now.getMonth() + 1;
    this.viewYear = now.getFullYear();
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.clients = await db.saasClients.where('status').equals('active').toArray();
    this.payments = await db.saasPayments
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
    this.expected = this.clients.reduce((sum, c) => sum + c.monthlyAmount, 0);
    this.collected = this.payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    this.pending = this.expected - this.collected;
  }

  isPaidThisMonth(clientId: number): boolean {
    return this.payments.some(p => p.clientId === clientId && p.status === 'paid');
  }

  async markPaid(client: SaasClient) {
    await db.saasPayments.add({
      clientId: client.id!,
      month: this.viewMonth,
      year: this.viewYear,
      amount: client.monthlyAmount,
      paidAt: new Date().toISOString().split('T')[0],
      status: 'paid',
    });
    await this.load();
  }

  async unmarkPaid(clientId: number) {
    const payment = this.payments.find(p => p.clientId === clientId);
    if (payment?.id) {
      await db.saasPayments.delete(payment.id);
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

  async saveClient() {
    if (!this.form.name || !this.form.monthlyAmount) return;
    if (this.editingId) {
      await db.saasClients.update(this.editingId, { ...this.form });
    } else {
      await db.saasClients.add({ ...this.form });
    }
    this.cancelForm();
    await this.load();
  }

  editClient(client: SaasClient) {
    this.form = { name: client.name, company: client.company, monthlyAmount: client.monthlyAmount, status: client.status, notes: client.notes };
    this.editingId = client.id!;
    this.showForm = true;
  }

  async deleteClient(id: number) {
    await db.saasClients.delete(id);
    await this.load();
  }

  cancelForm() {
    this.form = { name: '', company: '', monthlyAmount: 0, status: 'active', notes: '' };
    this.editingId = null;
    this.showForm = false;
  }
}
