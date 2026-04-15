export type UserRole = 'STUDENT' | 'ORGANIZER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BLOCKED';
export type EventStatus = 'DRAFT' | 'MODERATION' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type RegistrationStatus = 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'ATTENDED';

export interface User {
  id: string;
  login: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  studentProfile?: StudentProfile | null;
  organizerProfile?: OrganizerProfile | null;
}

export interface StudentProfile {
  id: string;
  fullName: string;
  birthDate?: string;
  phone?: string;
  avatarUrl?: string;
  institute?: { id: string; name: string; code?: string } | null;
  group?: string;
  yearOfStudy?: number;
  studyStatus: string;
}

export interface OrganizerProfile {
  id: string;
  fullName: string;
  position?: string;
  organizationName: string;
  organizationInfo?: string;
  contacts?: string;
  logoUrl?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type: string;
  organizer: { id: string; organizationName: string; contacts?: string; chatLink?: string };
  startAt: string;
  endAt?: string;
  registrationDeadline?: string;
  address: string;
  latitude: number;
  longitude: number;
  institute?: { id: string; name: string } | null;
  capacity?: number;
  registeredCount: number;
  status: EventStatus;
  coverImageUrl?: string;
  imageUrl?: string;
  images?: { url: string; order: number }[];
  contactEmail?: string;
  contactPhone?: string;
  chatLink?: string;
  isRegistered?: boolean;
  isCheckedIn?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; login: string; role: UserRole };
}

export interface Institute {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
}
