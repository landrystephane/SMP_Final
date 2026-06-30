export type Role = 'FOUNDER' | 'DIRECTOR' | 'SG' | 'BURSAR' | 'TEACHER' | 'ADVISOR' | 'DRIVER' | 'PARENT' | 'MAINTENANCE' | 'SUPERADMIN';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  schoolId: number;
  assignedClasses?: string; // JSON string
}

export interface Student {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  birth_place: string;
  gender: 'M' | 'F';
  parent_contact: string;
  emergency_contact?: string;
  medical_info?: string;
  address?: string;
  neighborhood?: string;
  class_id: number;
  section: 'FRANCOPHONE' | 'ANGLOPHONE';
  school_id: number;
  bus_route_id?: number;
}

export interface Class {
  id: number;
  school_id: number;
  name: string;
  section: 'FRANCOPHONE' | 'ANGLOPHONE';
  level: 'MATERNELLE' | 'PRIMAIRE';
  main_teacher_id?: number;
}

export interface Subject {
  id: number;
  school_id: number;
  name: string;
  domain: string;
  level: string;
  section: 'FRANCOPHONE' | 'ANGLOPHONE';
  coefficient: number;
}

export interface Installment {
  id: number;
  name: string;
  display_order: number;
}

export interface Payment {
  id: number;
  student_id: number;
  amount: number;
  payment_date: string;
  payment_type: string;
  installment_id?: number;
  received_by: number;
  receipt_number: string;
}
