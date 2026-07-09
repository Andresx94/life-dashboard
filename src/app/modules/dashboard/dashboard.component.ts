import { Component, OnInit, inject } from '@angular/core';
import { DashboardService, DashboardSummary } from './dashboard.service';
import { formatMoney } from '../../core/config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styles: [`
    .stat-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.25rem;
      transition: border-color 0.2s ease;

      &:hover {
        border-color: #3b3b3b;
      }
    }

    .icon-badge {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .detail-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      overflow: hidden;
    }

    .detail-card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--color-border);

      h3 {
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--color-text-muted);
      }
    }

    .detail-card-body {
      padding: 0.5rem;
    }

    .list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.625rem 0.75rem;
      border-radius: 8px;
      transition: background 0.15s ease;

      &:hover {
        background: var(--color-surface-hover);
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem 1rem;

      p {
        font-size: 0.8125rem;
        color: var(--color-text-muted);
      }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  summary: DashboardSummary = {
    monthlyIncome: 0,
    pendingIncome: 0,
    monthlyExpenses: 0,
    expensesPaid: 0,
    expensesPending: 0,
    balance: 0,
    pendingClients: [],
    pendingFixedExpenses: [],
    pendingMedications: [],
    upcomingReminders: [],
    upcomingMaintenances: [],
  };

  formatMoney = formatMoney;

  async ngOnInit() {
    this.summary = await this.dashboardService.getSummary();
  }
}
