import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  IconDashboard, 
  IconUsers, 
  IconSettings, 
  IconClock, 
  IconCalendar, 
  IconDevice, 
  IconFileText, 
  IconCheckCircle, 
  IconXCircle, 
  IconFingerprint 
} from './Icons';
import { useSession } from '../App';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const Sidebar = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const { session } = useSession();
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  useEffect(() => {
    if (session?.isSuperAdmin) {
      const getPendingCount = async () => {
        try {
          const { getCompanies, getCompanyBilling } = await import('../services/api');
          const comps = await getCompanies();
          let count = 0;
          for (const c of comps) {
            const b = await getCompanyBilling(c.id);
            if (b && b.payments) {
              const pending = b.payments.filter((p: any) => p.status === 'pending').length;
              count += pending;
            }
          }
          setPendingPaymentsCount(count);
        } catch (e) {
          console.error('Error loading pending count for sidebar:', e);
        }
      };

      getPendingCount();
      const timer = setInterval(getPendingCount, 15000);
      return () => clearInterval(timer);
    }
  }, [session]);
  
  const companyNav: NavItem[] = [
    { to: '/', label: 'Dashboard', icon: IconDashboard },
    { to: '/employees', label: 'Employees', icon: IconUsers },
    { to: '/attendance', label: 'Attendance', icon: IconClock },
    { to: '/attendance/individual', label: 'Individual Report', icon: IconFileText },
    { to: '/attendance/late', label: 'Late Report', icon: IconClock },
    { to: '/attendance/absent', label: 'Absent Report', icon: IconXCircle },
    { to: '/holidays', label: 'Holidays', icon: IconCalendar },
    { to: '/shifts', label: 'Shift Mgmt', icon: IconCalendar },
    { to: '/apply-leave', label: 'Apply Leave', icon: IconFileText },
    { to: '/leave', label: 'Leave Policy', icon: IconSettings },
    { to: '/approvals', label: 'Approvals', icon: IconCheckCircle },
    { to: '/attendance/mobile-punch', label: 'Mobile Punch', icon: IconDevice },
    { to: '/attendance/mobile-report', label: 'Mobile Report', icon: IconFileText },
    { to: '/devices', label: 'Devices', icon: IconDevice },
    { to: '/enrollment', label: 'Finger Enrollment', icon: IconFingerprint },
    { to: '/billing', label: 'Subscription & Billing', icon: IconFileText },
    { to: '/settings', label: 'Settings', icon: IconSettings },
  ];

  const superAdminNav: NavItem[] = [
    { to: '/admin/companies', label: 'Company Directory', icon: IconUsers },
    { 
      to: '/admin/pending-payments', 
      label: 'Pending Payments', 
      icon: IconCheckCircle,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined
    },
    { to: '/admin/locked-portals', label: 'Suspended Portals', icon: IconXCircle },
    { to: '/admin/active-portals', label: 'Active Portals', icon: IconCheckCircle },
    { to: '/admin/billing-settings', label: 'Billing Settings', icon: IconSettings },
  ];

  const employeeNav: NavItem[] = [
    { to: '/attendance/mobile-punch', label: 'Mobile Punch', icon: IconDevice },
    { to: '/attendance/individual', label: 'Individual Report', icon: IconFileText },
  ];

  const navItems = session?.isSuperAdmin ? superAdminNav : session?.isEmployee ? employeeNav : companyNav;

  return (
    <aside className={`fixed left-0 top-0 h-full ${isCollapsed ? 'w-20' : 'w-64'} bg-surface border-r border-border flex flex-col z-[60] transition-all duration-300 transform lg:translate-x-0 ${isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}`}>
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-border overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 min-w-[32px] rounded-lg bg-gradient-to-br from-[#1cbdb0] to-primary flex items-center justify-center text-white font-bold">
            N
          </div>
          {!isCollapsed && <span className="text-xl font-bold tracking-tight text-text">Nexus<span className="text-primary">HRM</span></span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {!isCollapsed && (
          <div className="px-3 mb-2 text-xs font-semibold text-textMuted uppercase tracking-wider">
            {session?.isSuperAdmin ? 'Central Control' : 'Portal Menu'}
          </div>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={isCollapsed ? item.label : ''}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-textMuted hover:text-text hover:bg-surfaceHighlight'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 min-w-[20px]" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </div>
            
            {/* Sidebar badge */}
            {item.badge !== undefined && (
              <span className="bg-red-500 text-white text-[10px] font-black h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
