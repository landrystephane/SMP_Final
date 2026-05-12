import React, { createContext, useContext, useState, useEffect } from 'react';
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
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      // Safety check: ensure required fields and valid role exist
      if (!parsed.role || !parsed.username) {
        localStorage.removeItem('user');
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const login = async (username: string, password: string) => {
    if (window.electronAPI) {
        const dbUser = await window.electronAPI.login({ username, password });
        if (dbUser) {
            setUser(dbUser);
            localStorage.setItem('user', JSON.stringify(dbUser));
        } else {
            throw new Error('Invalid credentials');
        }
    } else {
        // Normalizing for mock login
        const lowerUser = username.toLowerCase();
        if (lowerUser === 'admin' && password === 'admin') {
            const mockUser: User = { id: 1, username: 'admin', fullName: 'Super Admin', role: 'FOUNDER', schoolId: 1 };
            setUser(mockUser);
            localStorage.setItem('user', JSON.stringify(mockUser));
        } else if (lowerUser === 'teacher' && password === 'teacher') {
            const mockUser: User = { id: 2, username: 'teacher', fullName: 'M. Enseignant', role: 'TEACHER', schoolId: 1 };
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

  const [isSgActingDirector, setIsSgActingDirector] = useState(false);

  useEffect(() => {
    const checkActingStatus = async () => {
        if (window.electronAPI && user) {
            const status = await window.electronAPI.getSetting('sg_acting_director');
            setIsSgActingDirector(status === 'true');
        }
    };
    checkActingStatus();
    const interval = setInterval(checkActingStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const hasRole = (roles: Role[]) => {
    if (!user) return false;
    if (user.role === 'SUPERADMIN') return true;

    if (user.role === 'SECRETARY') {
        if (roles.includes('SECRETARY')) return true;
        if (roles.includes('DIRECTOR') && isSgActingDirector) return true;
    }

    return roles.includes(user.role);
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
