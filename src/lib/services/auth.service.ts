import api from '../api';
import {User} from '../../types';

export async function loginApi(email: string, password: string) {
  const {data} = await api.post('/auth/login', {email, password});
  return data as {accessToken: string; refreshToken: string; user: User};
}

export async function signupApi(name: string, email: string, password: string) {
  const {data} = await api.post('/auth/signup', {name, email, password});
  return data as {message: string; email: string};
}

export async function verifyEmailApi(email: string, otp: string) {
  const {data} = await api.post('/auth/verify-email', {email, otp});
  return data as {accessToken: string; refreshToken: string; user: User};
}

export async function resendOtpApi(email: string) {
  const {data} = await api.post('/auth/resend-otp', {email});
  return data;
}

export async function getMeApi() {
  const {data} = await api.get('/auth/me');
  return data as User;
}

export async function logoutApi(refreshToken: string) {
  await api.post('/auth/logout', {refreshToken});
}

export const deleteAccountApi = (password: string) =>
  api.delete('/users/me', {data: {password}}).then(r => r.data);
