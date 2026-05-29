export interface ElectronAPI {
  login: (credentials: any) => Promise<any>;
  logout: () => Promise<any>;
  switchSchool: (schoolId: number) => Promise<any>;
  restoreSession: (user: any) => Promise<any>;
  getStudents: (schoolId?: number) => Promise<any[]>;
  getParentStudents: (parentPhone: string) => Promise<any[]>;
  addStudent: (student: any) => Promise<any>;
  getGrades: (filters: any) => Promise<any[]>;
  saveGrades: (grades: any[]) => Promise<any>;
  unlockGrades: (params: { classId: number; term: number; month: string }) => Promise<any>;
  getClassSubjectsValidationStatus: (params: { classId: number; term: number; month: string }) => Promise<any[]>;
  validateSubjectGrades: (params: { classId: number; subjectId: number; term: number; month: string }) => Promise<any>;
  getPayments: (schoolId?: number) => Promise<any[]>;
  addPayment: (payment: any) => Promise<any>;
  sendTicket: (ticket: any) => Promise<any>;
  getTickets: (params?: any) => Promise<any[]>;
  getAnnouncements: (schoolId?: number) => Promise<any[]>;
  sendAnnouncement: (announcement: any) => Promise<any>;
  getDashboardStats: (params: { schoolId: number, section?: string, level?: string }) => Promise<any>;
  getSubjects: (schoolId?: number) => Promise<any[]>;
  addSubject: (subject: any) => Promise<any>;
  getClasses: (schoolId?: number) => Promise<any[]>;
  getUsers: (schoolId?: number) => Promise<any[]>;
  addUser: (user: any) => Promise<any>;
  updateUser: (user: any) => Promise<any>;
  deleteUser: (id: number) => Promise<any>;
  changePassword: (data: { userId: number, newPassword: string }) => Promise<any>;
  getTuitionFees: (schoolId?: number) => Promise<any[]>;
  updateTuitionFee: (data: { classId: number, totalFee: number, registrationFee?: number }) => Promise<any>;
  getInstallments: () => Promise<any[]>;
  getClassInstallmentFees: (schoolId?: number) => Promise<any[]>;
  updateClassInstallmentFee: (data: { classId: number, installmentId: number, amount: number }) => Promise<any>;
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (data: { key: string, value: string }) => Promise<any>;
  saveAttendance: (data: any) => Promise<any>;
  getAttendance: (data: { classId?: number, date?: string, studentId?: number, term?: number }) => Promise<any>;
  getSchools: () => Promise<any[]>;
  getDeletedSchools: () => Promise<any[]>;
  addSchool: (school: any) => Promise<any>;
  updateSchool: (school: any) => Promise<any>;
  deleteSchool: (data: { id: number, password: string }) => Promise<any>;
  restoreSchool: (id: number) => Promise<any>;
  permanentlyDeleteSchool: (data: { id: number, password: string }) => Promise<any>;
  toggleSchoolStatus: (data: { id: number, isActive: boolean }) => Promise<any>;
  getGlobalSubjects: () => Promise<any[]>;
  addGlobalSubject: (subject: any) => Promise<any>;
  deleteGlobalSubject: (id: number) => Promise<any>;
  getSchoolSubjects: (schoolId: number) => Promise<any[]>;
  toggleSchoolSubject: (data: { schoolId: number, subjectId: number, isActive: boolean }) => Promise<any>;
  getClassSubjects: (classId: number) => Promise<any[]>;
  assignSubjectToClass: (data: { classId: number, subjectId: number, coefficient: number, isOptional: boolean }) => Promise<any>;
  removeSubjectFromClass: (data: { classId: number, subjectId: number }) => Promise<any>;
  getBusRoutes: (schoolId: number) => Promise<any[]>;
  getRouteStudents: (routeId: number) => Promise<any[]>;
  logTransport: (log: any) => Promise<any>;
  updateSchedule: (schedule: any) => Promise<any>;
  getSchedules: (schoolId: number) => Promise<any[]>;
  deleteSchedule: (id: number) => Promise<any>;
  getMobileKeys: () => Promise<any[]>;
  generateMobileKey: (data: { name: string, userId: number | null }) => Promise<any>;
  revokeMobileKey: (id: number) => Promise<any>;
  getStudentDetails: (studentId: number) => Promise<any>;
  updateStudent: (student: any) => Promise<any>;
  assignStudentToBus: (data: { studentId: number, routeId: number }) => Promise<any>;
  getTransportPoints: (routeId: number) => Promise<any[]>;
  deletePayment: (id: number) => Promise<any>;
  updateSchoolSettings: (data: any) => Promise<any>;
  getSchoolArchives: (schoolId?: number) => Promise<any[]>;
  createSchoolYearArchive: (data: { schoolId: number; yearName: string }) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
