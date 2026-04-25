import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Employees from './pages/Employees';
import Devices from './pages/Devices';
import Attendance from './pages/Attendance';
import EmployeeProfile from './pages/EmployeeProfile';
import Shifts from './pages/Shifts';
import Leave from './pages/Leave';
import ApplyLeave from './pages/ApplyLeave';
import Approvals from './pages/Approvals';
import CreateEmployee from './pages/CreateEmployee';
import BulkManageEmployees from './pages/BulkManageEmployees';
import IndividualAttendanceReport from './pages/IndividualAttendanceReport';
import LateReport from './pages/LateReport';
import AbsentReport from './pages/AbsentReport';
import MobilePunch from './pages/MobilePunch';
import MobilePunchReport from './pages/MobilePunchReport';
import Holidays from './pages/Holidays';
import DeviceConfig from './pages/DeviceConfig';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import { getCurrentSession, setCurrentSession, getCompanyById, checkSupabase } from './services/api';
import { AuthSession } from './types';
import { IconBell, IconSearch, IconMenu, IconX, IconUser, IconAlertCircle } from './components/Icons';
import { Modal, Button } from './components/UI';

const SessionContext = React.createContext<{
  session: AuthSession | null;
  login: (session: AuthSession) => void;
  logout: () => void;
}>({
  session: null,
  login: () => {},
  logout: () => {},
});

export const useSession = () => React.useContext(SessionContext);

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { session, logout } = useSession();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const [companyName, setCompanyName] = useState('Company HRM');

  useEffect(() => {
    const loadCompany = async () => {
      if (session && session.companyId) {
        const company = await getCompanyById(session.companyId);
        if (company) {
          setCompanyName(company.name);
        }
      }
    };
    loadCompany();
  }, [session]);

  if (isLoginPage) return <>{children}</>;

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadEmployees = async () => {
      if (session) {
        const fetchEmployees = (await import('./services/api')).fetchEmployees;
        const data = await fetchEmployees();
        setEmployees(data);
      }
    };
    loadEmployees();
  }, [session]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background text-text font-sans selection:bg-primary/30">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <div className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} flex-1 flex flex-col min-h-screen transition-all duration-300`}>
        {/* Top Header */}
        <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between font-bold">
          <div className="flex items-center gap-2 md:gap-4 text-textMuted text-sm ">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-surfaceHighlight rounded-lg text-text transition-colors"
              title="Toggle Sidebar"
            >
              <IconMenu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center uppercase tracking-widest text-[11px] whitespace-nowrap">
              <span>{session?.isSuperAdmin ? 'Central Control' : companyName}</span>
            </div>
          </div>

          {/* Center Search Bar - Hidden on small screens */}
          <div className="flex-1 max-w-sm mx-4 hidden lg:block relative">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-textMuted group-focus-within:text-primary transition-colors">
                <IconSearch className="w-4 h-4" />
              </div>
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="block w-full pl-10 pr-3 py-1.5 bg-surfaceHighlight/50 border border-border rounded-xl text-sm placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-normal"
                value={globalSearchTerm}
                onChange={(e) => {
                  setGlobalSearchTerm(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                onFocus={() => setShowSearchSuggestions(true)}
              />
            </div>

            {showSearchSuggestions && globalSearchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-[110] animate-in slide-in-from-top-2 duration-200">
                <div className="p-2 border-b border-border bg-surfaceHighlight/30">
                  <p className="text-[10px] font-bold text-textMuted uppercase tracking-wider">Employee Suggestions</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {employees
                    .filter(e => e.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) || e.id.toLowerCase().includes(globalSearchTerm.toLowerCase()))
                    .slice(0, 8)
                    .map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          navigate(`/employees/${emp.id}`);
                          setGlobalSearchTerm('');
                          setShowSearchSuggestions(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surfaceHighlight transition-colors border-b border-border last:border-0"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-sm font-bold text-text truncate uppercase tracking-tight">{emp.name}</p>
                          <p className="text-[10px] text-textMuted truncate uppercase tracking-tight">{emp.id} • {emp.department}</p>
                        </div>
                      </button>
                    ))}
                  {employees.filter(e => e.name.toLowerCase().includes(globalSearchTerm.toLowerCase()) || e.id.toLowerCase().includes(globalSearchTerm.toLowerCase())).length === 0 && (
                    <div className="p-4 text-center text-sm text-textMuted italic">No employees found.</div>
                  )}
                </div>
              </div>
            )}
            {showSearchSuggestions && (
              <div className="fixed inset-0 z-[105]" onClick={() => setShowSearchSuggestions(false)} />
            )}
          </div>

          <div className="flex items-center gap-3 md:gap-6">
             {/* Mobile search icon */}
             <button className="lg:hidden p-2 text-textMuted hover:text-text transition-colors">
                <IconSearch className="w-5 h-5" />
             </button>

             <button className="relative p-2 text-textMuted hover:text-text transition-colors group">
                <IconBell className="w-5 h-5 group-hover:shake transition-transform" />
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-danger text-[10px] text-white rounded-full flex items-center justify-center font-bold ring-2 ring-surface">
                  3
                </span>
             </button>

             <div className="flex items-center gap-3 md:gap-5 pl-3 md:pl-6 border-l border-border">
                 <div className="relative">
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex flex-col text-right cursor-pointer hover:opacity-80 transition-opacity"
                  >
                     <span className="text-xs text-text font-bold uppercase">{session?.isSuperAdmin ? 'Super Admin' : 'Company Admin'}</span>
                     <span className="text-[10px] text-primary uppercase">Menu</span>
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[90]" 
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl py-2 transition-all z-[100]">
                        <button 
                          onClick={() => {
                            setShowProfileModal(true);
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-textMuted hover:text-text hover:bg-surfaceHighlight transition-colors"
                        >
                          <IconUser className="w-4 h-4" />
                          <span>My Profile</span>
                        </button>
                        <button 
                          onClick={() => {
                            handleLogout();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-danger/5 transition-colors border-t border-border mt-1 pt-2"
                        >
                          <IconX className="w-4 h-4" />
                          <span>Logout Account</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold border border-primary/20 cursor-pointer" onClick={() => setShowProfileModal(true)}>
                   {session?.userEmail.charAt(0).toUpperCase()}
                </div>
             </div>
          </div>
        </header>

        {/* Admin Profile Modal */}
        <Modal 
          isOpen={showProfileModal} 
          onClose={() => setShowProfileModal(false)} 
          title="Admin Profile"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-surfaceHighlight rounded-xl border border-border">
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold uppercase">
                {session?.userEmail.charAt(0)}
              </div>
              <div>
                <h4 className="text-lg font-bold text-text">{session?.isSuperAdmin ? 'Super Admin' : 'Company Admin'}</h4>
                <p className="text-sm text-textMuted">{session?.userEmail}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surfaceHighlight/30 rounded-lg border border-border">
                  <p className="text-[10px] text-textMuted uppercase font-bold mb-1">Role</p>
                  <p className="text-sm font-medium">{session?.isSuperAdmin ? 'Full Access' : 'Company Manager'}</p>
                </div>
                <div className="p-3 bg-surfaceHighlight/30 rounded-lg border border-border">
                  <p className="text-[10px] text-textMuted uppercase font-bold mb-1">Account Type</p>
                  <p className="text-sm font-medium">Administrator</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={() => setShowProfileModal(false)}>Close</Button>
            </div>
          </div>
        </Modal>

        {/* Content Area */}
        <main className="flex-1 overflow-x-hidden">
           {children}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState<AuthSession | null>(getCurrentSession());
  const isSupabaseReady = checkSupabase();

  const login = (newSession: AuthSession) => {
    setCurrentSession(newSession);
    setSession(newSession);
  };

  const logout = () => {
    setCurrentSession(null);
    setSession(null);
  };

  return (
    <SessionContext.Provider value={{ session, login, logout }}>
      <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={session?.isSuperAdmin ? <Layout><AdminPanel /></Layout> : <Navigate to="/login" replace />} />
      
      {session?.isSuperAdmin ? (
        <>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </>
      ) : session ? (
        <>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/employees" element={<Layout><Employees /></Layout>} />
          <Route path="/employees/create" element={<Layout><CreateEmployee /></Layout>} />
          <Route path="/employees/bulk" element={<Layout><BulkManageEmployees /></Layout>} />
          <Route path="/employees/:id" element={<Layout><EmployeeProfile /></Layout>} />
          <Route path="/attendance" element={<Layout><Attendance /></Layout>} />
          <Route path="/attendance/individual" element={<Layout><IndividualAttendanceReport /></Layout>} />
          <Route path="/attendance/late" element={<Layout><LateReport /></Layout>} />
          <Route path="/attendance/absent" element={<Layout><AbsentReport /></Layout>} />
          <Route path="/attendance/mobile-punch" element={<Layout><MobilePunch /></Layout>} />
          <Route path="/attendance/mobile-report" element={<Layout><MobilePunchReport /></Layout>} />
          <Route path="/holidays" element={<Layout><Holidays /></Layout>} />
          <Route path="/devices" element={<Layout><Devices /></Layout>} />
          <Route path="/devices/config/:id" element={<Layout><DeviceConfig /></Layout>} />
          <Route path="/settings" element={<Layout><Settings /></Layout>} />
          <Route path="/shifts" element={<Layout><Shifts /></Layout>} />
          <Route path="/leave" element={<Layout><Leave /></Layout>} />
          <Route path="/apply-leave" element={<Layout><ApplyLeave /></Layout>} />
          <Route path="/approvals" element={<Layout><Approvals /></Layout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
    </SessionContext.Provider>
  );
};

export default App;