export interface Employee {
  id: string;
  name: string;
  designation: string;
  department: string;
  status: 'Active' | 'Inactive' | 'Resigned' | 'Terminated';
  joinDate: string;
  endDate?: string;
  email: string;
  phone: string;
  avatar?: string;
  zkDeviceId?: string;
  shift?: string;
  shiftEffectiveDate?: string;
  employmentType?: string;
  gender: string;
  leavePolicy?: string;
  workplace?: string;
  lineManager?: string;
  isAdmin?: boolean;
  isLineManager?: boolean;
  password?: string;
  companyId?: string;
}

export interface Fingerprint {
  id: number;
  project_id: number;
  person_id: number;
  hand: string;
  finger: string;
  active: boolean;
}

export interface EnrollmentStatus {
  running: boolean;
  status: boolean;
  from: string;
  to: string;
  person_id: string;
  name: string;
}

export interface AttendanceStat {
  label: string;
  value: number;
  total: number;
  color: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
}

export interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  status: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'On Time' | 'Holiday' | 'Off Day' | 'Leave' | '';
  location: string;
  isLate?: boolean;
  isEarlyExit?: boolean;
  isOffDay?: boolean;
  isHoliday?: boolean;
  device?: string;
  hours?: string;
  expectedHours?: string;
}

export interface AttendanceLogEntry {
  date: string;
  start: string;
  end: string;
  hours: string;
}

export interface AttendancePersonRaw {
  person_id: number;
  person_identifier: string;
  name: string;
  logs: Record<string, AttendanceLogEntry>;
}

export interface AttendanceApiResponse {
  days: string[];
  attendances: {
    data: AttendancePersonRaw[];
  };
}

export interface Device {
  id: number;
  identifier: string;
  device_category_id: number;
  vendor_id: string;
  location: string;
  status: string;
  last_seen: string;
  description: string;
  type: string;
}

export interface ApiConfig {
  baseUrl: string;
  token: string;
  secretKey?: string;
}

export enum Department {
  Engineering = 'Engineering',
  HR = 'Human Resources',
  Sales = 'Sales',
  Marketing = 'Marketing',
  Support = 'Customer Support'
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
  lateAfter: string;
  earlyExitBefore: string;
  offDays?: string[];
}

export interface Company {
  id: string;
  name: string;
  adminEmail: string;
  adminPassword: string;
  createdAt: string;
}

export interface AuthSession {
  userEmail: string;
  isSuperAdmin: boolean;
  isEmployee?: boolean;
  employeeId?: string;
  companyId?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
}

export interface LeaveCategory {
  id: string;
  name: string;
  maxLeaves: number;
  applicability: 'All' | 'Male' | 'Female';
  eligibleAfterDays: number;
  fileRequiredAfterDays: number;
  backtrackLimitDays: number;
}

export interface LeavePolicy {
  id: string;
  name: string;
  categories: LeaveCategory[];
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveCategory: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedDate: string;
  attachment?: string;
}

export interface OrgSettings {
  departments: string[];
  designations: string[];
  employmentTypes: string[];
  workplaces: string[];
  shifts: Shift[];
  leavePolicies: LeavePolicy[];
  holidays?: Holiday[];
}

export interface MobilePunch {
  id: string;
  companyId?: string;
  employeeId: string;
  employeeName: string;
  type: 'Punch In' | 'Punch Out';
  timestamp: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface AdvanceRoster {
  id?: string;
  companyId?: string;
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  assignments: Record<string, string>; // date (YYYY-MM-DD) -> shiftId
}
