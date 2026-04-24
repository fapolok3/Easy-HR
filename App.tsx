import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import IndividualAttendanceReport from './pages/IndividualAttendanceReport';
import LateReport from './pages/LateReport';
import AbsentReport from './pages/AbsentReport';
import MobilePunch from './pages/MobilePunch';
import MobilePunchReport from './pages/MobilePunchReport';
import Holidays from './pages/Holidays';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import { getCurrentSession, setCurrentSession, getCompanyById } from './services/api';
import { IconBell, IconSearch, IconMenu, IconX, IconUser } from './components/Icons';
import { Modal, Button } from './components/UI';

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const session = getCurrentSession();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const [companyName, setCompanyName] = useState('Company HRM');

  useEffect(() => {
    if (session && session.companyId) {
      const company = getCompanyById(session.companyId);
      if (company) {
        setCompanyName(company.name);
      }
    }
  }, [session]);

  if (isLoginPage) return <>{children}</>;

  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = () => {
    setCurrentSession(null);
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-background text-text font-sans selection:bg-primary/30">
      <Sidebar isCollapsed={isSidebarCollapsed} />
      <div className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} flex-1 flex flex-col min-h-screen transition-all duration-300`}>
        {/* Top Header */}
        <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-border sticky top-0 z-50 px-8 flex items-center justify-between font-bold">
          <div className="flex items-center gap-4 text-textMuted text-sm ">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-surfaceHighlight rounded-lg text-text transition-colors"
              title="Toggle Sidebar"
            >
              <IconMenu className="w-5 h-5" />
            </button>
            <div className="flex items-center uppercase tracking-widest text-[11px]">
              <span>{session?.isSuperAdmin ? 'Central Control' : companyName}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <button className="relative p-2 text-textMuted hover:text-text transition-colors">
                <IconBell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-surface"></span>
             </button>

             <div className="flex items-center gap-5 pl-6 border-l border-border">
                <div className="relative group">
                  <button 
                    onClick={() => setShowProfileModal(true)}
                    className="flex flex-col text-right cursor-pointer group-hover:opacity-80 transition-opacity"
                  >
                     <span className="text-xs text-text font-bold uppercase">{session?.isSuperAdmin ? 'Super Admin' : 'Company Admin'}</span>
                     <span className="text-[10px] text-primary uppercase">Profile</span>
                  </button>

                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100]">
                    <button 
                      onClick={() => setShowProfileModal(true)}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-textMuted hover:text-text hover:bg-surfaceHighlight transition-colors"
                    >
                      <IconUser className="w-4 h-4" />
                      <span>My Profile</span>
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-danger/5 transition-colors border-t border-border mt-1 pt-2"
                    >
                      <IconX className="w-4 h-4" />
                      <span>Logout Account</span>
                    </button>
                  </div>
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
  const session = getCurrentSession();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {session?.isSuperAdmin ? (
        <>
          <Route path="/admin" element={<Layout><AdminPanel /></Layout>} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </>
      ) : session ? (
        <>
          <Route path="/" element={<Layout><Dashboard /></Layout>} />
          <Route path="/employees" element={<Layout><Employees /></Layout>} />
          <Route path="/employees/create" element={<Layout><CreateEmployee /></Layout>} />
          <Route path="/employees/:id" element={<Layout><EmployeeProfile /></Layout>} />
          <Route path="/attendance" element={<Layout><Attendance /></Layout>} />
          <Route path="/attendance/individual" element={<Layout><IndividualAttendanceReport /></Layout>} />
          <Route path="/attendance/late" element={<Layout><LateReport /></Layout>} />
          <Route path="/attendance/absent" element={<Layout><AbsentReport /></Layout>} />
          <Route path="/attendance/mobile-punch" element={<Layout><MobilePunch /></Layout>} />
          <Route path="/attendance/mobile-report" element={<Layout><MobilePunchReport /></Layout>} />
          <Route path="/holidays" element={<Layout><Holidays /></Layout>} />
          <Route path="/devices" element={<Layout><Devices /></Layout>} />
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
  );
};

export default App;