import { Injectable } from '@angular/core';

export interface AppUser {
  username: string;
  password: string;
  displayName: string;
}

const USERS: AppUser[] = [
  { username: 'andres', password: 'andres', displayName: 'Andrés' },
  { username: 'sele', password: 'sele', displayName: 'Sele' },
  { username: 'diego', password: 'diego', displayName: 'Diego' },
  { username: 'wara', password: 'wara', displayName: 'Wara' },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser: AppUser | null = null;

  constructor() {
    const saved = localStorage.getItem('ld_user');
    if (saved) {
      this.currentUser = USERS.find(u => u.username === saved) || null;
    }
  }

  login(username: string, password: string): boolean {
    const user = USERS.find(u => u.username === username && u.password === password);
    if (user) {
      this.currentUser = user;
      localStorage.setItem('ld_user', user.username);
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('ld_user');
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  getUser(): AppUser | null {
    return this.currentUser;
  }

  getDbName(): string {
    return `LifeDashboard_${this.currentUser?.username || 'default'}`;
  }
}
