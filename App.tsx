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
import AdvanceRostering from './pages/AdvanceRostering';
import DeviceConfig from './pages/DeviceConfig';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Billing from './pages/Billing';
import { EnrollmentSystem } from './components/EnrollmentSystem';
import { Toaster } from 'sonner';
import { getCurrentSession, setCurrentSession, getCompanyById, checkSupabase, getCompanyBilling, getCompanyBillingStatus } from './services/api';
import { AuthSession } from './types';
import { IconBell, IconSearch, IconMenu, IconX, IconUser, IconAlertCircle } from './components/Icons';
import { Modal, Button } from './components/UI';

const SessionContext = React.createContext<{
  session: AuthSession | null;
  login: (session: AuthSession) => void;
  logout: () => void;
  systemLogo: string | null;
  setSystemLogo: (url: string | null) => void;
}>({
  session: null,
  login: () => {},
  logout: () => {},
  systemLogo: null,
  setSystemLogo: () => {},
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

  useEffect(() => {
    // Collapse sidebar by default on mobile
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoginPage) return <>{children}</>;

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const navigate = useNavigate();

  const [billing, setBilling] = useState<any>(null);
  const [showBillingReminder, setShowBillingReminder] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    const checkBillingStatus = async () => {
      if (session && !session.isSuperAdmin && session.companyId) {
        try {
          const { getCompanyBilling, getCompanyBillingStatus, getCompanyById } = await import('./services/api');
          const comp = await getCompanyById(session.companyId);
          if (comp) {
            const bill = await getCompanyBilling(session.companyId);
            setBilling(bill);
            const status = getCompanyBillingStatus(comp.createdAt, bill);
            
            const today = new Date();
            const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const currentDay = today.getDate();
            const cutoff = bill.cutoffDay ?? 10;
            
            // Check if current month is due and if today is between day 1 and cutoffDay (inclusive)
            const isCurrentMonthUnpaid = status.dueMonths.includes(currentMonthStr);
            if (isCurrentMonthUnpaid && currentDay >= 1 && currentDay <= cutoff && !bill.manualOverride) {
              setShowBillingReminder(true);
            } else {
              setShowBillingReminder(false);
            }
          }
        } catch (e) {
          console.error('Error loading billing reminder inside Layout:', e);
        }
      } else {
        setShowBillingReminder(false);
      }
    };

    checkBillingStatus();
    const interval = setInterval(checkBillingStatus, 15000); // Check status every 15 seconds
    return () => clearInterval(interval);
  }, [session]);

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

  useEffect(() => {
    const loadNotifications = async () => {
      if (!session) return;
      try {
        const list: any[] = [];
        const { getCompanies, getCompanyBilling, getLeaveRequests } = await import('./services/api');
        
        if (session.isSuperAdmin) {
          // Fetch pending payments
          const comps = await getCompanies();
          for (const c of comps) {
            const b = await getCompanyBilling(c.id);
            if (b && b.payments) {
              b.payments.forEach((p: any) => {
                if (p.status === 'pending') {
                  list.push({
                    id: `payment-${p.id || p.transactionId}`,
                    text: `Pending BDT ${p.amount} billing payment from ${c.name} (TrxID: ${p.transactionId})`,
                    link: '/admin/pending-payments',
                    type: 'payment'
                  });
                }
              });
            }
          }
        } else if (session.isEmployee) {
          // Employee: fetch their own leave requests
          const leaves = await getLeaveRequests();
          const myLeaves = leaves.filter((r: any) => r.employeeId === session.employeeId);
          myLeaves.forEach((r: any) => {
            if (r.status !== 'Pending') {
              list.push({
                id: `leave-${r.id}`,
                text: `Your ${r.leaveCategory} leave request (${r.startDate} to ${r.endDate}) has been ${r.status.toLowerCase()}.`,
                link: '/leave-requests',
                type: 'leave_status'
              });
            }
          });
        } else {
          // Company Admin: fetch pending leave requests
          const leaves = await getLeaveRequests();
          leaves.forEach((r: any) => {
            if (r.status === 'Pending') {
              list.push({
                id: `leave-pending-${r.id}`,
                text: `New leave request from ${r.employeeName} for ${r.leaveCategory} (${r.startDate} to ${r.endDate}).`,
                link: '/leave-requests',
                type: 'leave_pending'
              });
            }
          });
        }
        setNotifications(list);
      } catch (err) {
        console.warn('Error loading notifications:', err);
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [session]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background text-text font-sans selection:bg-primary/30">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      
      {/* Mobile Sidebar Overlay */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-[55] lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      <div className={`${isSidebarCollapsed ? 'ml-0 lg:ml-20' : 'ml-0 lg:ml-64'} flex-1 flex flex-col min-h-screen transition-all duration-300`}>
        {/* Subscription Due Warning Banner */}
        {showBillingReminder && (
          <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-red-600 text-white text-[11px] font-black uppercase tracking-wider px-4 py-2.5 text-center animate-in slide-in-from-top duration-300 flex items-center justify-center gap-2 border-b border-amber-500 shadow-sm shrink-0 z-50">
            <IconAlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
            <span>Reminder: Monthly subscription is due. Please clear payment by the {billing?.cutoffDay ?? 10}th of this month to avoid portal lock/suspension.</span>
            <button 
              onClick={() => navigate('/billing')} 
              className="ml-3 h-5.5 text-[9px] font-black uppercase py-0.5 px-3 bg-white text-amber-900 rounded-md hover:bg-amber-50 transition-colors shadow-sm"
            >
              Pay Now
            </button>
          </div>
        )}

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
          {!session?.isEmployee && (
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
          )}

          <div className="flex items-center gap-3 md:gap-6">
             {/* Mobile search icon */}
             <button className="lg:hidden p-2 text-textMuted hover:text-text transition-colors">
                <IconSearch className="w-5 h-5" />
             </button>

              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="relative p-2 text-textMuted hover:text-text transition-colors group cursor-pointer"
                >
                  <IconBell className="w-5 h-5 group-hover:shake transition-transform" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-danger text-[10px] text-white rounded-full flex items-center justify-center font-bold ring-2 ring-surface">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[90]" 
                      onClick={() => setIsNotificationsOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-xl shadow-xl py-2 transition-all z-[100] max-h-[360px] overflow-y-auto font-sans text-left">
                      <div className="px-4 py-2 border-b border-border flex justify-between items-center">
                        <span className="text-xs font-bold text-text uppercase tracking-wider">Notifications</span>
                        <span className="text-[10px] bg-primary/10 text-primary font-black px-2 py-0.5 rounded-full uppercase">
                          {notifications.length} Pending
                        </span>
                      </div>
                      
                      <div className="divide-y divide-border/50">
                        {notifications.length > 0 ? (
                          notifications.map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                if (notif.link) {
                                  navigate(notif.link);
                                }
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-surfaceHighlight/50 transition-colors flex flex-col gap-1 cursor-pointer"
                            >
                              <p className="text-xs text-text leading-relaxed font-semibold">
                                {notif.text}
                              </p>
                              <span className="text-[9px] text-primary uppercase font-black tracking-wider">
                                Click to resolve
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="p-6 text-center text-xs text-textMuted italic uppercase font-black tracking-wide">
                            No new notifications
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

             <div className="flex items-center gap-3 md:gap-5 pl-3 md:pl-6 border-l border-border">
                 <div className="relative">
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex flex-col text-right cursor-pointer hover:opacity-80 transition-opacity"
                  >
                     <span className="text-xs text-text font-bold uppercase">{session?.isSuperAdmin ? 'Super Admin' : session?.isEmployee ? 'Employee' : 'Company Admin'}</span>
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
                            if (session?.isEmployee) {
                              navigate(`/employees/${session.employeeId}`);
                            } else {
                              setShowProfileModal(true);
                            }
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
                <h4 className="text-lg font-bold text-text">{session?.isSuperAdmin ? 'Super Admin' : session?.isEmployee ? (employees.find(e => e.id === session.employeeId)?.name || 'Employee') : 'Company Admin'}</h4>
                <p className="text-sm text-textMuted">{session?.userEmail}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-surfaceHighlight/30 rounded-lg border border-border">
                  <p className="text-[10px] text-textMuted uppercase font-bold mb-1">Role</p>
                  <p className="text-sm font-medium">{session?.isSuperAdmin ? 'Full Access' : session?.isEmployee ? 'Employee Access' : 'Company Manager'}</p>
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
  const [isLocked, setIsLocked] = useState(false);
  const [systemLogo, setSystemLogo] = useState<string | null>(null);
  const isSupabaseReady = checkSupabase();

  const login = (newSession: AuthSession) => {
    setCurrentSession(newSession);
    setSession(newSession);
  };

  const logout = () => {
    setCurrentSession(null);
    setSession(null);
    setIsLocked(false);
  };

  useEffect(() => {
    const loadSystemLogo = async () => {
      try {
        const { getSystemLogoConfig, setFavicon } = await import('./services/api');
        const config = await getSystemLogoConfig();
        if (config && config.logoUrl) {
          setSystemLogo(config.logoUrl);
          setFavicon(config.logoUrl);
        }
      } catch (err) {
        console.warn('Failed to load global logo on mount:', err);
      }
    };
    loadSystemLogo();
  }, []);

  useEffect(() => {
    const checkLockStatus = async () => {
      if (session && !session.isSuperAdmin && session.companyId) {
        try {
          const comp = await getCompanyById(session.companyId);
          if (comp) {
            const billing = await getCompanyBilling(session.companyId);
            const status = getCompanyBillingStatus(comp.createdAt, billing);
            setIsLocked(status.isLocked);
          }
        } catch (e) {
          console.error('Error verifying billing status:', e);
        }
      } else {
        setIsLocked(false);
      }
    };
    
    checkLockStatus();
    // Re-verify billing status every 15 seconds
    const timer = setInterval(checkLockStatus, 15000);
    return () => clearInterval(timer);
  }, [session]);

  return (
    <SessionContext.Provider value={{ session, login, logout, systemLogo, setSystemLogo }}>
      <Toaster 
        theme="dark" 
        position="top-right" 
        richColors 
        containerStyle={{
          zIndex: 99999,
        }}
        toastOptions={{
          style: {
            borderRadius: '12px',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
          },
          success: {
            style: {
              background: '#10b981',
              color: '#fff',
            },
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
          info: {
            style: {
              background: '#3b82f6',
              color: '#fff',
            },
          },
          loading: {
            style: {
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            },
          },
        }}
      />
      <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      
      {session?.isSuperAdmin ? (
        <>
          <Route path="/admin" element={<Navigate to="/admin/companies" replace />} />
          <Route path="/admin/companies" element={<Layout><AdminPanel activeTab="companies" /></Layout>} />
          <Route path="/admin/pending-payments" element={<Layout><AdminPanel activeTab="pending-payments" /></Layout>} />
          <Route path="/admin/locked-portals" element={<Layout><AdminPanel activeTab="locked-portals" /></Layout>} />
          <Route path="/admin/active-portals" element={<Layout><AdminPanel activeTab="active-portals" /></Layout>} />
          <Route path="/admin/billing-settings" element={<Layout><AdminPanel activeTab="billing-settings" /></Layout>} />
          <Route path="*" element={<Navigate to="/admin/companies" replace />} />
        </>
      ) : session ? (
        isLocked ? (
          <>
            <Route path="/billing" element={<Billing />} />
            <Route path="*" element={<Navigate to="/billing" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/billing" element={<Layout><Billing /></Layout>} />
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
            <Route path="/advance-rostering" element={<Layout><AdvanceRostering /></Layout>} />
            <Route path="/leave" element={<Layout><Leave /></Layout>} />
            <Route path="/apply-leave" element={<Layout><ApplyLeave /></Layout>} />
            <Route path="/approvals" element={<Layout><Approvals /></Layout>} />
            <Route path="/enrollment" element={<Layout><EnrollmentSystem /></Layout>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
    </SessionContext.Provider>
  );
};

export default App;