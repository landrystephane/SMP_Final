import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isRestoringSession: boolean;
  hasRole: (roles: Role[]) => boolean;
  switchSchool: (schoolId: number) => Promise<void>;
  exitImpersonation: () => Promise<void>;
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

  const [isRestoringSession, setIsRestoringSession] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return !!savedUser && typeof window !== 'undefined' && !!(window as any).electronAPI;
  });

  useEffect(() => {
    if (user && window.electronAPI) {
      window.electronAPI.restoreSession(user)
        .then(() => {
          setIsRestoringSession(false);
        })
        .catch(err => {
          console.error("Failed to restore main process session:", err);
          setIsRestoringSession(false);
        });
    } else {
      setIsRestoringSession(false);
    }
  }, [user]);

  const login = async (username: string, password: string) => {
    if (window.electronAPI) {
        try {
            const result = await window.electronAPI.login({ username, password });

            if (result && result.error) {
                throw new Error(result.error);
            }

            if (result) {
                // Ensure role is correctly handled from DB
                const userObj: User = {
                    ...result,
                    role: result.role || 'FOUNDER' // Fallback to avoid role_undefined
                };
                setUser(userObj);
                localStorage.setItem('user', JSON.stringify(userObj));
            } else {
                throw new Error('Invalid credentials');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            throw err;
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
        } else if (lowerUser === 'superadmin' && password === 'superadmin') {
            const mockUser: User = { id: 3, username: 'superadmin', fullName: 'Super Développeur', role: 'SUPERADMIN', schoolId: 1 };
            setUser(mockUser);
            localStorage.setItem('user', JSON.stringify(mockUser));
        } else {
            throw new Error('Invalid credentials');
        }
    }
  };

  const logout = async () => {
    if (window.electronAPI) {
        await window.electronAPI.logout();
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('impersonated_school_id');
  };

  const switchSchool = async (schoolId: number) => {
      if (user?.role === 'SUPERADMIN' && window.electronAPI) {
          try {
              await window.electronAPI.switchSchool(schoolId);
              const updatedUser = { ...user, schoolId };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
              localStorage.setItem('impersonated_school_id', schoolId.toString());
          } catch (err) {
              console.error("Erreur de changement d'école", err);
          }
      }
  };

  const exitImpersonation = async () => {
      if (user?.role === 'SUPERADMIN' && window.electronAPI) {
          try {
              await window.electronAPI.switchSchool(0);
              const updatedUser = { ...user, schoolId: undefined };
              setUser(updatedUser);
              localStorage.setItem('user', JSON.stringify(updatedUser));
              localStorage.removeItem('impersonated_school_id');
          } catch (err) {
              console.error("Erreur de sortie d'impersonation", err);
          }
      }
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

    if (user.role === 'SG') {
        if (roles.includes('SG')) return true;
        if (roles.includes('DIRECTOR') && isSgActingDirector) return true;
    }

    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user && !isRestoringSession, isRestoringSession, hasRole, switchSchool, exitImpersonation }}>
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
