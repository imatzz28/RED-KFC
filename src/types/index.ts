
export enum UserRole {
  ADMIN = 'ADMIN',
  COORDINATOR = 'COORDINATOR',
  SPECIALIST = 'SPECIALIST',
  LIDER = 'LIDER'
}

export enum JobTitle {
  GERENTE = 'Gerente',
  SUBGERENTE = 'Subgerente',
  LIDER_TURNO = 'Líder de turno',
  ENTRENADOR = 'Entrenador',
  LICENCIA_EN_CURSO = 'Licencia en Curso',
  MIEMBRO_EQUIPO_FULL = 'Miembro de equipo Full',
  MIEMBRO_EQUIPO_ROLEX = 'Miembro de equipo Rolex',
  DOMICILIARIO = 'Domiciliario'
}

export const JobHierarchy: Record<string, number> = {
  [JobTitle.GERENTE]: 1,
  [JobTitle.SUBGERENTE]: 2,
  [JobTitle.LIDER_TURNO]: 3,
  [JobTitle.ENTRENADOR]: 4,
  [JobTitle.MIEMBRO_EQUIPO_FULL]: 5,
  [JobTitle.MIEMBRO_EQUIPO_ROLEX]: 6,
  [JobTitle.DOMICILIARIO]: 7
};

export interface User {
  id: string;
  username: string;
  role: UserRole;
  assignedZones: string[];
  assignedRestaurants: string[];
  assignedRegions: string[]; // Campo para filtrar por regiones
}

export interface StoreHistory {
  date: string;
  restaurantName: string;
  action: 'INGRESO' | 'TRASLADO' | 'RETIRO';
}

export interface Employee {
  id: string; // Cédula
  name: string;
  join_date: string;
  exit_date?: string; 
  title: JobTitle;
  restaurant_id: string;
  zone: string;
  active: boolean;
  history?: StoreHistory[];
}

export interface GradeEntry {
  employeeId: string;
  restaurantId: string; // Ubicación en el momento de la nota
  month: string; // YYYY-MM
  group: string;
  category: string;
  score: number; // 0-100
}

export interface Restaurant {
  id: string; // Ceco
  name: string;
  zone: string;
  region: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface HierarchyData {
  lockedMonths: string[]; 
  groupDConfig?: Record<string, { cat1: string, cat2: string }>; // Configuración mensual de temas Grupo D
  regions: {
    name: string;
    zones: {
      name: string;
      restaurantIds: string[];
    }[];
  }[];
}

// ── Banca ──────────────────────────────────────────────────────────────────
export type Certification = 'GBR' | 'GAR' | 'GER' | 'EEA';
export type BancaRole = 'Gerente' | 'Subgerente' | 'Líder de turno' | 'Entrenador' | 'Entrenador HRS' | 'Potencial';

export const BANCA_ROLES: BancaRole[] = ['Gerente', 'Subgerente', 'Líder de turno', 'Entrenador', 'Entrenador HRS', 'Potencial'];

export interface StoreIdeal {
  gerentes: number;
  lideresTurno: number;
  entrenadores: number;
}

export interface BancaData {
  assignments: StoreAssignment[];
  storeIdeals?: Record<string, StoreIdeal>;
}

export interface StoreLeader {
  employeeId: string;
  role: BancaRole;
  certifications: Certification[];
}

export interface StoreAssignment {
  restaurantId: string;
  members: StoreLeader[];
}
// ── Safe Hands ─────────────────────────────────────────────────────────────
export interface SafeHandsPerson {
  id: string; // Cedula
  name: string; // Nombre
  saStatus?: string; // Seguridad de Alimentos
  restaurantId?: string;
  lastIssueDate?: string; // Fecha
  createdAt?: string;
}

export interface SafeHandsCert {
  id?: string;
  employeeId: string;
  restaurantId: string;
  issueDate: string;
  expiryDate: string;
  certificateCode: string;
  signatureUrl?: string;
  createdAt?: string;
}

export interface SafeHandsSettings {
  signatureBase64?: string;
  responsibleName: string;
}
