// Expense Management Service
import { localDB } from '../db/indexedDb';
import { Expense, ExpenseCategory, PaymentMethod } from '../types';
import { syncEngine } from '../sync/syncEngine';

export class ExpenseService {
  async getCategories(): Promise<ExpenseCategory[]> {
    return localDB.getAll<ExpenseCategory>('expense_categories');
  }

  async getExpenses(): Promise<Expense[]> {
    return localDB.getAll<Expense>('expenses');
  }

  async addExpense(params: {
    categoryId: string;
    description: string;
    amount: number;
    expenseDate: string;
    paymentMethod: PaymentMethod;
    referenceNo?: string;
    user: { id: string; name: string };
  }): Promise<Expense> {
    const { categoryId, description, amount, expenseDate, paymentMethod, referenceNo, user } = params;
    const categories = await this.getCategories();
    const cat = categories.find((c) => c.id === categoryId);

    const expense: Expense = {
      id: `exp-${Date.now()}`,
      categoryId,
      categoryName: cat?.name || 'General Expense',
      description,
      amount,
      expenseDate: expenseDate || new Date().toISOString(),
      paymentMethod,
      referenceNo,
      userId: user.id,
      userName: user.name,
      createdAt: new Date().toISOString()
    };

    await localDB.put('expenses', expense);

    // Queue for sync
    await syncEngine.queueTransaction('EXPENSE', 'CREATE', expense, `tx-exp-${Date.now()}`);

    return expense;
  }
}

export const expenseService = new ExpenseService();
