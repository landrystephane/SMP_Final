export type Role = 'FOUNDER' | 'DIRECTOR' | 'SECRETARY' | 'BURSAR' | 'TEACHER' | 'ADVISOR' | 'DRIVER' | 'MAINTENANCE';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
}

export interface Student {
  id: number;
  matricule: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  gender: 'M' | 'F';
  parentContact: string;
  address: string;
  classId: number;
  section: 'FRANCOPHONE' | 'ANGLOPHONE';
}

export interface Class {
  id: number;
  name: string;
  section: 'FRANCOPHONE' | 'ANGLOPHONE';
  level: 'MATERNELLE' | 'PRIMAIRE';
  mainTeacherId?: number;
  assistantTeacherId?: number;
}

export interface Ticket {
  id: number;
  senderId: number;
  receiverRole: Role;
  subject: string;
  message: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
}
