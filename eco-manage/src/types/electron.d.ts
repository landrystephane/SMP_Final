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
  addSubject: (subject: any) => Promise<any>;
  getClasses: () => Promise<any[]>;
  getUsers: () => Promise<any[]>;
  addUser: (user: any) => Promise<any>;
  changePassword: (data: { userId: number, newPassword: string }) => Promise<any>;
  getTuitionFees: () => Promise<any[]>;
  updateTuitionFee: (data: { classId: number, totalFee: number, registrationFee?: number }) => Promise<any>;
  getInstallments: () => Promise<any[]>;
  getClassInstallmentFees: () => Promise<any[]>;
  updateClassInstallmentFee: (data: { classId: number, installmentId: number, amount: number }) => Promise<any>;
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (data: { key: string, value: string }) => Promise<any>;
  saveAttendance: (data: { studentId: number, date: string, hours: number, userId: number }) => Promise<any>;
  getAttendance: (data: { studentId: number, term: number }) => Promise<any>;
  updateGPS?: (lat: number, lng: number) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
