import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { db, Medication, MedicationLog } from '../../core/database/db';

interface TodayMed {
  id: number;
  name: string;
  dose: string;
  time: string;
  taken: boolean;
}

interface PendingMed {
  medId: number;
  name: string;
  dose: string;
  date: string;
  dateLabel: string;
}

interface WeekDay {
  date: string;
  label: string;
  short: string;
  future: boolean;
}

interface WeekRow {
  medId: number;
  name: string;
  frequency: string;
  days: { date: string; taken: boolean; future: boolean; expected: boolean }[];
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-medications',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './medications.component.html',
})
export class MedicationsComponent implements OnInit {
  activeTab = 'today';
  medications: Medication[] = [];
  todayMeds: TodayMed[] = [];
  todayLogs: MedicationLog[] = [];
  compliancePercent = 0;
  showForm = false;
  editingId: number | null = null;

  // Week view
  weekDays: WeekDay[] = [];
  weekData: WeekRow[] = [];
  weekLabel = '';
  weeklyCompliancePercent = 0;
  isCurrentWeek = true;
  private weekOffset = 0;

  form: Medication = {
    name: '', dose: '', frequency: 'diario',
    time: '', startDate: '', endDate: null, notes: '',
  };

  pendingMeds: PendingMed[] = [];
  pendingAction: { med: PendingMed; mode: 'taken' | 'skipped' | null } | null = null;
  pendingDate = '';

  private today = new Date().toISOString().split('T')[0];

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.medications = await db.medications.toArray();
    this.todayLogs = await db.medicationLogs.where('date').equals(this.today).toArray();

    const activeMeds = this.medications.filter(m => {
      const started = m.startDate <= this.today;
      const notEnded = !m.endDate || m.endDate >= this.today;
      return started && notEnded;
    });

    // Filter by frequency - only show meds expected today
    this.todayMeds = activeMeds
      .filter(m => this.isExpectedOnDate(m, this.today))
      .map(m => ({
        id: m.id!,
        name: m.name,
        dose: m.dose,
        time: m.time,
        taken: this.todayLogs.some(l => l.medicationId === m.id && l.taken),
      }));

    this.todayMeds.sort((a, b) => a.time.localeCompare(b.time));

    const total = this.todayMeds.length;
    const taken = this.todayMeds.filter(m => m.taken).length;
    this.compliancePercent = total > 0 ? Math.round((taken / total) * 100) : 0;

    await this.loadPending();
    await this.loadWeek();
  }

  isExpectedOnDate(med: Medication, date: string): boolean {
    if (med.startDate > date) return false;
    if (med.endDate && med.endDate < date) return false;

    switch (med.frequency) {
      case 'diario':
      case 'cada 12h':
      case 'cada 8h':
        return true;
      case 'semanal': {
        const startDay = new Date(med.startDate + 'T12:00:00').getDay();
        const currentDay = new Date(date + 'T12:00:00').getDay();
        return startDay === currentDay;
      }
      default:
        return true;
    }
  }

  async loadWeek() {
    const weekDates = this.getWeekDates();
    const startDate = weekDates[0];
    const endDate = weekDates[6];

    // Format label with month name
    const startD = new Date(startDate + 'T12:00:00');
    const endD = new Date(endDate + 'T12:00:00');
    if (startD.getMonth() === endD.getMonth()) {
      this.weekLabel = `${startD.getDate()} — ${endD.getDate()} de ${MONTH_NAMES[startD.getMonth()]} ${startD.getFullYear()}`;
    } else {
      this.weekLabel = `${startD.getDate()} ${MONTH_NAMES[startD.getMonth()].slice(0, 3)} — ${endD.getDate()} ${MONTH_NAMES[endD.getMonth()].slice(0, 3)} ${endD.getFullYear()}`;
    }

    this.weekDays = weekDates.map(d => ({
      date: d,
      label: DAY_NAMES[new Date(d + 'T12:00:00').getDay()],
      short: new Date(d + 'T12:00:00').getDate().toString(),
      future: d > this.today,
    }));

    this.isCurrentWeek = this.weekOffset === 0;

    const logs = await db.medicationLogs
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();

    const activeMeds = this.medications.filter(m => {
      const started = m.startDate <= endDate;
      const notEnded = !m.endDate || m.endDate >= startDate;
      return started && notEnded;
    });

    this.weekData = activeMeds.map(m => ({
      medId: m.id!,
      name: m.name,
      frequency: m.frequency,
      days: weekDates.map(date => {
        const expected = this.isExpectedOnDate(m, date);
        return {
          date,
          expected,
          taken: logs.some(l => l.medicationId === m.id && l.date === date && l.taken),
          future: date > this.today,
        };
      }),
    }));

    // Weekly compliance (only expected & past/today days)
    let totalExpected = 0;
    let totalTaken = 0;
    for (const row of this.weekData) {
      for (const day of row.days) {
        if (!day.future && day.expected) {
          totalExpected++;
          if (day.taken) totalTaken++;
        }
      }
    }
    this.weeklyCompliancePercent = totalExpected > 0 ? Math.round((totalTaken / totalExpected) * 100) : 0;
  }

  private getWeekDates(): string[] {
    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (this.weekOffset * 7));
    const dayOfWeek = current.getDay();
    const monday = new Date(current);
    monday.setDate(current.getDate() - ((dayOfWeek + 6) % 7));

    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }

  prevWeek() {
    this.weekOffset--;
    this.loadWeek();
  }

  nextWeek() {
    if (this.isCurrentWeek) return;
    this.weekOffset++;
    this.loadWeek();
  }

  async loadPending() {
    this.pendingMeds = [];
    const allLogs = await db.medicationLogs.toArray();
    const logSet = new Set(allLogs.map(l => `${l.medicationId}_${l.date}`));

    // Check last 7 days (excluding today)
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];

      for (const med of this.medications) {
        if (!this.isExpectedOnDate(med, date)) continue;
        const key = `${med.id}_${date}`;
        if (logSet.has(key)) continue;
        this.pendingMeds.push({
          medId: med.id!,
          name: med.name,
          dose: med.dose,
          date,
          dateLabel: this.formatDateLabel(date),
        });
      }
    }
  }

  private formatDateLabel(date: string): string {
    const d = new Date(date + 'T12:00:00');
    const diff = Math.round((new Date(this.today + 'T12:00:00').getTime() - d.getTime()) / 86400000);
    if (diff === 1) return 'Ayer';
    if (diff === 2) return 'Hace 2 días';
    return `Hace ${diff} días (${d.getDate()}/${d.getMonth() + 1})`;
  }

  openPendingAction(med: PendingMed) {
    this.pendingAction = { med, mode: null };
    this.pendingDate = med.date;
  }

  async markPendingTaken() {
    if (!this.pendingAction) return;
    await db.medicationLogs.add({
      medicationId: this.pendingAction.med.medId,
      date: this.pendingDate || this.pendingAction.med.date,
      taken: true,
    });
    this.pendingAction = null;
    await this.load();
  }

  async markPendingSkipped() {
    if (!this.pendingAction) return;
    await db.medicationLogs.add({
      medicationId: this.pendingAction.med.medId,
      date: this.pendingAction.med.date,
      taken: false,
    });
    this.pendingAction = null;
    await this.load();
  }

  async toggleTaken(med: TodayMed) {
    const existingLog = this.todayLogs.find(l => l.medicationId === med.id);

    if (existingLog) {
      await db.medicationLogs.update(existingLog.id!, { taken: !existingLog.taken });
    } else {
      await db.medicationLogs.add({
        medicationId: med.id,
        date: this.today,
        taken: true,
      });
    }
    await this.load();
  }

  edit(med: Medication) {
    this.editingId = med.id!;
    this.form = { ...med };
    this.showForm = true;
  }

  async save() {
    if (!this.form.name || !this.form.dose || !this.form.time || !this.form.startDate) return;

    if (this.editingId) {
      await db.medications.update(this.editingId, { ...this.form });
    } else {
      await db.medications.add({ ...this.form });
    }
    this.cancelForm();
    await this.load();
  }

  async delete(id: number) {
    await db.medications.delete(id);
    await db.medicationLogs.where('medicationId').equals(id).delete();
    await this.load();
  }

  cancelForm() {
    this.form = { name: '', dose: '', frequency: 'diario', time: '', startDate: '', endDate: null, notes: '' };
    this.showForm = false;
    this.editingId = null;
  }
}
