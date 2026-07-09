import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { db, VariableExpense } from '../../../core/database/db';
import { formatMoney } from '../../../core/config';

@Component({
  selector: 'app-variable-expenses',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './variable-expenses.component.html',
})
export class VariableExpensesComponent implements OnInit {
  expenses: VariableExpense[] = [];
  showForm = false;
  monthlyTotal = 0;

  form: VariableExpense = { category: '', amount: 0, date: '', description: '' };

  categories = [
    'Comida', 'Transporte', 'Salud', 'Entretenimiento',
    'Ropa', 'Hogar', 'Tecnología', 'Educación', 'Otro',
  ];

  async ngOnInit() {
    await this.load();
  }

  async load() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    this.expenses = await db.variableExpenses.orderBy('date').reverse().toArray();
    this.monthlyTotal = this.expenses
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }

  async save() {
    if (!this.form.category || !this.form.amount || !this.form.date) return;
    await db.variableExpenses.add({ ...this.form });
    this.cancel();
    await this.load();
  }

  async delete(id: number) {
    await db.variableExpenses.delete(id);
    await this.load();
  }

  cancel() {
    this.form = { category: '', amount: 0, date: '', description: '' };
    this.showForm = false;
  }

  formatMoney = formatMoney;
}
