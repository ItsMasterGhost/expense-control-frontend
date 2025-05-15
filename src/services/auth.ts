import axios from 'axios';
import jwt_decode from 'jwt-decode'; // Importación directa
import { API_URL } from './api';

// Actualizar la interfaz TokenPayload en auth.ts
export interface TokenPayload {
  sub: string;
  name: string;
  FullName: string;  // Cambiado de fullname a FullName
  role: string | string[];
  exp: number;
  unique_name?: string; // Añadir propiedad opcional
}

interface LoginResponse {
  token: string;
}

export const login = async (username: string, password: string): Promise<void> => {
  const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, {
    username,
    password
  });

  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    setAuthToken(response.data.token);
  }
};

export const logout = (): void => {
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
};

export const getCurrentUser = (): TokenPayload | null => {
  const token = getToken();
  if (!token) return null;
  const decodedToken = jwt_decode<TokenPayload>(token); // Uso directo
  return decodedToken;
};


export const isAuthenticated = (): boolean => {
  const user = getCurrentUser();
  if (!user) return false;
  return user.exp * 1000 > Date.now();
};

export const hasRole = (role: string): boolean => {
  const user = getCurrentUser();
  if (!user) return false;
  
  if (Array.isArray(user.role)) {
    return user.role.includes(role);
  }
  
  return user.role === role;
};

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setAuthToken = (token: string): void => {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};


// Initialize axios auth header if token exists
const token = getToken();
if (token) {
  setAuthToken(token);
}

