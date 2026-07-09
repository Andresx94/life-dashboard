import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BackupService } from '../core/backup/backup.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styles: [`
    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      border-radius: 8px;
      font-size: 0.8125rem;
      color: var(--color-text-muted);
      transition: all 0.15s ease;
      text-decoration: none;
      cursor: pointer;
      border: none;
      background: none;
      white-space: nowrap;

      &:hover {
        color: var(--color-text);
        background: var(--color-surface-hover);
      }

      i {
        font-size: 0.875rem;
      }
    }

    .active-link {
      color: var(--color-text) !important;
      background: var(--color-surface-hover) !important;
    }
  `],
})
export class LayoutComponent {
  private backupService = inject(BackupService);

  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'pi-home' },
    { path: '/finance', label: 'Finanzas', icon: 'pi-wallet' },
    { path: '/medications', label: 'Medicamentos', icon: 'pi-heart' },
    { path: '/vehicle', label: 'Vehículo', icon: 'pi-car' },
    { path: '/contacts', label: 'Tarjetero', icon: 'pi-id-card' },
    { path: '/reminders', label: 'Recordatorios', icon: 'pi-bell' },
  ];

  async exportBackup() {
    await this.backupService.exportBackup();
  }

  async importBackup(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const result = await this.backupService.importBackup(file);
    alert(result.message);
    if (result.success) {
      window.location.reload();
    }
    input.value = '';
  }
}
