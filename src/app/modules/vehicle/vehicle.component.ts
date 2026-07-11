import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { db, Vehicle, Maintenance, FuelLog } from '../../core/database/db';
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
  vehicles: Vehicle[] = [];
  maintenances: Maintenance[] = [];
  upcomingMaintenances: Maintenance[] = [];
  totalCost = 0;
  showMaintenanceForm = false;
  showVehicleForm = false;
  editingVehicleId: number | null = null;
  editingMaintenanceId: number | null = null;
  viewMaintenance: Maintenance | null = null;
  filterType = '';
  // Fuel
  fuelLogs: FuelLog[] = [];
  showFuelForm = false;
  editingFuelId: number | null = null;
  fuelForm: FuelLog = { vehicleId: 0, date: '', km: 0, liters: 0, cost: 0, fullTank: true, notes: '' };
  fuelMonthlyTotal = 0;
  fuelAvgConsumption = 0;
  fuelMonthlyKm = 0;
  showKmUpdate = false;
  newKm = 0;

  formatMoney = formatMoney;

  vehicleForm: Vehicle = { brand: '', model: '', year: 2024, plate: '', currentKm: 0 };

  maintenanceForm: Maintenance = {
    vehicleId: 0, type: 'Aceite', date: '', km: 0,
    cost: 0, notes: '', nextDate: null, nextKm: null,
    recommendedNextDate: null, recommendedNextKm: null,
  };

  maintenanceTypes = [
    'Aceite', 'Batería', 'Frenos', 'Llantas', 'Filtros',
    'Amortiguadores', 'Suspensión', 'Refrigerante',
    'Alineación', 'Balanceo', 'Seguro', 'Inspección técnica', 'Otro',
  ];

  // Base de conocimiento: intervalos recomendados por tipo
  readonly recommendedIntervals: Record<string, { km: number | null; months: number | null }> = {
    'Aceite': { km: 5000, months: 6 },
    'Filtros': { km: 10000, months: 12 },
    'Frenos': { km: 30000, months: 24 },
    'Llantas': { km: 40000, months: 36 },
    'Batería': { km: null, months: 24 },
    'Refrigerante': { km: 40000, months: 24 },
    'Alineación': { km: 10000, months: 12 },
    'Balanceo': { km: 10000, months: 12 },
    'Amortiguadores': { km: 60000, months: 48 },
    'Suspensión': { km: 60000, months: 48 },
    'Seguro': { km: null, months: 12 },
    'Inspección técnica': { km: null, months: 12 },
  };

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.vehicles = await db.vehicles.toArray();
    if (!this.vehicle && this.vehicles.length > 0) {
      this.vehicle = this.vehicles[0];
    }
    await this.loadVehicleData();
  }

  async loadVehicleData() {
    this.maintenances = [];
    this.upcomingMaintenances = [];
    this.totalCost = 0;
    this.fuelLogs = [];
    this.fuelMonthlyTotal = 0;
    this.fuelAvgConsumption = 0;
    this.fuelMonthlyKm = 0;

    if (!this.vehicle) return;

    this.maintenances = await db.maintenances
      .where('vehicleId')
      .equals(this.vehicle.id!)
      .reverse()
      .sortBy('date');
    this.maintenances.reverse();

    this.totalCost = this.maintenances.reduce((sum, m) => sum + m.cost, 0);

    const latestByType = new Map<string, Maintenance>();
    for (const m of this.maintenances) {
      if ((m.nextDate || m.nextKm || m.recommendedNextDate || m.recommendedNextKm) && !latestByType.has(m.type)) {
        latestByType.set(m.type, m);
      }
    }
    this.upcomingMaintenances = Array.from(latestByType.values());

    // Fuel
    this.fuelLogs = await db.fuelLogs
      .where('vehicleId')
      .equals(this.vehicle.id!)
      .reverse()
      .sortBy('date');
    this.fuelLogs.reverse();
    this.calculateFuelStats();
  }

  get filteredMaintenances(): Maintenance[] {
    if (!this.filterType) return this.maintenances;
    return this.maintenances.filter(m => m.type === this.filterType);
  }

  async selectVehicle(v: Vehicle) {
    this.vehicle = v;
    await this.loadVehicleData();
  }

  async deleteVehicle(id: number) {
    await db.vehicles.delete(id);
    await db.maintenances.where('vehicleId').equals(id).delete();
    this.vehicle = null;
    await this.load();
  }

  async saveVehicle() {
    if (!this.vehicleForm.brand || !this.vehicleForm.model) return;
    if (this.editingVehicleId) {
      await db.vehicles.update(this.editingVehicleId, { ...this.vehicleForm });
    } else {
      const id = await db.vehicles.add({ ...this.vehicleForm });
      this.vehicle = { ...this.vehicleForm, id: id as number };
    }
    this.cancelVehicleForm();
    await this.load();
  }

  editVehicle(v?: Vehicle) {
    const target = v || this.vehicle;
    if (target) {
      this.vehicleForm = { brand: target.brand, model: target.model, year: target.year, plate: target.plate, currentKm: target.currentKm };
      this.editingVehicleId = target.id!;
      this.showVehicleForm = true;
    }
  }

  addVehicle() {
    this.cancelVehicleForm();
    this.showVehicleForm = true;
  }

  cancelVehicleForm() {
    this.vehicleForm = { brand: '', model: '', year: 2024, plate: '', currentKm: 0 };
    this.editingVehicleId = null;
    this.showVehicleForm = false;
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
    if (this.editingMaintenanceId) {
      await db.maintenances.update(this.editingMaintenanceId, { ...this.maintenanceForm });
    } else {
      await db.maintenances.add({ ...this.maintenanceForm });
    }
    this.cancelMaintenance();
    await this.load();
  }

  editMaintenance(m: Maintenance) {
    this.maintenanceForm = { vehicleId: m.vehicleId, type: m.type, date: m.date, km: m.km, cost: m.cost, notes: m.notes, nextDate: m.nextDate, nextKm: m.nextKm, recommendedNextDate: m.recommendedNextDate || null, recommendedNextKm: m.recommendedNextKm || null };
    this.editingMaintenanceId = m.id!;
    this.showMaintenanceForm = true;
  }

  async deleteMaintenance(id: number) {
    await db.maintenances.delete(id);
    await this.load();
  }

  calculateRecommended() {
    const interval = this.recommendedIntervals[this.maintenanceForm.type];
    if (!interval) {
      this.maintenanceForm.recommendedNextDate = null;
      this.maintenanceForm.recommendedNextKm = null;
      return;
    }
    if (interval.months && this.maintenanceForm.date) {
      const d = new Date(this.maintenanceForm.date + 'T12:00:00');
      d.setMonth(d.getMonth() + interval.months);
      this.maintenanceForm.recommendedNextDate = d.toISOString().split('T')[0];
    } else {
      this.maintenanceForm.recommendedNextDate = null;
    }
    if (interval.km && this.maintenanceForm.km) {
      this.maintenanceForm.recommendedNextKm = this.maintenanceForm.km + interval.km;
    } else {
      this.maintenanceForm.recommendedNextKm = null;
    }
  }

  cancelMaintenance() {
    this.maintenanceForm = {
      vehicleId: 0, type: 'Aceite', date: '', km: 0,
      cost: 0, notes: '', nextDate: null, nextKm: null,
      recommendedNextDate: null, recommendedNextKm: null,
    };
    this.editingMaintenanceId = null;
    this.showMaintenanceForm = false;
  }

  isOverdue(m: Maintenance): boolean {
    const today = new Date().toISOString().split('T')[0];
    const nextDate = m.nextDate || m.recommendedNextDate;
    const nextKm = m.nextKm || m.recommendedNextKm;
    if (nextDate && nextDate < today) return true;
    if (nextKm && this.vehicle && this.vehicle.currentKm >= nextKm) return true;
    return false;
  }

  isSoon(m: Maintenance): boolean {
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const nextDate = m.nextDate || m.recommendedNextDate;
    const nextKm = m.nextKm || m.recommendedNextKm;
    if (nextDate && nextDate <= in30Days) return true;
    if (nextKm && this.vehicle && (nextKm - this.vehicle.currentKm) <= 1000) return true;
    return false;
  }

  // === FUEL ===
  calculateFuelStats() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const thisMonth = this.fuelLogs.filter(f => {
      const d = new Date(f.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    this.fuelMonthlyTotal = thisMonth.reduce((sum, f) => sum + f.cost, 0);

    // Km recorridos este mes
    if (thisMonth.length >= 2) {
      const kms = thisMonth.map(f => f.km);
      this.fuelMonthlyKm = Math.max(...kms) - Math.min(...kms);
    } else {
      this.fuelMonthlyKm = 0;
    }

    // Consumo promedio (km/litro) - solo con tanques llenos consecutivos
    const fullTanks = this.fuelLogs.filter(f => f.fullTank).sort((a, b) => a.km - b.km);
    if (fullTanks.length >= 2) {
      let totalKm = 0;
      let totalLiters = 0;
      for (let i = 1; i < fullTanks.length; i++) {
        totalKm += fullTanks[i].km - fullTanks[i - 1].km;
        totalLiters += fullTanks[i].liters;
      }
      this.fuelAvgConsumption = totalLiters > 0 ? Math.round((totalKm / totalLiters) * 10) / 10 : 0;
    } else {
      this.fuelAvgConsumption = 0;
    }
  }

  async saveFuel() {
    if (!this.vehicle || !this.fuelForm.date || !this.fuelForm.liters || !this.fuelForm.cost) return;
    this.fuelForm.vehicleId = this.vehicle.id!;
    if (this.editingFuelId) {
      await db.fuelLogs.update(this.editingFuelId, { ...this.fuelForm });
    } else {
      await db.fuelLogs.add({ ...this.fuelForm });
    }
    // Update vehicle km if fuel km is higher
    if (this.fuelForm.km > this.vehicle.currentKm) {
      await db.vehicles.update(this.vehicle.id!, { currentKm: this.fuelForm.km });
    }
    this.cancelFuel();
    await this.load();
  }

  editFuel(f: FuelLog) {
    this.fuelForm = { vehicleId: f.vehicleId, date: f.date, km: f.km, liters: f.liters, cost: f.cost, fullTank: f.fullTank, notes: f.notes };
    this.editingFuelId = f.id!;
    this.showFuelForm = true;
  }

  async deleteFuel(id: number) {
    await db.fuelLogs.delete(id);
    await this.load();
  }

  cancelFuel() {
    this.fuelForm = { vehicleId: 0, date: '', km: 0, liters: 0, cost: 0, fullTank: true, notes: '' };
    this.editingFuelId = null;
    this.showFuelForm = false;
  }
}
