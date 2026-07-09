import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { db, Vehicle, Maintenance } from '../../core/database/db';
import { formatMoney } from '../../core/config';

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './vehicle.component.html',
})
export class VehicleComponent implements OnInit {
  activeTab = 'info';
  vehicle: Vehicle | null = null;
  maintenances: Maintenance[] = [];
  upcomingMaintenances: Maintenance[] = [];
  totalCost = 0;
  showMaintenanceForm = false;
  showKmUpdate = false;
  newKm = 0;

  formatMoney = formatMoney;

  vehicleForm: Vehicle = { brand: '', model: '', year: 2024, plate: '', currentKm: 0 };

  maintenanceForm: Maintenance = {
    vehicleId: 0, type: 'Aceite', date: '', km: 0,
    cost: 0, notes: '', nextDate: null, nextKm: null,
  };

  maintenanceTypes = [
    'Aceite', 'Batería', 'Frenos', 'Llantas', 'Filtros',
    'Amortiguadores', 'Suspensión', 'Refrigerante',
    'Alineación', 'Balanceo', 'Seguro', 'Inspección técnica', 'Otro',
  ];

  async ngOnInit() {
    await this.load();
  }

  async load() {
    const vehicles = await db.vehicles.toArray();
    this.vehicle = vehicles[0] || null;

    if (this.vehicle) {
      this.maintenances = await db.maintenances
        .where('vehicleId')
        .equals(this.vehicle.id!)
        .reverse()
        .sortBy('date');
      this.maintenances.reverse();

      this.totalCost = this.maintenances.reduce((sum, m) => sum + m.cost, 0);

      // Get latest maintenance per type that has nextDate or nextKm
      const latestByType = new Map<string, Maintenance>();
      for (const m of this.maintenances) {
        if ((m.nextDate || m.nextKm) && !latestByType.has(m.type)) {
          latestByType.set(m.type, m);
        }
      }
      this.upcomingMaintenances = Array.from(latestByType.values());
    }
  }

  async saveVehicle() {
    if (!this.vehicleForm.brand || !this.vehicleForm.model) return;
    if (this.vehicle) {
      await db.vehicles.update(this.vehicle.id!, { ...this.vehicleForm });
    } else {
      await db.vehicles.add({ ...this.vehicleForm });
    }
    await this.load();
  }

  editVehicle() {
    if (this.vehicle) {
      this.vehicleForm = { ...this.vehicle };
      this.vehicle = null; // Show form
    }
  }

  async updateKm() {
    if (!this.vehicle || !this.newKm) return;
    await db.vehicles.update(this.vehicle.id!, { currentKm: this.newKm });
    this.showKmUpdate = false;
    this.newKm = 0;
    await this.load();
  }

  async saveMaintenance() {
    if (!this.vehicle || !this.maintenanceForm.type || !this.maintenanceForm.date) return;
    this.maintenanceForm.vehicleId = this.vehicle.id!;
    await db.maintenances.add({ ...this.maintenanceForm });
    this.cancelMaintenance();
    await this.load();
  }

  async deleteMaintenance(id: number) {
    await db.maintenances.delete(id);
    await this.load();
  }

  cancelMaintenance() {
    this.maintenanceForm = {
      vehicleId: 0, type: 'Aceite', date: '', km: 0,
      cost: 0, notes: '', nextDate: null, nextKm: null,
    };
    this.showMaintenanceForm = false;
  }

  isOverdue(m: Maintenance): boolean {
    const today = new Date().toISOString().split('T')[0];
    if (m.nextDate && m.nextDate < today) return true;
    if (m.nextKm && this.vehicle && this.vehicle.currentKm >= m.nextKm) return true;
    return false;
  }

  isSoon(m: Maintenance): boolean {
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    if (m.nextDate && m.nextDate <= in30Days) return true;
    if (m.nextKm && this.vehicle && (m.nextKm - this.vehicle.currentKm) <= 1000) return true;
    return false;
  }
}
