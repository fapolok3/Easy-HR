import { ApiConfig, Employee, AttendanceRecord, Device, AttendanceApiResponse } from '../types';

// Constants for LocalStorage keys
const LS_API_CONFIG = 'nexushrm_api_config';
const LS_LOCAL_EMPLOYEES = 'easyhr_local_employees';
const LS_ORG_SETTINGS = 'easyhr_org_settings';
const LS_LEAVE_REQUESTS = 'nexushrm_leave_requests';
const LS_COMPANIES = 'nexushrm_companies';
const LS_AUTH_SESSION = 'nexushrm_auth_session';

const DEFAULT_BASE_URL = 'https://test.api-inovace360.com/api/v1';

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
  companyId?: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  lateAfter: string;
  earlyExitBefore: string;
  offDays?: string[];
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

const DEFAULT_ORG_SETTINGS: OrgSettings = {
  departments: ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance'],
  designations: ['Manager', 'Software Engineer', 'Executive', 'Intern'],
  employmentTypes: ['Full Time', 'Part Time', 'Contract', 'Intern'],
  workplaces: ['Head Office', 'Remote', 'Branch Office'],
  shifts: [
    {
      id: '1',
      name: 'Regular',
      startTime: '09:00 am',
      endTime: '06:00 pm',
      lateAfter: '09:10 am',
      earlyExitBefore: '05:50 pm'
    }
  ],
  leavePolicies: [
    {
      id: '1',
      name: 'Standard Policy',
      categories: [
        {
          id: 'c1',
          name: 'Casual Leave',
          maxLeaves: 10,
          applicability: 'All',
          eligibleAfterDays: 0,
          fileRequiredAfterDays: 3,
          backtrackLimitDays: 7
        },
        {
          id: 'c2',
          name: 'Sick Leave',
          maxLeaves: 12,
          applicability: 'All',
          eligibleAfterDays: 0,
          fileRequiredAfterDays: 2,
          backtrackLimitDays: 3
        }
      ]
    }
  ]
};

// --- MULTI-TENANCY HELPERS ---
const getTenantKey = (baseKey: string, companyId: string) => `tenant_${companyId}_${baseKey}`;

export const getCompanies = (): Company[] => {
  const stored = localStorage.getItem(LS_COMPANIES);
  return stored ? JSON.parse(stored) : [];
};

export const getCompanyById = (id: string): Company | null => {
  const companies = getCompanies();
  return companies.find(c => c.id === id) || null;
};

export const saveCompanies = (companies: Company[]) => {
  localStorage.setItem(LS_COMPANIES, JSON.stringify(companies));
};

export const getCurrentSession = (): AuthSession | null => {
  const stored = localStorage.getItem(LS_AUTH_SESSION);
  return stored ? JSON.parse(stored) : null;
};

export const setCurrentSession = (session: AuthSession | null) => {
  if (session) {
    localStorage.setItem(LS_AUTH_SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(LS_AUTH_SESSION);
  }
};

export const getOrgSettings = (): OrgSettings => {
  const session = getCurrentSession();
  const companyId = session?.companyId || 'default';
  const key = getTenantKey(LS_ORG_SETTINGS, companyId);
  const stored = localStorage.getItem(key);
  
  if (!stored) return DEFAULT_ORG_SETTINGS;
  
  try {
    const parsed = JSON.parse(stored);
    
    // Migration: Convert string[] shifts to Shift[] objects if needed
    let shifts = parsed.shifts || [];
    if (shifts.length > 0 && typeof shifts[0] === 'string') {
      shifts = shifts.map((name: string, index: number) => ({
        id: String(index + 1),
        name: name,
        startTime: '09:00 am',
        endTime: '06:00 pm',
        lateAfter: '09:10 am',
        earlyExitBefore: '05:50 pm'
      }));
    }

    // Migration for leavePolicies
    let leavePolicies = parsed.leavePolicies || [];
    if (leavePolicies.length > 0 && typeof leavePolicies[0] === 'string') {
      leavePolicies = leavePolicies.map((name: string, index: number) => ({
        id: String(index + 1),
        name: name,
        categories: []
      }));
    }

    return {
      ...DEFAULT_ORG_SETTINGS,
      ...parsed,
      shifts: shifts.length > 0 ? shifts : DEFAULT_ORG_SETTINGS.shifts,
      leavePolicies: leavePolicies.length > 0 ? leavePolicies : DEFAULT_ORG_SETTINGS.leavePolicies
    };
  } catch (e) {
    return DEFAULT_ORG_SETTINGS;
  }
};

export const saveOrgSettings = (settings: OrgSettings) => {
  const session = getCurrentSession();
  const companyId = session?.companyId || 'default';
  const key = getTenantKey(LS_ORG_SETTINGS, companyId);
  localStorage.setItem(key, JSON.stringify(settings));
};

export const getApiConfig = (): ApiConfig => {
  const stored = localStorage.getItem(LS_API_CONFIG);
  return stored ? JSON.parse(stored) : { baseUrl: DEFAULT_BASE_URL, token: '' };
};

export const saveApiConfig = (config: ApiConfig) => {
  localStorage.setItem(LS_API_CONFIG, JSON.stringify(config));
};

// --- LOCAL EMPLOYEE PERSISTENCE ---
export const getLocalEmployees = (): Employee[] => {
  const session = getCurrentSession();
  const companyId = session?.companyId || 'default';
  const key = getTenantKey(LS_LOCAL_EMPLOYEES, companyId);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

export const saveLocalEmployee = (employee: Employee) => {
  const session = getCurrentSession();
  const companyId = session?.companyId || 'default';
  const key = getTenantKey(LS_LOCAL_EMPLOYEES, companyId);
  const local = getLocalEmployees();
  const index = local.findIndex(e => e.id === employee.id);
  if (index >= 0) {
    local[index] = employee;
  } else {
    local.push(employee);
  }
  localStorage.setItem(key, JSON.stringify(local));
};

export const deleteLocalEmployee = (id: string) => {
  const session = getCurrentSession();
  const companyId = session?.companyId || 'default';
  const key = getTenantKey(LS_LOCAL_EMPLOYEES, companyId);
  const local = getLocalEmployees().filter(e => e.id !== id);
  localStorage.setItem(key, JSON.stringify(local));
};

// --- LEAVE REQUEST PERSISTENCE ---
export const getLeaveRequests = (): LeaveRequest[] => {
  const session = getCurrentSession();
  const companyId = session?.companyId || 'default';
  const key = getTenantKey(LS_LEAVE_REQUESTS, companyId);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

export const saveLeaveRequest = (request: LeaveRequest) => {
  const session = getCurrentSession();
  const companyId = session?.companyId || 'default';
  const key = getTenantKey(LS_LEAVE_REQUESTS, companyId);
  const requests = getLeaveRequests();
  const index = requests.findIndex(r => r.id === request.id);
  if (index >= 0) {
    requests[index] = request;
  } else {
    requests.push(request);
  }
  localStorage.setItem(key, JSON.stringify(requests));
};

export const updateLeaveRequestStatus = (id: string, status: 'Approved' | 'Rejected') => {
  const session = getCurrentSession();
  const companyId = session?.companyId || 'default';
  const key = getTenantKey(LS_LEAVE_REQUESTS, companyId);
  const requests = getLeaveRequests();
  const index = requests.findIndex(r => r.id === id);
  if (index >= 0) {
    requests[index].status = status;
    localStorage.setItem(key, JSON.stringify(requests));
  }
};

const LS_MOBILE_PUNCHES = 'easyhr_mobile_punches';

export interface MobilePunch {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'Punch In' | 'Punch Out';
  timestamp: string; // ISO string
  latitude: number;
  longitude: number;
  address: string;
}

// --- MOBILE PUNCH PERSISTENCE ---
export const getMobilePunches = (): MobilePunch[] => {
  const session = getCurrentSession();
  const companyId = session?.companyId || 'default';
  const key = getTenantKey(LS_MOBILE_PUNCHES, companyId);
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
};

export const saveMobilePunch = (punch: Omit<MobilePunch, 'id'>) => {
  const session = getCurrentSession();
  const companyId = session?.companyId || 'default';
  const key = getTenantKey(LS_MOBILE_PUNCHES, companyId);
  const punches = getMobilePunches();
  const newPunch: MobilePunch = {
    ...punch,
    id: Math.random().toString(36).substr(2, 9)
  };
  punches.push(newPunch);
  localStorage.setItem(key, JSON.stringify(punches));
  return newPunch;
};

// --- REAL API IMPLEMENTATION ---

// Generic fetch wrapper with token injection
const apiFetch = async (endpoint: string) => {
  const config = getApiConfig();
  if (!config.token) throw new Error("Missing API Token");
  
  const baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${baseUrl}${endpoint}${separator}api_token=${config.token}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`API Request Failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const fetchEmployees = async (): Promise<Employee[]> => {
  const localEmployees = getLocalEmployees();
  
  try {
    const config = getApiConfig();
    if (!config.token) {
      return localEmployees;
    }

    const now = new Date();
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const end = formatDate(now);
    
    const endpoint = `/attendance_logs?start=${start}&end=${end}`;
    const response: AttendanceApiResponse = await apiFetch(endpoint);

    const apiEmployees: Map<number, Employee> = new Map();

    if (response && response.attendances && Array.isArray(response.attendances.data)) {
       response.attendances.data.forEach(person => {
          if (!apiEmployees.has(person.person_id)) {
             apiEmployees.set(person.person_id, {
                id: person.person_identifier || String(person.person_id),
                name: person.name || `Employee ${person.person_id}`,
                designation: 'Not Set',
                department: 'Not Set',
                status: 'Active',
                joinDate: '-',
                email: '-',
                phone: '-',
                gender: 'Not Set'
             });
          }
       });
    }

    const fetchedEmployees = Array.from(apiEmployees.values());
    
    // Merge: Prioritize local employees if they have same ID (for edits)
    // and include all others.
    const mergedMap = new Map<string, Employee>();
    fetchedEmployees.forEach(e => mergedMap.set(e.id, e));
    localEmployees.forEach(e => mergedMap.set(e.id, e));

    return Array.from(mergedMap.values());

  } catch (error) {
    console.warn("Failed to fetch API employees, returning local only", error);
    return localEmployees;
  }
};

export const fetchDevices = async (): Promise<Device[]> => {
  try {
    const config = getApiConfig();
    if (!config.token) return [];
    
    // Call: GET {{BASE URL}}/devices?api_token={{API TOKEN}}
    const data = await apiFetch('/devices');
    
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.warn("Failed to fetch devices from API", error);
    return [];
  }
};

const getDatesInRange = (startDate: string, endDate: string) => {
  const dates = [];
  let current = new Date(startDate);
  const last = new Date(endDate);
  
  // Set to midnight to avoid DST issues
  current.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  while (current <= last) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// --- SHIFT CALCULATION HELPERS ---
const parseTimeValue = (timeStr: string) => {
  if (!timeStr || timeStr === '-') return null;
  
  // Handle HH:MM:SS format
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    return h * 60 + m;
  }
  
  // Handle "hh:mm am/pm" format
  const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (match) {
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const ampm = match[3].toLowerCase();
    
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    
    return h * 60 + m;
  }
  
  return null;
};

const getEffectiveShift = (emp: Employee, date: string, orgShifts: Shift[]) => {
  if (!emp.shift || !emp.shiftEffectiveDate) return null;
  
  // If the log date is before the effective date, no shift applies
  if (date < emp.shiftEffectiveDate) return null;
  
  return orgShifts.find(s => s.id === emp.shift || s.name === emp.shift) || null;
};

export const fetchAttendance = async (startDate?: string, endDate?: string): Promise<AttendanceRecord[]> => {
  try {
    const config = getApiConfig();
    const orgSettings = getOrgSettings();
    const shifts = orgSettings.shifts;
    
    // Default dates if not provided: Today
    const now = new Date();
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const currentDay = formatDate(now);
    const start = startDate || currentDay;
    const end = endDate || currentDay;

    // Fetch all employees first to ensure we account for everyone
    const allEmployees = await fetchEmployees();
    const dates = getDatesInRange(start, end);

    const records: AttendanceRecord[] = [];

    // If no token, return all employees as absent for each date
    if (!config.token) {
      dates.forEach(date => {
        allEmployees.forEach(emp => {
          records.push({
            id: `${emp.id}-${date}`,
            employeeName: emp.name,
            employeeId: emp.id,
            date: date,
            checkIn: '-',
            checkOut: '-',
            status: 'Absent',
            location: '-',
            hours: '-'
          });
        });
      });
      return records;
    }

    // Call API for logs
    const endpoint = `/attendance_logs?start=${start}&end=${end}`;
    const response: AttendanceApiResponse = await apiFetch(endpoint);

    // Group API logs by employee and date
    const apiLogsMap = new Map<string, any>();
    if (response && response.attendances && Array.isArray(response.attendances.data)) {
      response.attendances.data.forEach(person => {
        if (person.logs) {
          const empId = person.person_identifier || String(person.person_id);
          Object.keys(person.logs).forEach(dateKey => {
            apiLogsMap.set(`${empId}-${dateKey}`, person.logs[dateKey]);
          });
        }
      });
    }

    // Group Mobile Punches by employee and date
    const mobilePunches = getMobilePunches();
    const mobilePunchesMap = new Map<string, { in?: string, out?: string }>();
    mobilePunches.forEach(p => {
      const dateKey = p.timestamp.split('T')[0];
      const key = `${p.employeeId}-${dateKey}`;
      const existing = mobilePunchesMap.get(key) || {};
      const timeStr = p.timestamp.split('T')[1].substring(0, 5); // HH:MM
      
      if (p.type === 'Punch In') {
        if (!existing.in || timeStr < existing.in) existing.in = timeStr;
      } else {
        if (!existing.out || timeStr > existing.out) existing.out = timeStr;
      }
      mobilePunchesMap.set(key, existing);
    });

    const holidays = orgSettings.holidays || [];
    const leaveRequests = getLeaveRequests().filter(r => r.status === 'Approved');

    // Helper for formatting
    const formatTime = (dateTimeStr: string) => {
      if (!dateTimeStr) return '-';
      return dateTimeStr.split(' ')[1] || dateTimeStr;
    };

    // Generate records for each day in range for every employee
    dates.forEach(date => {
      const isGlobalHoliday = holidays.find(h => h.date === date);
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

      allEmployees.forEach(emp => {
        let log = apiLogsMap.get(`${emp.id}-${date}`);
        const mobileLog = mobilePunchesMap.get(`${emp.id}-${date}`);
        
        // If no API log but has mobile punch, create a virtual log
        if (!log && mobileLog && (mobileLog.in || mobileLog.out)) {
          log = {
            start: mobileLog.in ? `${date} ${mobileLog.in}:00` : '',
            end: mobileLog.out ? `${date} ${mobileLog.out}:00` : '',
            hours: '0.00', // Basic placeholder
            location: 'Mobile'
          };
        }

        const shift = getEffectiveShift(emp, date, shifts);
        const isOffDay = shift?.offDays?.includes(dayName);
        const approvedLeave = leaveRequests.find(r => r.employeeId === emp.id && date >= r.startDate && date <= r.endDate);
        
        let status: AttendanceRecord['status'] = 'Absent';
        let isLate = false;
        let isEarlyExit = false;
        let expectedHours = '0.00';
        let checkIn = '-';
        let checkOut = '-';
        let hours = '-';

        if (isGlobalHoliday) {
          status = 'Holiday';
        } else if (approvedLeave) {
          status = 'Leave';
        } else if (isOffDay) {
          // Check if person worked on off day
          if (log) {
            checkIn = formatTime(log.start);
            checkOut = formatTime(log.end);
            hours = log.hours || '-';
            status = 'Present'; // Still Present but we'll mark as off-day in UI
            expectedHours = '0.00';
          } else {
            status = 'Off Day';
          }
        } else {
          // It's a working day
          if (shift) {
            const startMins = parseTimeValue(shift.startTime);
            const endMins = parseTimeValue(shift.endTime);
            if (startMins !== null && endMins !== null) {
              expectedHours = ((endMins - startMins) / 60).toFixed(2);
            }
          } else {
            expectedHours = '8.00';
          }

          if (log) {
            checkIn = formatTime(log.start);
            checkOut = formatTime(log.end);
            hours = log.hours || '-';
            status = log.start ? 'Present' : 'Absent';

            if (shift && log.start) {
              const checkInMins = parseTimeValue(checkIn);
              const lateAfterMins = parseTimeValue(shift.lateAfter);
              
              if (checkInMins !== null && lateAfterMins !== null && checkInMins > lateAfterMins) {
                status = 'Late';
                isLate = true;
              } else {
                status = 'On Time';
              }

              if (checkOut && checkOut !== '-') {
                const checkOutMins = parseTimeValue(checkOut);
                const earlyExitBeforeMins = parseTimeValue(shift.earlyExitBefore);
                
                if (checkOutMins !== null && earlyExitBeforeMins !== null && checkOutMins < earlyExitBeforeMins) {
                  isEarlyExit = true;
                }
              }
            }
          }
        }

        records.push({
          id: `${emp.id}-${date}`,
          employeeName: emp.name,
          employeeId: emp.id,
          date: date,
          checkIn,
          checkOut,
          status,
          isLate,
          isEarlyExit,
          isOffDay: !!isOffDay,
          location: log ? 'Device Sync' : '-',
          hours,
          expectedHours
        });
      });
    });

    // Sort by date descending
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.warn("Failed to fetch attendance:", error);
    return [];
  }
};

export const validateToken = async (token: string, baseUrl: string): Promise<boolean> => {
  try {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    // Using GET /devices as a lightweight check
    const url = `${cleanBaseUrl}/devices?api_token=${token}`;
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    return false;
  }
};