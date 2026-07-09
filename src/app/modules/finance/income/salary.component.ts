import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { db, Salary } from '../../../core/database/db';
import { formatMoney } from '../../../core/config';

@Component({
  selector: 'app-salary',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './salary.component.html',
})
export class SalaryComponent implements OnInit {
  salaries: Salary[] = [];
  showForm = false;
  editingId: number | null = null;
  form: Salary = { company: '', amount: 0, date: '', notes: '' };

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.salaries = await db.salaries.orderBy('date').reverse().toArray();
  }

  async save() {
    if (!this.form.company || !this.form.amount || !this.form.date) return;
    if (this.editingId) {
      await db.salaries.update(this.editingId, { ...this.form });
    } else {
      await db.salaries.add({ ...this.form });
    }
    this.cancel();
    await this.load();
  }

  edit(salary: Salary) {
    this.form = { company: salary.company, amount: salary.amount, date: salary.date, notes: salary.notes };
    this.editingId = salary.id!;
    this.showForm = true;
  }

  async delete(id: number) {
    await db.salaries.delete(id);
    await this.load();
  }

  cancel() {
    this.form = { company: '', amount: 0, date: '', notes: '' };
    this.editingId = null;
    this.showForm = false;
  }

  formatMoney = formatMoney;
}
