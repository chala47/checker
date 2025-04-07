"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, getCurrentUser, login, logout, register } from "@/lib/auth";

type AuthContextType = {
  user: User | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        setUser(user);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      await register(email, password);
      router.push("/auth/login");
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Registration failed");
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const user = await login(email, password);
      console.log("user", user)
      setUser(user);
      router.push("/");
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Login failed");
    }
  };

  const signOut = async () => {
    try {
      await logout();
      setUser(null);
      router.push("/auth/login");
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Logout failed");
    }
  };

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};