export interface ElectronAPI {
  login: (credentials: any) => Promise<any>;
  getStudents: () => Promise<any[]>;
  addStudent: (student: any) => Promise<any>;
  getGrades: (filters: any) => Promise<any[]>;
  saveGrades: (grades: any[]) => Promise<any>;
  unlockGrades: (params: { classId: number; term: number; month: string }) => Promise<any>;
  getPayments: () => Promise<any[]>;
  addPayment: (payment: any) => Promise<any>;
  sendTicket: (ticket: any) => Promise<any>;
  getTickets: () => Promise<any[]>;
  getDashboardStats: () => Promise<any>;
  getSubjects: () => Promise<any[]>;
  getClasses: () => Promise<any[]>;
  getUsers: () => Promise<any[]>;
  addUser: (user: any) => Promise<any>;
  updateGPS?: (lat: number, lng: number) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
