import {
  CategorySummary,
  Expense,
  MonthlySummary,
  PaginatedExpenses,
  VendorInsight,
} from '../../types';
import api from '../api';

export async function getExpensesApi(
  page = 1,
  limit = 20,
): Promise<PaginatedExpenses> {
  const { data } = await api.get('/expenses', { params: { page, limit } });
  return data;
}

export async function createExpenseApi(payload: {
  amount: number;
  currency: string;
  vendor: string;
  date: string;
  notes?: string | null;
  categoryId?: string | null;
  receiptImageKey?: string;
}): Promise<Expense> {
  const { data } = await api.post('/expenses', payload);
  return data;
}

export async function updateExpenseApi(
  id: string,
  payload: Partial<{
    amount: number;
    currency: string;
    vendor: string;
    date: string;
    notes: string | null;
    categoryId: string | null;
  }>,
): Promise<Expense> {
  const { data } = await api.patch(`/expenses/${id}`, payload);
  return data;
}

export async function deleteExpenseApi(id: string): Promise<void> {
  await api.delete(`/expenses/${id}`);
}

export async function getMonthlySummaryApi(): Promise<MonthlySummary[]> {
  const { data } = await api.get('/expenses/summary/monthly');
  return data;
}

export async function getCategorySummaryApi(
  month: string,
): Promise<CategorySummary[]> {
  const { data } = await api.get('/expenses/summary/categories', {
    params: { month },
  });
  return data;
}

export async function getMonthlyRecapApi(
  month: string,
): Promise<{ recap: string }> {
  const { data } = await api.get('/expenses/recap', { params: { month } });
  return data;
}

export async function getVendorInsightsApi(): Promise<VendorInsight[]> {
  const { data } = await api.get('/expenses/vendors/insights');
  return data;
}
