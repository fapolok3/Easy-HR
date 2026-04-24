-- 1. Create Companies table
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  admin_email TEXT UNIQUE NOT NULL,
  admin_password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Org Settings table
CREATE TABLE IF NOT EXISTS org_settings (
  company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  departments JSONB DEFAULT '[]',
  designations JSONB DEFAULT '[]',
  employment_types JSONB DEFAULT '[]',
  workplaces JSONB DEFAULT '[]',
  shifts JSONB DEFAULT '[]',
  leave_policies JSONB DEFAULT '[]',
  holidays JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  status TEXT DEFAULT 'Active',
  join_date TEXT,
  end_date TEXT,
  email TEXT,
  phone TEXT,
  avatar TEXT,
  zk_device_id TEXT,
  shift TEXT,
  shift_effective_date TEXT,
  employment_type TEXT,
  gender TEXT,
  leave_policy TEXT,
  workplace TEXT,
  line_manager TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_line_manager BOOLEAN DEFAULT FALSE,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Leave Requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  leave_category TEXT,
  start_date TEXT,
  end_date TEXT,
  reason TEXT,
  status TEXT DEFAULT 'Pending',
  applied_date TEXT,
  attachment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Mobile Punches table
CREATE TABLE IF NOT EXISTS mobile_punches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  type TEXT, -- 'Punch In' or 'Punch Out'
  timestamp TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create API Config table
CREATE TABLE IF NOT EXISTS api_config (
  company_id TEXT PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  base_url TEXT NOT NULL,
  token TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Optional but Recommended)
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE mobile_punches ENABLE ROW LEVEL SECURITY;
