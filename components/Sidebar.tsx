import React from 'react';
import { NavLink } from 'react-router-dom';
import { IconDashboard, IconUsers, IconSettings, IconClock, IconCalendar, IconDevice, IconFileText, IconCheckCircle, IconBot, IconXCircle } from './Icons';
import { useSession } from '../App';

const Sidebar = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const { session } = useSession();
  
  const companyNav = [
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
    { to: '/settings', label: 'Settings', icon: IconSettings },
  ];

  const superAdminNav = [
    { to: '/admin', label: 'Admin Dashboard', icon: IconDashboard },
  ];

  const employeeNav = [
    { to: '/attendance/mobile-punch', label: 'Mobile Punch', icon: IconDevice },
    { to: '/attendance/individual', label: 'Individual Report', icon: IconFileText },
  ];

  const navItems = session?.isSuperAdmin ? superAdminNav : session?.isEmployee ? employeeNav : companyNav;

  return (
    <aside className={`fixed left-0 top-0 h-full ${isCollapsed ? 'w-20' : 'w-64'} bg-surface border-r border-border flex flex-col z-[60] transition-all duration-300 transform lg:translate-x-0 ${isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}`}>
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-border overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 min-w-[32px] rounded-lg bg-gradient-to-br from-success to-primary flex items-center justify-center text-white font-bold">
            E
          </div>
          {!isCollapsed && <span className="text-xl font-bold tracking-tight text-text">Easy<span className="text-primary">HR</span></span>}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto overflow-x-hidden no-scrollbar">
        {!isCollapsed && (
          <div className="px-3 mb-2 text-xs font-semibold text-textMuted uppercase tracking-wider">
            MENU
          </div>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={isCollapsed ? item.label : ''}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-textMuted hover:text-text hover:bg-surfaceHighlight'
              }`
            }
          >
            <item.icon className="w-5 h-5 min-w-[20px]" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;