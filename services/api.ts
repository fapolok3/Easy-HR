import { ApiConfig, Employee, AttendanceRecord, Device, AttendanceApiResponse, Company, AuthSession, OrgSettings, LeaveRequest, MobilePunch, Shift, Holiday, LeavePolicy, Fingerprint, EnrollmentStatus, AdvanceRoster } from '../types';
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

export const clearSessionData = () => {
  localStorage.removeItem(LS_AUTH_SESSION);
  localStorage.removeItem(LS_API_CONFIG);
};

export const setCurrentSession = (session: AuthSession | null) => {
  // Always clear previous data before setting new session to avoid contamination
  localStorage.removeItem(LS_AUTH_SESSION);
  localStorage.removeItem(LS_API_CONFIG);
  
  if (session) {
    localStorage.setItem(LS_AUTH_SESSION, JSON.stringify(session));
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
    return (data || []).map((item: any) => {
      if (!item) return null;
      return {
        id: item.id,
        name: item.name,
        adminEmail: item.admin_email,
        adminPassword: item.admin_password,
        createdAt: item.created_at
      };
    }).filter((c): c is Company => c !== null);
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
  
  // 2. Create default api config for new company
  try {
    await supabase.from('api_config').insert({
      company_id: newCompany.id,
      base_url: DEFAULT_BASE_URL,
      token: ''
    });
  } catch (e) {
    console.error('Exception creating default api config:', e);
  }
  
  // 3. Create default org settings for new company
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
    
    // If no company session, we might be a super admin or not logged in yet
    if (!companyId) {
      const stored = localStorage.getItem(LS_API_CONFIG);
      return stored ? JSON.parse(stored) : { baseUrl: DEFAULT_BASE_URL, token: '' };
    }

    // Always fetch latest from Supabase for the current company
    const { data, error } = await supabase.from('api_config').select('*').eq('company_id', companyId).maybeSingle();
    
    if (error || !data) {
      // If no config found in DB, return defaults but DON'T fallback to a potentially stale LS config
      return { baseUrl: DEFAULT_BASE_URL, token: '' };
    }

    const config = {
      baseUrl: data.base_url,
      token: data.token || '',
      secretKey: data.secret_key || ''
    };
    
    // Update cache for the CURRENT company
    localStorage.setItem(LS_API_CONFIG, JSON.stringify(config));
    
    return config;
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

    const { data, error } = await supabase.from('api_config').upsert({
      company_id: companyId,
      base_url: config.baseUrl,
      token: config.token,
      secret_key: config.secretKey
    }, { onConflict: 'company_id' }).select();

    if (error) {
      console.error('Error saving api config to supabase:', error);
      // Fallback or re-throw? For now just log more info
      if (error.code === '42501') {
        console.error('RLS Policy violation on api_config table');
      }
    } else {
      console.log('Successfully saved api_config to Supabase:', data);
    }
  } catch (err) {
    console.error(err);
  }
};

// --- STORAGE HELPERS ---
export const uploadEmployeeAvatar = async (file: File, employeeId: string): Promise<string | null> => {
  try {
    if (!checkSupabase()) return null;
    
    // File validation
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds 2MB limit.');
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Unsupported file format. Please use JPG, PNG, or WEBP.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err: any) {
    console.error('Error uploading avatar:', err);
    throw err;
  }
};

export const deleteEmployeeAvatar = async (url: string) => {
  try {
    if (!checkSupabase()) return;
    
    // Extract path from public URL
    // Format: .../storage/v1/object/public/avatars/avatars/filename
    // Or simpler if we know the structure
    const pathParts = url.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    const { error } = await supabase.storage
      .from('avatars')
      .remove([`avatars/${fileName}`]);
      
    if (error) console.error('Error deleting avatar from storage:', error);
  } catch (err) {
    console.error('deleteEmployeeAvatar exception:', err);
  }
};

// --- EMPLOYEE PERSISTENCE ---
export const getEmployeeByCredentials = async (emailPhone: string, password: string): Promise<Employee | null> => {
  try {
    if (!checkSupabase()) return null;
    
    // Search by email
    let { data, error } = await supabase.from('employees')
      .select('*')
      .eq('email', emailPhone)
      .eq('password', password)
      .maybeSingle();
      
    // If not found, search by phone
    if (!data) {
      const result = await supabase.from('employees')
        .select('*')
        .eq('phone', emailPhone)
        .eq('password', password)
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      designation: data.designation,
      department: data.department,
      status: data.status,
      joinDate: data.join_date,
      endDate: data.end_date,
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatar_url,
      zkDeviceId: data.zk_device_id,
      shift: data.shift,
      shiftEffectiveDate: data.shift_effective_date,
      employmentType: data.employment_type,
      gender: data.gender,
      leavePolicy: data.leave_policy,
      workplace: data.workplace,
      lineManager: data.line_manager,
      isAdmin: data.is_admin,
      isLineManager: data.is_line_manager,
      password: data.password,
      companyId: data.company_id
    };
  } catch (err) {
    console.error('getEmployeeByCredentials error:', err);
    return null;
  }
};

export const checkGlobalEmailExists = async (email: string): Promise<boolean> => {
  try {
    if (!checkSupabase()) return false;
    const { count, error } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .or(`email.eq.${email},phone.eq.${email}`);
    
    if (error) {
      console.error('checkGlobalEmailExists error:', error);
      return false;
    }
    return (count || 0) > 0;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export const getLocalEmployees = async (): Promise<Employee[]> => {
  try {
    if (!checkSupabase()) return [];
    const session = getCurrentSession();
    const companyId = session?.companyId;
    
    let query = supabase.from('employees').select('*');
    if (companyId) {
      query = query.eq('company_id', companyId);
    } else if (!session?.isSuperAdmin) {
      return [];
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching employees:', error);
      return [];
    }

    return (data || []).map((item: any) => {
      if (!item) return null;
      return {
        id: item.id,
        name: item.name,
        designation: item.designation,
        department: item.department,
        status: item.status,
        joinDate: item.join_date,
        endDate: item.end_date,
        email: item.email,
        phone: item.phone,
        avatarUrl: item.avatar_url,
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
        password: item.password,
        companyId: item.company_id
      };
    }).filter((e): e is Employee => e !== null);
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
      avatar_url: employee.avatarUrl,
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

    return (data || []).map((item: any) => {
      if (!item) return null;
      return {
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
      };
    }).filter((r): r is LeaveRequest => r !== null);
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
    
    let query = supabase.from('mobile_punches').select('*');
    if (companyId) {
      query = query.eq('company_id', companyId);
    } else if (!session?.isSuperAdmin) {
      return [];
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching mobile punches:', error);
      return [];
    }

    console.log(`getMobilePunches: Retrieved ${data?.length || 0} records from Supabase`);

    return (data || []).map((item: any) => {
      if (!item) return null;
      return {
        id: item.id,
        companyId: item.company_id,
        employeeId: item.employee_id,
        employeeName: item.employee_name,
        type: item.type,
        timestamp: item.timestamp,
        latitude: item.latitude,
        longitude: item.longitude,
        address: item.address
      };
    }).filter((p): p is MobilePunch => p !== null);
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const saveMobilePunch = async (punch: Omit<MobilePunch, 'id'>): Promise<MobilePunch | null> => {
  try {
    if (!checkSupabase()) return null;
    const session = getCurrentSession();
    let companyId = punch.companyId || session?.companyId;
    
    // If companyId is still missing, try to fetch it from the employee's record
    if (!companyId && punch.employeeId) {
      console.log('saveMobilePunch: companyId missing, attempting to resolve from employeeId:', punch.employeeId);
      const { data: empData } = await supabase
        .from('employees')
        .select('company_id')
        .eq('id', punch.employeeId)
        .maybeSingle();
      
      if (empData?.company_id) {
        companyId = empData.company_id;
        console.log('saveMobilePunch: Resolved companyId from employee record:', companyId);
      }
    }

    if (!companyId) {
      // If we are a Super Admin, and the employee doesn't have a companyId,
      // maybe we can find a company that this employee belongs to if they are in the employees table
      // (The code above already tried maybeSingle on employees table)
      console.warn('saveMobilePunch: No companyId available after resolution attempts.', { 
        punch, 
        sessionCompanyId: session?.companyId,
        isSuperAdmin: session?.isSuperAdmin 
      });
      return null;
    }

    console.log('saveMobilePunch: Inserting record into mobile_punches', { companyId, employeeId: punch.employeeId });

    const { data: insertedData, error } = await supabase.from('mobile_punches').insert({
      company_id: companyId,
      employee_id: String(punch.employeeId),
      employee_name: punch.employeeName || 'Unknown',
      type: punch.type,
      timestamp: punch.timestamp,
      latitude: punch.latitude,
      longitude: punch.longitude,
      address: punch.address || 'Unknown Location'
    }).select();

    if (error) {
       console.error('Error saving mobile punch to Supabase:', error);
       // Inform the user about the probable cause
       if (error.code === '42P01') {
         console.error('CRITICAL: The table "mobile_punches" does not exist. Please run the SQL schema in your Supabase SQL Editor.');
       }
       if (error.code === '23503') {
         console.error('CRITICAL: Foreign key violation. Check if company_id or employee_id exists in their respective tables.', { companyId, employeeId: punch.employeeId });
       }
       return null;
    }

    if (!insertedData || insertedData.length === 0) {
       console.error('No data returned after saving mobile punch');
       return null;
    }

    const data = insertedData[0];
    return {
      id: data.id,
      companyId: data.company_id,
      employeeId: data.employee_id,
      employeeName: data.employee_name,
      type: data.type,
      timestamp: data.timestamp,
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.address
    };
  } catch (err) {
    console.error('Critical exception in saveMobilePunch:', err);
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

    const session = getCurrentSession();
    const companyId = session?.companyId;

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
                gender: 'Not Set',
                companyId: companyId
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

    // Fetch advance rosters for relevant months
    const startObj = new Date(start);
    const endObj = new Date(end);
    const monthsNeeded = new Set<string>();
    let curr = new Date(startObj.getFullYear(), startObj.getMonth(), 1);
    while (curr <= endObj) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      monthsNeeded.add(`${y}-${m}`);
      curr.setMonth(curr.getMonth() + 1);
    }
    
    const advanceAssignmentsMap = new Map<string, string>();
    for (const mStr of Array.from(monthsNeeded)) {
       const rosters = await getAdvanceRoster(mStr);
       rosters.forEach(r => {
          Object.keys(r.assignments).forEach(dateStr => {
             advanceAssignmentsMap.set(`${r.employeeId}-${dateStr}`, r.assignments[dateStr]);
          });
       });
    }

    // Unified punch collection
    const punchesByEmpDate = new Map<string, Set<string>>();
    const mobileKeys = new Set<string>();
    const deviceKeys = new Set<string>();

    const formatTime = (dateTimeStr: string) => {
      if (!dateTimeStr) return '-';
      return dateTimeStr.split(' ')[1] || dateTimeStr;
    };

    const addPunch = (empId: string, date: string, time: string, isMobile: boolean) => {
      if (!time || time === '-' || time === '00:00:00' || time === '00:00') return;
      const key = `${empId}-${date}`;
      const existing = punchesByEmpDate.get(key) || new Set<string>();
      existing.add(time);
      punchesByEmpDate.set(key, existing);
      if (isMobile) mobileKeys.add(key);
      else deviceKeys.add(key);
    };

    // Group Mobile Punches by employee and date
    const mobilePunches = await getMobilePunches();
    mobilePunches.forEach(p => {
      // Convert UTC timestamp to local date for Bangladesh/Local reporting
      const timestamp = new Date(p.timestamp);
      const y = timestamp.getFullYear();
      const m = String(timestamp.getMonth() + 1).padStart(2, '0');
      const d = String(timestamp.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${d}`;
      const timeStr = String(timestamp.getHours()).padStart(2, '0') + ':' + String(timestamp.getMinutes()).padStart(2, '0');
      addPunch(String(p.employeeId), dateKey, timeStr, true);
    });

    const holidays = orgSettings.holidays || [];
    const allLeaveRequests = await getLeaveRequests();
    const leaveRequests = allLeaveRequests.filter(r => r.status === 'Approved');

    // Group API logs by employee and date
    if (config.token) {
      try {
        const endpoint = `/attendance_logs?start=${start}&end=${end}`;
        const response: AttendanceApiResponse = await apiFetch(endpoint);
        if (response && response.attendances && Array.isArray(response.attendances.data)) {
          response.attendances.data.forEach(person => {
            if (person.logs) {
              const empId = person.person_identifier || String(person.person_id);
              Object.keys(person.logs).forEach(dateKey => {
                const log = person.logs[dateKey];
                if (log.start) addPunch(empId, dateKey, formatTime(log.start), false);
                if (log.end) addPunch(empId, dateKey, formatTime(log.end), false);
              });
            }
          });
        }
      } catch (err) {
        console.error('fetchAttendance API error:', err);
      }
    }

    const records: AttendanceRecord[] = [];

    // Generate records for each day in range for every employee
    dates.forEach(date => {
      const isGlobalHoliday = holidays.find(h => h.date === date);
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

      allEmployees.forEach(emp => {
        const empIdStr = String(emp.id);
        const empDateKey = `${empIdStr}-${date}`;
        const punchSet = punchesByEmpDate.get(empDateKey);
        const punchArray = punchSet ? Array.from(punchSet).sort() : [];
        
        let checkIn = '-';
        let checkOut = '-';
        let hours = '-';
        let source = '-';
        
        if (punchArray.length > 0) {
          checkIn = punchArray[0];
          if (punchArray.length > 1) {
             checkOut = punchArray[punchArray.length - 1];
             const inMins = parseTimeValue(checkIn);
             const outMins = parseTimeValue(checkOut);
             if (inMins !== null && outMins !== null) {
               hours = ((outMins - inMins) / 60).toFixed(2);
             }
          }
          
          const hasMobile = mobileKeys.has(empDateKey);
          const hasDevice = deviceKeys.has(empDateKey);
          if (hasMobile && hasDevice) source = 'Device + Mobile';
          else if (hasMobile) source = 'Mobile';
          else if (hasDevice) source = 'Device Sync';
        }
        
        // Priority for shift: 
        // 1. Advance Roster override
        // 2. Default employee shift
        const advanceShiftId = advanceAssignmentsMap.get(empDateKey);
        let shift = getEffectiveShift(emp, date, shifts);
        let isOffDay = shift?.offDays?.includes(dayName);

        if (advanceShiftId === 'Off Day') {
           isOffDay = true;
           shift = null;
        } else if (advanceShiftId) {
           const found = shifts.find(s => s.id === advanceShiftId);
           if (found) {
              shift = found;
              isOffDay = false; 
           }
        }

        const approvedLeave = leaveRequests.find(r => r.employeeId === emp.id && date >= r.startDate && date <= r.endDate);
        
        let status: AttendanceRecord['status'] = 'Absent';
        let isLate = false;
        let isEarlyExit = false;
        let expectedHours = '0.00';

        if (isGlobalHoliday) {
          status = 'Holiday';
          expectedHours = '0.00';
          if (punchArray.length > 0) {
            // Worked on holiday
            status = 'Present'; 
          }
        } else if (approvedLeave) {
          status = 'Leave';
          expectedHours = '0.00'; 
        } else if (isOffDay) {
          status = 'Off Day';
          expectedHours = '0.00';
          if (punchArray.length > 0) {
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

          if (punchArray.length > 0) {
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
             // If no logs and date is in the future, set status to blank instead of Absent
             if (date > currentDay) {
               status = '';
             } else {
               status = 'Absent';
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
          isHoliday: !!isGlobalHoliday,
          location: source,
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
        avatar_url: updated.avatarUrl,
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

// --- DEVICE ALLOCATIONS & ENROLLMENT (Based on Inovace docs) ---

export const getFingerprints = async (personIdentifier: string): Promise<Fingerprint[]> => {
  try {
    const encodedId = encodeURIComponent(personIdentifier);
    return await apiFetch(`/people/${encodedId}/fingerprints`);
  } catch (err) {
    console.error('Error fetching fingerprints:', err);
    return [];
  }
};

export const deleteFingerprints = async (personIdentifier: string, fingerprints: { finger_id?: number, hand?: string, finger?: string }[]) => {
  try {
    const config = await getApiConfig();
    const encodedId = encodeURIComponent(personIdentifier);
    const url = `${config.baseUrl.replace(/\/$/, '')}/people/${encodedId}/fingerprints?api_token=${config.token}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fingerprints })
    });

    if (!response.ok) throw new Error('Delete failed');
    return await response.json();
  } catch (err) {
    console.error('Error deleting fingerprints:', err);
    throw err;
  }
};

export const startEnrollment = async (deviceIdentifier: string, personIdentifier: string, hand: string, finger: string) => {
  try {
    const config = await getApiConfig();
    const url = `${config.baseUrl.replace(/\/$/, '')}/devices/${deviceIdentifier}/startEnrollment?api_token=${config.token}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ person_identifier: personIdentifier, hand, finger })
    });

    return await response.json();
  } catch (err) {
    console.error('Error starting enrollment:', err);
    throw err;
  }
};

export const stopEnrollment = async (deviceIdentifier: string) => {
  try {
    const config = await getApiConfig();
    const url = `${config.baseUrl.replace(/\/$/, '')}/devices/${deviceIdentifier}/stopEnrollment?api_token=${config.token}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });

    return await response.json();
  } catch (err) {
    console.error('Error stopping enrollment:', err);
    throw err;
  }
};

export const getEnrollmentStatus = async (deviceId: string, personId: string): Promise<EnrollmentStatus> => {
  try {
    const config = await getApiConfig();
    const url = `${config.baseUrl.replace(/\/$/, '')}/devices/enrollment_status?api_token=${config.token}&device_id=${deviceId}&person_id=${personId}`;
    
    // The documentation says GET with Body, which is unusual for fetch/GET. 
    // Usually, this would be query params. Let's try query params first as shown in my URL string above.
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    return await response.json();
  } catch (err) {
    console.error('Error getting enrollment status:', err);
    throw err;
  }
};

export const updateDeviceAllocation = async (deviceIdentifier: string, personIdentifier: string, action: 'allocate' | 'revoke') => {
  try {
    const config = await getApiConfig();
    const url = `${config.baseUrl.replace(/\/$/, '')}/devices/${deviceIdentifier}/allocations?api_token=${config.token}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ person_identifier: personIdentifier, action }])
    });

    return await response.json();
  } catch (err) {
    console.error(`Error updating allocation (${action}):`, err);
    throw err;
  }
};

export const batchDeviceAllocations = async (action: 'allocate' | 'revoke', personIdentifiers: string[], deviceIds: string[]) => {
  try {
    const config = await getApiConfig();
    const url = `${config.baseUrl.replace(/\/$/, '')}/devices/batch-allocations?api_token=${config.token}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action, person_identifiers: personIdentifiers, device_ids: deviceIds })
    });

    return await response.json();
  } catch (err) {
    console.error('Error in batch allocations:', err);
    throw err;
  }
};

export const saveBulkEmployees = async (employees: Partial<Employee>[]) => {
  try {
    if (!checkSupabase()) return;
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return;

    const upsertData = employees.map(emp => ({
      id: emp.id,
      company_id: companyId,
      name: emp.name || 'New Employee',
      designation: emp.designation || 'Not Set',
      department: emp.department || 'Not Set',
      status: emp.status || 'Active',
      join_date: emp.joinDate || new Date().toISOString().split('T')[0],
      email: emp.email || '',
      phone: emp.phone || '',
      gender: emp.gender || 'Not Set',
      employment_type: emp.employmentType || 'Full Time',
      workplace: emp.workplace || 'Head Office',
      avatar_url: emp.avatarUrl || '',
      password: emp.password || '123456'
    }));

    if (upsertData.length === 0) return;

    const { error } = await supabase.from('employees').upsert(upsertData);
    if (error) throw error;
  } catch (err) {
    console.error('Error in bulk saving employees:', err);
    throw err;
  }
};

export const getAdvanceRoster = async (month: string): Promise<AdvanceRoster[]> => {
  try {
    if (!checkSupabase()) return [];
    const session = getCurrentSession();
    const companyId = session?.companyId;
    if (!companyId) return [];

    const { data, error } = await supabase.from('advance_roster')
      .select('*')
      .eq('company_id', companyId)
      .eq('month', month);

    if (error) {
       console.error('Error fetching advance roster:', error);
       return [];
    }

    return (data || []).map(item => ({
      id: item.id,
      companyId: item.company_id,
      employeeId: item.employee_id,
      employeeName: item.employee_name,
      month: item.month,
      assignments: item.assignments || {}
    }));
  } catch (err) {
    console.error(err);
    return [];
  }
};

export const saveAdvanceRoster = async (roster: AdvanceRoster) => {
  try {
    if (!checkSupabase()) return;
    const session = getCurrentSession();
    const companyId = roster.companyId || session?.companyId;
    if (!companyId) return;

    const { error } = await supabase.from('advance_roster').upsert({
      id: roster.id || `${companyId}-${roster.employeeId}-${roster.month}`,
      company_id: companyId,
      employee_id: roster.employeeId,
      employee_name: roster.employeeName,
      month: roster.month,
      assignments: roster.assignments
    }, { onConflict: 'id' });

    if (error) console.error('Error saving advance roster:', error);
  } catch (err) {
    console.error(err);
  }
};
