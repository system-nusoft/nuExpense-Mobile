import axios, {AxiosError} from 'axios';
import {getAccessToken, getRefreshToken, setTokens, clearAuth} from './storage';

export const API_URL = 'https://nuexpense-be.onrender.com/api';

const api = axios.create({baseURL: API_URL});

/** Extract the backend `message` from an API error payload. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  const data = (error as AxiosError<{message?: string | string[]}>)?.response?.data;
  const message = data?.message;
  if (Array.isArray(message)) {
    return message.filter(Boolean).join('\n') || fallback;
  }
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  const errMessage = (error as Error)?.message;
  if (errMessage && !errMessage.startsWith('Request failed with status code')) {
    return errMessage;
  }
  return fallback;
}

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

    const beMessage = getApiErrorMessage(error, '');
    if (beMessage) {
      error.message = beMessage;
    }
    return Promise.reject(error);
  },
);

export default api;
