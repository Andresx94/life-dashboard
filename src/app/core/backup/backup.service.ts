import { Injectable } from '@angular/core';
import { db } from '../database/db';

@Injectable({ providedIn: 'root' })
export class BackupService {
  async exportBackup(): Promise<void> {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      salaries: await db.salaries.toArray(),
      saasClients: await db.saasClients.toArray(),
      saasPayments: await db.saasPayments.toArray(),
      fixedExpenses: await db.fixedExpenses.toArray(),
      fixedExpensePayments: await db.fixedExpensePayments.toArray(),
      variableExpenses: await db.variableExpenses.toArray(),
      medications: await db.medications.toArray(),
      medicationLogs: await db.medicationLogs.toArray(),
      contacts: await db.contacts.toArray(),
      vehicles: await db.vehicles.toArray(),
      maintenances: await db.maintenances.toArray(),
      reminders: await db.reminders.toArray(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `life-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importBackup(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.exportedAt) {
        return { success: false, message: 'Archivo de backup inválido' };
      }

      await db.transaction('rw',
        [db.salaries, db.saasClients, db.saasPayments,
        db.fixedExpenses, db.fixedExpensePayments, db.variableExpenses,
        db.medications, db.medicationLogs,
        db.contacts, db.vehicles, db.maintenances, db.reminders],
        async () => {
          // Clear all tables
          await db.salaries.clear();
          await db.saasClients.clear();
          await db.saasPayments.clear();
          await db.fixedExpenses.clear();
          await db.fixedExpensePayments.clear();
          await db.variableExpenses.clear();
          await db.medications.clear();
          await db.medicationLogs.clear();
          await db.contacts.clear();
          await db.vehicles.clear();
          await db.maintenances.clear();
          await db.reminders.clear();

          // Import data
          if (data.salaries?.length) await db.salaries.bulkAdd(data.salaries);
          if (data.saasClients?.length) await db.saasClients.bulkAdd(data.saasClients);
          if (data.saasPayments?.length) await db.saasPayments.bulkAdd(data.saasPayments);
          if (data.fixedExpenses?.length) await db.fixedExpenses.bulkAdd(data.fixedExpenses);
          if (data.fixedExpensePayments?.length) await db.fixedExpensePayments.bulkAdd(data.fixedExpensePayments);
          if (data.variableExpenses?.length) await db.variableExpenses.bulkAdd(data.variableExpenses);
          if (data.medications?.length) await db.medications.bulkAdd(data.medications);
          if (data.medicationLogs?.length) await db.medicationLogs.bulkAdd(data.medicationLogs);
          if (data.contacts?.length) await db.contacts.bulkAdd(data.contacts);
          if (data.vehicles?.length) await db.vehicles.bulkAdd(data.vehicles);
          if (data.maintenances?.length) await db.maintenances.bulkAdd(data.maintenances);
          if (data.reminders?.length) await db.reminders.bulkAdd(data.reminders);
        }
      );

      return { success: true, message: `Backup restaurado (${data.exportedAt})` };
    } catch {
      return { success: false, message: 'Error al leer el archivo' };
    }
  }

  async clearAll(): Promise<void> {
    await db.salaries.clear();
    await db.saasClients.clear();
    await db.saasPayments.clear();
    await db.fixedExpenses.clear();
    await db.fixedExpensePayments.clear();
    await db.variableExpenses.clear();
    await db.medications.clear();
    await db.medicationLogs.clear();
    await db.contacts.clear();
    await db.vehicles.clear();
    await db.maintenances.clear();
    await db.reminders.clear();
  }
}
