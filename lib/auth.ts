import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

axios.defaults.withCredentials = true; // Enable credentials for all requests

export interface User {
  id: string;
  email: string;
}

export const register = async (email: string, password: string) => {
  const response = await axios.post(`${API_URL}/auth/register`, {
    email,
    password,
  });
  return response.data;
};

export const login = async (email: string, password: string) => {
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  });
  return response.data;
};

export const logout = async () => {
  const response = await axios.post(`${API_URL}/auth/logout`, {});
  return response.data;
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await axios.get(`${API_URL}/auth/user`);
    return response.data;
  } catch (error) {
    return null;
  }
};