const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),
  switchSchool: (schoolId) => ipcRenderer.invoke('auth:switchSchool', schoolId),

  // Students
  getStudents: (schoolId) => ipcRenderer.invoke('db:getStudents', schoolId),
  getStudentDetails: (id) => ipcRenderer.invoke('db:getStudentDetails', id),
  addStudent: (student) => ipcRenderer.invoke('db:addStudent', student),
  updateStudent: (student) => ipcRenderer.invoke('db:updateStudent', student),
  deleteStudent: (id) => ipcRenderer.invoke('db:deleteStudent', id),
  assignStudentToBus: (data) => ipcRenderer.invoke('db:assignStudentToBus', data),
  getParentStudents: (parentPhone) => ipcRenderer.invoke('db:getParentStudents', parentPhone),

  // Grades
  getGrades: (filters) => ipcRenderer.invoke('db:getGrades', filters),
  saveGrades: (grades) => ipcRenderer.invoke('db:saveGrades', grades),
  unlockGrades: (params) => ipcRenderer.invoke('db:unlockGrades', params),
  getClassSubjectsValidationStatus: (params) => ipcRenderer.invoke('db:getClassSubjectsValidationStatus', params),
  validateSubjectGrades: (params) => ipcRenderer.invoke('db:validateSubjectGrades', params),

  // Finance
  getPayments: (schoolId) => ipcRenderer.invoke('db:getPayments', schoolId),
  addPayment: (payment) => ipcRenderer.invoke('db:addPayment', payment),
  deletePayment: (id) => ipcRenderer.invoke('db:deletePayment', id),
  getTuitionFees: (schoolId) => ipcRenderer.invoke('db:getTuitionFees', schoolId),
  updateTuitionFee: (data) => ipcRenderer.invoke('db:updateTuitionFee', data),
  getInstallments: () => ipcRenderer.invoke('db:getInstallments'),
  getClassInstallmentFees: (schoolId) => ipcRenderer.invoke('db:getClassInstallmentFees', schoolId),
  updateClassInstallmentFee: (data) => ipcRenderer.invoke('db:updateClassInstallmentFee', data),

  // Pedagogy
  getGlobalSubjects: () => ipcRenderer.invoke('db:getGlobalSubjects'),
  addGlobalSubject: (subject) => ipcRenderer.invoke('db:addGlobalSubject', subject),
  deleteGlobalSubject: (id) => ipcRenderer.invoke('db:deleteGlobalSubject', id),
  getSchoolSubjects: (schoolId) => ipcRenderer.invoke('db:getSchoolSubjects', schoolId),
  toggleSchoolSubject: (data) => ipcRenderer.invoke('db:toggleSchoolSubject', data),
  getClassSubjects: (classId) => ipcRenderer.invoke('db:getClassSubjects', classId),
  assignSubjectToClass: (data) => ipcRenderer.invoke('db:assignSubjectToClass', data),
  removeSubjectFromClass: (data) => ipcRenderer.invoke('db:removeSubjectFromClass', data),
  getClasses: (schoolId) => ipcRenderer.invoke('db:getClasses', schoolId),

  // Users
  getUsers: (schoolId) => ipcRenderer.invoke('db:getUsers', schoolId),
  addUser: (user) => ipcRenderer.invoke('db:addUser', user),
  updateUser: (user) => ipcRenderer.invoke('db:updateUser', user),
  deleteUser: (id) => ipcRenderer.invoke('db:deleteUser', id),
  toggleUserActive: (data) => ipcRenderer.invoke('db:toggleUserActive', data),
  changePassword: (data) => ipcRenderer.invoke('db:changePassword', data),

  // Communication
  sendTicket: (ticket) => ipcRenderer.invoke('db:sendTicket', ticket),
  getTickets: (params) => ipcRenderer.invoke('db:getTickets', params),
  getAnnouncements: (schoolId) => ipcRenderer.invoke('db:getAnnouncements', schoolId),
  sendAnnouncement: (announcement) => ipcRenderer.invoke('db:sendAnnouncement', announcement),

  // Transport
  getBusRoutes: (schoolId) => ipcRenderer.invoke('db:getBusRoutes', schoolId),
  getRouteStudents: (routeId) => ipcRenderer.invoke('db:getRouteStudents', routeId),
  getTransportPoints: (routeId) => ipcRenderer.invoke('db:getTransportPoints', routeId),
  logTransport: (log) => ipcRenderer.invoke('db:logTransport', log),

  // Attendance
  saveAttendance: (data) => ipcRenderer.invoke('db:saveAttendance', data),
  saveAttendanceBulk: (data) => ipcRenderer.invoke('db:saveAttendanceBulk', data),
  getAttendance: (data) => ipcRenderer.invoke('db:getAttendance', data),

  // System/Admin
  getDashboardStats: (params) => ipcRenderer.invoke('db:getDashboardStats', params),
  getSetting: (key) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (data) => ipcRenderer.invoke('db:setSetting', data),
  getMobileKeys: () => ipcRenderer.invoke('db:getMobileKeys'),
  generateMobileKey: (data) => ipcRenderer.invoke('db:generateMobileKey', data),
  revokeMobileKey: (id) => ipcRenderer.invoke('db:revokeMobileKey', id),
  getSchools: () => ipcRenderer.invoke('db:getSchools'),
  addSchool: (school) => ipcRenderer.invoke('db:addSchool', school),
  deleteSchool: (id) => ipcRenderer.invoke('db:deleteSchool', id),
  updateSchoolSettings: (data) => ipcRenderer.invoke('db:updateSchoolSettings', data),
  getSchoolArchives: (schoolId) => ipcRenderer.invoke('db:getSchoolArchives', schoolId),
  createSchoolYearArchive: (data) => ipcRenderer.invoke('db:createSchoolYearArchive', data),
  getErrorLogs: () => ipcRenderer.invoke('db:getErrorLogs'),
  clearErrorLogs: () => ipcRenderer.invoke('db:clearErrorLogs'),
});
