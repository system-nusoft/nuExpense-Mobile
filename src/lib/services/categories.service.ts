import api from '../api';
import {Category} from '../../types';

export async function getCategoriesApi(): Promise<Category[]> {
  const {data} = await api.get('/categories');
  return data;
}

export async function createCategoryApi(payload: {
  name: string;
  color: string;
  icon: string;
  budgetAmount?: number | null;
}): Promise<Category> {
  const {data} = await api.post('/categories', payload);
  return data;
}

export async function updateCategoryApi(id: string, payload: Partial<{
  name: string;
  color: string;
  icon: string;
  budgetAmount: number | null;
}>): Promise<Category> {
  const {data} = await api.patch(`/categories/${id}`, payload);
  return data;
}

export async function deleteCategoryApi(id: string): Promise<void> {
  await api.delete(`/categories/${id}`);
}
