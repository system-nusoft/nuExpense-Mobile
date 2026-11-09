import axios from 'axios';
import {getAccessToken, getRefreshToken, setTokens, clearAuth} from './storage';

export const API_URL = 'https://nuexpense-be.onrender.com/api';

const api = axios.create({baseURL: API_URL});

api.interceptors.request.use(async config => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await getRefreshToken();
        const {data} = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken: refresh,
        });
        await setTokens(data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        await clearAuth();
      }
    }
    return Promise.reject(error);
  },
);

export default api;
