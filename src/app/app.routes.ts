import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./modules/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'finance',
        loadComponent: () =>
          import('./modules/finance/finance.component').then(m => m.FinanceComponent),
      },
      {
        path: 'medications',
        loadComponent: () =>
          import('./modules/medications/medications.component').then(m => m.MedicationsComponent),
      },
      {
        path: 'vehicle',
        loadComponent: () =>
          import('./modules/vehicle/vehicle.component').then(m => m.VehicleComponent),
      },
      {
        path: 'contacts',
        loadComponent: () =>
          import('./modules/contacts/contacts.component').then(m => m.ContactsComponent),
      },
      {
        path: 'reminders',
        loadComponent: () =>
          import('./modules/reminders/reminders.component').then(m => m.RemindersComponent),
      },
    ],
  },
];
