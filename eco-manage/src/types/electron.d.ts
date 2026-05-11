export interface ElectronAPI {
  login: (credentials: any) => Promise<any>;
  getStudents: (schoolId?: number) => Promise<any[]>;
  addStudent: (student: any) => Promise<any>;
  getGrades: (filters: any) => Promise<any[]>;
  saveGrades: (grades: any[]) => Promise<any>;
  unlockGrades: (params: { classId: number; term: number; month: string }) => Promise<any>;
  getPayments: (schoolId?: number) => Promise<any[]>;
  addPayment: (payment: any) => Promise<any>;
  sendTicket: (ticket: any) => Promise<any>;
  getTickets: () => Promise<any[]>;
  getDashboardStats: (params: { schoolId: number, section?: string }) => Promise<any>;
  getSubjects: (schoolId?: number) => Promise<any[]>;
  addSubject: (subject: any) => Promise<any>;
  getClasses: (schoolId?: number) => Promise<any[]>;
  getUsers: (schoolId?: number) => Promise<any[]>;
  addUser: (user: any) => Promise<any>;
  changePassword: (data: { userId: number, newPassword: string }) => Promise<any>;
  getTuitionFees: (schoolId?: number) => Promise<any[]>;
  updateTuitionFee: (data: { classId: number, totalFee: number, registrationFee?: number }) => Promise<any>;
  getInstallments: () => Promise<any[]>;
  getClassInstallmentFees: (schoolId?: number) => Promise<any[]>;
  updateClassInstallmentFee: (data: { classId: number, installmentId: number, amount: number }) => Promise<any>;
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (data: { key: string, value: string }) => Promise<any>;
  saveAttendance: (data: any) => Promise<any>;
  getAttendance: (data: { studentId: number, term: number }) => Promise<any>;
  getSchools: () => Promise<any[]>;
  addSchool: (school: any) => Promise<any>;
  getBusRoutes: (schoolId: number) => Promise<any[]>;
  getRouteStudents: (routeId: number) => Promise<any[]>;
  logTransport: (log: any) => Promise<any>;
  updateSchedule: (schedule: any) => Promise<any>;
  getSchedules: (schoolId: number) => Promise<any[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
