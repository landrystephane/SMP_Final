import React, { createContext, useContext, useState } from 'react';
import type { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const login = async (username: string, password: string) => {
    // Call Electron Main Process via IPC
    if (window.electronAPI) {
        const dbUser = await window.electronAPI.login({ username, password });
        if (dbUser) {
            setUser(dbUser);
            localStorage.setItem('user', JSON.stringify(dbUser));
        } else {
            throw new Error('Invalid credentials');
        }
    } else {
        // Fallback for web preview if necessary
        if (username === 'admin' && password === 'admin') {
            const mockUser: User = { id: 1, username: 'admin', fullName: 'Super Admin', role: 'FOUNDER' };
            setUser(mockUser);
            localStorage.setItem('user', JSON.stringify(mockUser));
        } else {
            throw new Error('Invalid credentials');
        }
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const hasRole = (roles: Role[]) => {
    return user ? roles.includes(user.role) : false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
