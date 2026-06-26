import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, schoolId?: number | null) => Promise<void>;
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
          window.electronAPI.getSchools().then((schools: any) => {
              const currentSchool = schools.find((s: any) => Number(s.id) === Number(user.schoolId)) || schools[0];
              document.title = currentSchool?.name || "Gestion Scolaire";
          }).catch(() => {});
        })
        .catch(err => {
          console.error("Session restore failed:", err);
          setIsRestoringSession(false);
          if (err?.message?.includes('401') || err?.message?.includes('expir') || err?.message?.includes('Authentification')) {
            setUser(null);
            localStorage.removeItem('user');
            localStorage.removeItem('saas_token');
          }
        });
    } else {
      setIsRestoringSession(false);
      document.title = "Gestion Scolaire";
    }
  }, [user]);

  const login = async (username: string, password: string, schoolId?: number | null) => {
    if (window.electronAPI) {
        try {
            const result = await window.electronAPI.login({ username, password, schoolId });

            if (result && result.error) {
                throw new Error(result.error);
            }

            if (result) {
                // Ensure role is correctly handled from DB
                const userObj: User = {
                    ...result,
                    role: result.role || 'TEACHER'
                };
                setUser(userObj);
                localStorage.setItem('user', JSON.stringify(userObj));
                
                // Update document title for alert boxes
                window.electronAPI.getSchools().then((schools: any) => {
                    const currentSchool = schools.find((s: any) => Number(s.id) === Number(userObj.schoolId)) || schools[0];
                    if (currentSchool && currentSchool.name) {
                        document.title = currentSchool.name;
                    }
                });
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
    try {
        if (window.electronAPI) {
            await window.electronAPI.logout();
        }
    } catch (e) {
        // Ignore API errors during logout
    }
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('saas_token');
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
    
    window.addEventListener('sg_mode_changed', checkActingStatus);
    const interval = setInterval(checkActingStatus, 30000);
    
    return () => {
        window.removeEventListener('sg_mode_changed', checkActingStatus);
        clearInterval(interval);
    };
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
