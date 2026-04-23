const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  getStudents: () => ipcRenderer.invoke('db:getStudents'),
  addStudent: (student) => ipcRenderer.invoke('db:addStudent', student),
  getGrades: (filters) => ipcRenderer.invoke('db:getGrades', filters),
  saveGrades: (grades) => ipcRenderer.invoke('db:saveGrades', grades),
  getPayments: () => ipcRenderer.invoke('db:getPayments'),
  addPayment: (payment) => ipcRenderer.invoke('db:addPayment', payment),
  sendTicket: (ticket) => ipcRenderer.invoke('db:sendTicket', ticket),
  getTickets: () => ipcRenderer.invoke('db:getTickets'),
});
