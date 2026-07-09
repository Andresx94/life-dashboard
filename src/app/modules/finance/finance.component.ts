import { Component } from '@angular/core';
import { SalaryComponent } from './income/salary.component';
import { SaasClientsComponent } from './income/saas-clients.component';
import { FixedExpensesComponent } from './fixed-expenses/fixed-expenses.component';
import { VariableExpensesComponent } from './variable-expenses/variable-expenses.component';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [SalaryComponent, SaasClientsComponent, FixedExpensesComponent, VariableExpensesComponent],
  templateUrl: './finance.component.html',
})
export class FinanceComponent {
  activeTab = 'salary';

  tabs = [
    { id: 'salary', label: 'Sueldo', icon: 'pi-briefcase' },
    { id: 'clients', label: 'Clientes SaaS', icon: 'pi-users' },
    { id: 'fixed', label: 'Gastos Fijos', icon: 'pi-calendar' },
    { id: 'variable', label: 'Gastos Variables', icon: 'pi-shopping-cart' },
  ];
}
