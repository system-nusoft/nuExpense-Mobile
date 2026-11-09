export interface User {
  id: string;
  name: string;
  email: string;
  homeCurrency: string;
  isPremium: boolean;
  isVerified: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
  budgetAmount?: string | null;
}

export interface Expense {
  id: string;
  amount: string;
  currency: string;
  vendor: string;
  date: string;
  notes?: string | null;
  categoryId: string | null;
  category?: Category;
  receiptImageKey?: string | null;
  receiptImageUrl?: string | null;
  homeCurrencyAmount?: string;
  homeCurrencyCode?: string;
}

export interface MonthlySummary {
  month: string;
  total: number;
  count: number;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  total: number;
  count: number;
  budgetAmount: number | null;
}

export interface VendorInsight {
  name: string;
  count: number;
  total: number;
  average: number;
  lastDate: string;
}

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
}
