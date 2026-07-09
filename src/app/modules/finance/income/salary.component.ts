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
  form: Salary = { company: '', amount: 0, date: '', notes: '' };

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.salaries = await db.salaries.orderBy('date').reverse().toArray();
  }

  async save() {
    if (!this.form.company || !this.form.amount || !this.form.date) return;
    await db.salaries.add({ ...this.form });
    this.cancel();
    await this.load();
  }

  async delete(id: number) {
    await db.salaries.delete(id);
    await this.load();
  }

  cancel() {
    this.form = { company: '', amount: 0, date: '', notes: '' };
    this.showForm = false;
  }

  formatMoney = formatMoney;
}
