import { ApiConfig, Employee, AttendanceRecord, Device, AttendanceApiResponse, Company, AuthSession, OrgSettings, LeaveRequest, MobilePunch, Shift, Holiday, LeavePolicy } from '../types';
import { supabase } from './supabaseClient';

export const checkSupabase = () => {
  if (!supabase) {
    console.warn('Supabase client is not initialized. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment variables.');
    return false;
  }
  return true;
};

// Constants for LocalStorage keys (keeping for session only)
const LS_API_CONFIG = 'nexushrm_api_config';
const LS_AUTH_SESSION = 'nexushrm_auth_session';

const DEFAULT_BASE_URL = 'https://test.api-inovace360.com/api/v1';

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
      color: '#1cbdb0',
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
  ],
  holidays: []
};

// --- AUTH SESSION HELPERS (Kept in LocalStorage for persistence) ---
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

// --- SUPABASE DATA ACCESS ---

export const getCompanies = async (): Promise<Company[]> => {
  try {
    if (!checkSupabase()) return [];
    const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
    return (data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      adminEmail: item.admin_email,
      adminPassword: item.admin_password,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.error('Fetch companies exception:', err);
    return [];
  }
};

export const getCompanyById = async (id: string): Promise<Company | null> => {
  try {
    if (!checkSupabase()) return null;
    const { data, error } = await supabase.from('companies').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      adminEmail: data.admin_email,
      adminPassword: data.admin_password,
      createdAt: data.created_at
    };
  } catch (err) {
    console.error('Fetch company by ID exception:', err);
    return null;
  }
};

export const saveCompanies = async (companies: Company[]) => {
  try {
    if (!checkSupabase()) return;
    for (const company of companies) {
      const { error } = await supabase.from('companies').upsert({
        id: company.id.length > 10 ? company.id : undefined,
        name: company.name,
        admin_email: company.adminEmail,
        admin_password: company.adminPassword
      });
      if (error) console.error('Error saving company:', error);
    }
  } catch (err) {
    console.error('Save companies exception:', err);
  }
};

export const createCompany = async (company: Omit<Company, 'id' | 'createdAt'>): Promise<Company> => {
  if (!checkSupabase()) {
    throw new Error('Supabase not initialized');
  }
  
  // 1. Create the company
  const { data: inserts, error: insertError } = await supabase.from('companies').insert({
    name: company.name,
    admin_email: company.adminEmail,
    admin_password: company.adminPassword
  }).select();
  
  if (insertError) {
     console.error('Error creating company record:', insertError);
     if (insertError.code === '23505') throw new Error('A company with this admin email already exists.');
     if (insertError.code === '42501') throw new Error('Permission denied: Please run the RLS policies in Supabase SQL Editor.');
     throw new Error(insertError.message || 'Failed to create company record');
  }

  if (!inserts || inserts.length === 0) {
    throw new Error('No data returned after company creation');
  }

  const newCompany = inserts[0];
  
  // 2. Create default org settings for new company
  try {
    const { error: settingsError } = await supabase.from('org_settings').insert({
      company_id: newCompany.id,
      departments: DEFAULT_ORG_SETTINGS.departments,
      designations: DEFAULT_ORG_SETTINGS.designations,
      employment_types: DEFAULT_ORG_SETTINGS.employmentTypes,
      workplaces: DEFAULT_ORG_SETTINGS.workplaces,
      shifts: DEFAULT_ORG_SETTINGS.shifts,
      leave_policies: DEFAULT_ORG_SETTINGS.leavePolicies,
      holidays: DEFAULT_ORG_SETTINGS.holidays || []
    });

    if (settingsError) {
      console.error('Error creating default org settings:', settingsError);
    }
  } catch (e) {
    console.error('Exception creating default settings:', e);
  }

  return {
    id: newCompany.id,
    name: newCompany.name,
    adminEmail: newCompany.admin_email,
    adminPassword: newCompany.admin_password,
    createdAt: newCompany.created_at
  };
};

export const deleteCompany = async (id: string) => {
  try {
    if (!checkSupabase()) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) console.error('Error deleting company:', error);
  } catch (err) {
    console.error(err);
  }
};

export const getOrgSettings = async (): Promise<OrgSettings> => {
  try {
    if (!checkSupabase()) return DEFAULT_ORG_SETTINGS;
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return DEFAULT_ORG_SETTINGS;

    const { data, error } = await supabase.from('org_settings').select('*').eq('company_id', companyId).single();
    if (error || !data) {
      return DEFAULT_ORG_SETTINGS;
    }

    return {
      departments: data.departments || [],
      designations: data.designations || [],
      employmentTypes: data.employment_types || [],
      workplaces: data.workplaces || [],
      shifts: data.shifts || [],
      leavePolicies: data.leave_policies || [],
      holidays: data.holidays || []
    };
  } catch (err) {
    console.error(err);
    return DEFAULT_ORG_SETTINGS;
  }
};

export const saveOrgSettings = async (settings: OrgSettings) => {
  try {
    if (!checkSupabase()) return;
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return;

    const { error } = await supabase.from('org_settings').upsert({
      company_id: companyId,
      departments: settings.departments,
      designations: settings.designations,
      employment_types: settings.employmentTypes,
      workplaces: settings.workplaces,
      shifts: settings.shifts,
      leave_policies: settings.leavePolicies,
      holidays: settings.holidays
    }, { onConflict: 'company_id' });

    if (error) console.error('Error saving org settings:', error);
  } catch (err) {
    console.error(err);
  }
};

export const getApiConfig = async (): Promise<ApiConfig> => {
  try {
    if (!checkSupabase()) return { baseUrl: DEFAULT_BASE_URL, token: '' };
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) {
      const stored = localStorage.getItem(LS_API_CONFIG);
      return stored ? JSON.parse(stored) : { baseUrl: DEFAULT_BASE_URL, token: '' };
    }

    const { data, error } = await supabase.from('api_config').select('*').eq('company_id', companyId).maybeSingle();
    if (error || !data) {
      const stored = localStorage.getItem(LS_API_CONFIG);
      return stored ? JSON.parse(stored) : { baseUrl: DEFAULT_BASE_URL, token: '' };
    }

    return {
      baseUrl: data.base_url,
      token: data.token || ''
    };
  } catch (err) {
    console.error(err);
    return { baseUrl: DEFAULT_BASE_URL, token: '' };
  }
};

export const saveApiConfig = async (config: ApiConfig) => {
  localStorage.setItem(LS_API_CONFIG, JSON.stringify(config));
  
  try {
    if (!checkSupabase()) return;
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return;

    const { error } = await supabase.from('api_config').upsert({
      company_id: companyId,
      base_url: config.baseUrl,
      token: config.token
    }, { onConflict: 'company_id' });

    if (error) console.error('Error saving api config to supabase:', error);
  } catch (err) {
    console.error(err);
  }
};

// --- EMPLOYEE PERSISTENCE ---
export const getLocalEmployees = async (): Promise<Employee[]> => {
  try {
    if (!checkSupabase()) return [];
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return [];

    const { data, error } = await supabase.from('employees').select('*').eq('company_id', companyId);
    if (error) {
      console.error('Error fetching employees:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      designation: item.designation,
      department: item.department,
      status: item.status,
      joinDate: item.join_date,
      endDate: item.end_date,
      email: item.email,
      phone: item.phone,
      avatar: item.avatar,
      zkDeviceId: item.zk_device_id,
      shift: item.shift,
      shiftEffectiveDate: item.shift_effective_date,
      employmentType: item.employment_type,
      gender: item.gender,
      leavePolicy: item.leave_policy,
      workplace: item.workplace,
      lineManager: item.line_manager,
      isAdmin: item.is_admin,
      isLineManager: item.is_line_manager,
      password: item.password
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const saveLocalEmployee = async (employee: Employee) => {
  try {
    if (!checkSupabase()) return;
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return;

    const { error } = await supabase.from('employees').upsert({
      id: employee.id,
      company_id: companyId,
      name: employee.name,
      designation: employee.designation,
      department: employee.department,
      status: employee.status,
      join_date: employee.joinDate,
      end_date: employee.endDate,
      email: employee.email,
      phone: employee.phone,
      avatar: employee.avatar,
      zk_device_id: employee.zkDeviceId,
      shift: employee.shift,
      shift_effective_date: employee.shiftEffectiveDate,
      employment_type: employee.employmentType,
      gender: employee.gender,
      leave_policy: employee.leavePolicy,
      workplace: employee.workplace,
      line_manager: employee.lineManager,
      is_admin: employee.isAdmin,
      is_line_manager: employee.isLineManager,
      password: employee.password
    });

    if (error) console.error('Error saving employee:', error);
  } catch (err) {
    console.error(err);
  }
};

export const deleteLocalEmployee = async (id: string) => {
  try {
    if (!checkSupabase()) return;
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) console.error('Error deleting employee:', error);
  } catch (err) {
    console.error(err);
  }
};

// --- LEAVE REQUEST PERSISTENCE ---
export const getLeaveRequests = async (): Promise<LeaveRequest[]> => {
  try {
    if (!checkSupabase()) return [];
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return [];

    const { data, error } = await supabase.from('leave_requests').select('*').eq('company_id', companyId);
    if (error) {
      console.error('Error fetching leave requests:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      employeeId: item.employee_id,
      employeeName: item.employee_name,
      leaveCategory: item.leave_category,
      startDate: item.start_date,
      endDate: item.end_date,
      reason: item.reason,
      status: item.status,
      appliedDate: item.applied_date,
      attachment: item.attachment
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const saveLeaveRequest = async (request: LeaveRequest) => {
  try {
    if (!checkSupabase()) return;
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return;

    const { error } = await supabase.from('leave_requests').upsert({
      id: request.id.length > 20 ? request.id : undefined,
      company_id: companyId,
      employee_id: request.employeeId,
      employee_name: request.employeeName,
      leave_category: request.leaveCategory,
      start_date: request.startDate,
      end_date: request.endDate,
      reason: request.reason,
      status: request.status,
      applied_date: request.appliedDate,
      attachment: request.attachment
    });

    if (error) console.error('Error saving leave request:', error);
  } catch (err) {
    console.error(err);
  }
};

export const updateLeaveRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
  try {
    if (!checkSupabase()) return;
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return;

    const { error } = await supabase.from('leave_requests').update({ status }).eq('id', id).eq('company_id', companyId);
    if (error) console.error('Error updating leave request status:', error);
  } catch (err) {
    console.error(err);
  }
};

const LS_MOBILE_PUNCHES = 'easyhr_mobile_punches';

// --- MOBILE PUNCH PERSISTENCE ---
export const getMobilePunches = async (): Promise<MobilePunch[]> => {
  try {
    if (!checkSupabase()) return [];
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return [];

    const { data, error } = await supabase.from('mobile_punches').select('*').eq('company_id', companyId);
    if (error) {
      console.error('Error fetching mobile punches:', error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      employeeId: item.employee_id,
      employeeName: item.employee_name,
      type: item.type,
      timestamp: item.timestamp,
      latitude: item.latitude,
      longitude: item.longitude,
      address: item.address
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const saveMobilePunch = async (punch: Omit<MobilePunch, 'id'>): Promise<MobilePunch | null> => {
  try {
    if (!checkSupabase()) return null;
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return null;

    const { data, error } = await supabase.from('mobile_punches').insert({
      company_id: companyId,
      employee_id: punch.employeeId,
      employee_name: punch.employeeName,
      type: punch.type,
      timestamp: punch.timestamp,
      latitude: punch.latitude,
      longitude: punch.longitude,
      address: punch.address
    }).select().single();

    if (error) {
       console.error('Error saving mobile punch:', error);
       return null;
    }

    return {
      id: data.id,
      employeeId: data.employee_id,
      employeeName: data.employee_name,
      type: data.type,
      timestamp: data.timestamp,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address
    };
  } catch (err) {
    console.error(err);
    return null;
  }
};

// --- REAL API IMPLEMENTATION ---

// Generic fetch wrapper with token injection
const apiFetch = async (endpoint: string) => {
  const config = await getApiConfig();
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
  const localEmployees = await getLocalEmployees();
  
  try {
    const config = await getApiConfig();
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
    const config = await getApiConfig();
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
    const config = await getApiConfig();
    const orgSettings = await getOrgSettings();
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
    const mobilePunches = await getMobilePunches();
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
    const allLeaveRequests = await getLeaveRequests();
    const leaveRequests = allLeaveRequests.filter(r => r.status === 'Approved');

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

        // Initialize display values if log exists
        if (log) {
          checkIn = formatTime(log.start);
          checkOut = formatTime(log.end);
          hours = log.hours || '-';
        }

        if (isGlobalHoliday) {
          status = 'Holiday';
          expectedHours = '0.00';
          if (log && log.start) {
            // Worked on holiday
            status = 'Present'; 
          }
        } else if (approvedLeave) {
          status = 'Leave';
          expectedHours = '0.00'; // Or keep as 0? Usually leave doesn't expect hours
        } else if (isOffDay) {
          status = 'Off Day';
          expectedHours = '0.00';
          if (log && log.start) {
            // Worked on off day
            status = 'Present';
          }
        } else {
          // Regular working day
          if (shift) {
            const startMins = parseTimeValue(shift.startTime);
            const endMins = parseTimeValue(shift.endTime);
            if (startMins !== null && endMins !== null) {
              expectedHours = ((endMins - startMins) / 60).toFixed(2);
            }
          } else {
            expectedHours = '8.00';
          }

          if (log && log.start) {
            status = 'Present';

            if (shift) {
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
          } else {
             status = 'Absent';
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
          isHoliday: !!isGlobalHoliday,
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

export const resetApiToken = async (): Promise<boolean> => {
  try {
    if (!checkSupabase()) return false;
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return false;

    const { error } = await supabase
      .from('api_config')
      .update({ token: '' })
      .eq('company_id', companyId);

    if (error) {
      console.error('Error resetting token:', error);
      return false;
    }

    // Clear local storage too
    const stored = localStorage.getItem(LS_API_CONFIG);
    if (stored) {
      const config = JSON.parse(stored);
      localStorage.setItem(LS_API_CONFIG, JSON.stringify({ ...config, token: '' }));
    }

    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export const bulkUpdateEmployees = async (employees: Employee[], updates: Partial<Employee>) => {
  try {
    if (!checkSupabase()) return;
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return;

    const upsertData = employees.map(emp => {
      const updated = { ...emp, ...updates };
      return {
        id: updated.id,
        company_id: companyId,
        name: updated.name,
        designation: updated.designation,
        department: updated.department,
        status: updated.status,
        join_date: updated.joinDate,
        end_date: updated.endDate,
        email: updated.email,
        phone: updated.phone,
        avatar: updated.avatar,
        zk_device_id: updated.zkDeviceId,
        shift: updated.shift,
        shift_effective_date: updated.shiftEffectiveDate,
        employment_type: updated.employmentType,
        gender: updated.gender,
        leave_policy: updated.leavePolicy,
        workplace: updated.workplace,
        line_manager: updated.lineManager,
        is_admin: updated.isAdmin,
        is_line_manager: updated.isLineManager,
        password: updated.password
      };
    });

    if (upsertData.length === 0) return;

    const { error } = await supabase
      .from('employees')
      .upsert(upsertData);

    if (error) throw error;
  } catch (err) {
    console.error('Error in bulk update:', err);
    throw err;
  }
};
