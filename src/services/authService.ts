// Authentication & RBAC Service
import { User, UserRole, Permission } from '../types';
import { SEED_USERS } from '../db/initialSeed';

const AUTH_USER_KEY = 'stitchflow_active_user';

export const ROLE_PERMISSIONS: Record<UserRole, Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {
  ADMIN: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    pos: { view: true, create: true, edit: true, delete: true },
    sales: { view: true, create: true, edit: true, delete: true },
    purchases: { view: true, create: true, edit: true, delete: true },
    products: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, create: true, edit: true, delete: true },
    customers: { view: true, create: true, edit: true, delete: true },
    suppliers: { view: true, create: true, edit: true, delete: true },
    expenses: { view: true, create: true, edit: true, delete: true },
    employees: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    backup: { view: true, create: true, edit: true, delete: true },
    sync: { view: true, create: true, edit: true, delete: true }
  },
  MANAGER: {
    dashboard: { view: true, create: true, edit: true, delete: false },
    pos: { view: true, create: true, edit: true, delete: true },
    sales: { view: true, create: true, edit: true, delete: false },
    purchases: { view: true, create: true, edit: true, delete: false },
    products: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: true, edit: true, delete: false },
    customers: { view: true, create: true, edit: true, delete: false },
    suppliers: { view: true, create: true, edit: true, delete: false },
    expenses: { view: true, create: true, edit: true, delete: false },
    employees: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    backup: { view: true, create: true, edit: false, delete: false },
    sync: { view: true, create: true, edit: true, delete: false }
  },
  CASHIER: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    pos: { view: true, create: true, edit: true, delete: false },
    sales: { view: true, create: true, edit: false, delete: false },
    purchases: { view: false, create: false, edit: false, delete: false },
    products: { view: true, create: false, edit: false, delete: false },
    inventory: { view: false, create: false, edit: false, delete: false },
    customers: { view: true, create: true, edit: false, delete: false },
    suppliers: { view: false, create: false, edit: false, delete: false },
    expenses: { view: false, create: false, edit: false, delete: false },
    employees: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    backup: { view: false, create: false, edit: false, delete: false },
    sync: { view: true, create: true, edit: false, delete: false }
  },
  INVENTORY_STAFF: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    pos: { view: false, create: false, edit: false, delete: false },
    sales: { view: false, create: false, edit: false, delete: false },
    purchases: { view: true, create: true, edit: true, delete: false },
    products: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: true, edit: true, delete: false },
    customers: { view: false, create: false, edit: false, delete: false },
    suppliers: { view: true, create: false, edit: false, delete: false },
    expenses: { view: false, create: false, edit: false, delete: false },
    employees: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    backup: { view: false, create: false, edit: false, delete: false },
    sync: { view: true, create: true, edit: false, delete: false }
  }
};

export class AuthService {
  private currentUser: User | null = null;

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored);
        } catch {
          this.currentUser = SEED_USERS[0];
        }
      } else {
        // Default to admin for seamless immediate use
        this.currentUser = SEED_USERS[0];
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(this.currentUser));
      }
    } else {
      this.currentUser = SEED_USERS[0];
    }
  }

  public getCurrentUser(): User {
    if (!this.currentUser) {
      this.currentUser = SEED_USERS[0];
    }
    return this.currentUser;
  }

  public switchUser(user: User): void {
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
  }

  public hasPermission(module: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.role === 'ADMIN') return true;

    const modulePerms = ROLE_PERMISSIONS[user.role]?.[module];
    if (!modulePerms) return false;
    return !!modulePerms[action];
  }
}

export const authService = new AuthService();
