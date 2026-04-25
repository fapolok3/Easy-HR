import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { Card, Badge } from '../components/UI';
import { IconUsers, IconClock, IconCheckCircle } from '../components/Icons';
import { fetchEmployees, fetchAttendance, getCurrentSession } from '../services/api';
import { Employee, AttendanceRecord } from '../types';
import { Navigate } from 'react-router-dom';

const Dashboard = () => {
  const session = getCurrentSession();
  if (session?.isEmployee) {
    return <Navigate to="/attendance/mobile-punch" replace />;
  }
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Update Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Data
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [empData, attData] = await Promise.all([
          fetchEmployees(),
          fetchAttendance()
        ]);
        setEmployees(empData || []);
        setAttendance(attData || []);
      } catch (error) {
        console.error("Dashboard data fetch failed", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
    
    // Polling for real-time updates
    const pollInterval = setInterval(() => {
      const refreshData = async () => {
        try {
          const attData = await fetchAttendance();
          setAttendance(attData || []);
        } catch (error) {
          console.error("Dashboard poll failed", error);
        }
      };
      refreshData();
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
  }, []);

  // Calculate Stats
  const todayStr = currentTime.toISOString().split('T')[0];
  const todaysAttendance = attendance.filter(a => a.date === todayStr);
  const totalEmployeesCount = employees.length;
  const presentCount = todaysAttendance.filter(a => a.status === 'Present' || a.status === 'Late' || a.status === 'On Time').length;
  const lateCount = todaysAttendance.filter(a => a.status === 'Late').length;
  const absentCount = todaysAttendance.filter(a => a.status === 'Absent').length;

  const attendanceRate = totalEmployeesCount > 0 
    ? Math.round((presentCount / totalEmployeesCount) * 100) 
    : 0;

  // Derived Chart Data
  const attendanceData = [
    { name: 'Present', value: presentCount, color: '#10b981' },
    { name: 'Absent', value: absentCount, color: '#ef4444' },
    { name: 'Late', value: lateCount, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  // Fallback if empty for chart rendering
  const displayAttendanceData = attendanceData.length > 0 ? attendanceData : [{ name: 'No Data', value: 1, color: '#e2e8f0' }];

  const recentActivity = todaysAttendance
    .filter(a => a.checkIn !== '-')
    .sort((a, b) => {
      // Sort in descending order by check-in time
      const timeA = a.checkIn || '';
      const timeB = b.checkIn || '';
      return timeB.localeCompare(timeA);
    })
    .slice(0, 15)
    .map(a => {
      let source = 'Device';
      if (a.location?.toLowerCase().includes('mobile') || a.device?.toLowerCase().includes('mobile')) {
        source = 'Mobile Punch';
      } else if (a.device && a.device !== '-') {
        source = `Device: ${a.device}`;
      } else if (a.location && a.location !== '-') {
        source = a.location;
      }

      return {
        id: a.id,
        user: a.employeeName,
        source: source,
        time: a.checkIn,
        status: a.status
      };
    });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-text">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text">Dashboard</h1>
          <p className="text-textMuted text-sm md:text-base">Welcome back, here's what's happening today.</p>
        </div>
        <div className="text-left md:text-right bg-surfaceHighlight/30 p-3 rounded-xl border border-border md:bg-transparent md:p-0 md:border-0 w-full md:w-auto">
          <p className="text-xl md:text-2xl font-mono font-bold text-text">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-xs md:text-sm text-textMuted uppercase tracking-wider font-bold">
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textMuted">Total Employees</h3>
            <div className="p-2 bg-blue-500/10 rounded-lg"><IconUsers className="w-5 h-5 text-blue-500" /></div>
          </div>
          <div className="flex items-end justify-between">
             <span className="text-3xl font-bold text-text">{totalEmployeesCount}</span>
             <span className="text-xs font-medium text-textMuted px-2 py-1 rounded">Active</span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textMuted">Present Today</h3>
            <div className="p-2 bg-emerald-500/10 rounded-lg"><IconCheckCircle className="w-5 h-5 text-emerald-500" /></div>
          </div>
          <div className="flex items-end justify-between">
             <span className="text-3xl font-bold text-text">{presentCount}</span>
             <div className="h-1.5 w-24 bg-surfaceHighlight rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${attendanceRate}%` }}></div>
             </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textMuted">Late Arrivals</h3>
            <div className="p-2 bg-amber-500/10 rounded-lg"><IconClock className="w-5 h-5 text-amber-500" /></div>
          </div>
          <div className="flex items-end justify-between">
             <span className="text-3xl font-bold text-text">{lateCount}</span>
             <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
                Today
             </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-textMuted">Absent Count</h3>
            <div className="p-2 bg-red-500/10 rounded-lg"><IconCheckCircle className="w-5 h-5 text-red-500" /></div>
          </div>
          <div className="flex items-end justify-between">
             <span className="text-3xl font-bold text-text">{absentCount}</span>
             <span className="text-xs text-textMuted">Needs attention</span>
          </div>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Donut */}
        <Card className="p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-text mb-6">Today's Attendance</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayAttendanceData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {displayAttendanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                  itemStyle={{ color: '#0f172a' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-3xl font-bold text-text">{attendanceRate}%</span>
                <span className="text-xs text-textMuted">Attendance</span>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-4">
             {attendanceData.map(d => (
                 <div key={d.name} className="flex items-center gap-1.5">
                     <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                     <span className="text-xs text-textMuted">{d.name}</span>
                 </div>
             ))}
          </div>
        </Card>

        {/* Info Card - Simplified from trend chart since daily trend needs historical data which might be heavy */}
        <Card className="p-6 lg:col-span-2">
           <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-semibold text-text">Attendance Quick Summary</h3>
           </div>
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-surfaceHighlight/30 rounded-xl border border-border">
                    <p className="text-sm text-textMuted mb-1">On Time</p>
                    <p className="text-2xl font-bold text-emerald-500">{todaysAttendance.filter(a => a.status === 'Present' || a.status === 'On Time').length}</p>
                 </div>
                 <div className="p-4 bg-surfaceHighlight/30 rounded-xl border border-border">
                    <p className="text-sm text-textMuted mb-1">Late</p>
                    <p className="text-2xl font-bold text-amber-500">{lateCount}</p>
                 </div>
              </div>
              <div className="p-4 bg-surfaceHighlight/30 rounded-xl border border-border">
                 <p className="text-sm text-textMuted mb-2">Daily Goal Progress</p>
                 <div className="h-4 w-full bg-surfaceHighlight rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${attendanceRate}%` }}></div>
                 </div>
                 <p className="text-xs text-textMuted mt-2 text-right">{attendanceRate}% of employees logged</p>
              </div>
           </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="p-6">
              <h3 className="text-lg font-semibold text-text mb-4">Real-time Feed (Today)</h3>
              <div className="space-y-4">
                  {recentActivity.length > 0 ? recentActivity.map(activity => (
                      <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surfaceHighlight/50 transition-colors">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-surfaceHighlight border border-border flex items-center justify-center text-sm font-bold text-text">
                                  {activity.user.charAt(0)}
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-text uppercase tracking-tight">{activity.user}</p>
                                  <p className="text-[10px] text-textMuted uppercase font-bold">{activity.source}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="text-sm font-mono font-bold text-text">{activity.time}</p>
                              <Badge variant={activity.status === 'Late' ? 'warning' : activity.status === 'Present' || activity.status === 'On Time' ? 'success' : 'default'} className="text-[10px]">
                                  {activity.status}
                              </Badge>
                          </div>
                      </div>
                  )) : (
                    <div className="py-20 text-center flex flex-col items-center justify-center gap-4">
                      <div className="p-4 bg-surfaceHighlight/50 rounded-full border border-border">
                        <IconClock className="w-8 h-8 text-textMuted/30" />
                      </div>
                      <p className="text-sm text-textMuted italic max-w-[200px]">No logs recorded for today yet. Activity will appear here as employees punch in.</p>
                    </div>
                  )}
              </div>
          </Card>

          <Card className="p-6">
             <h3 className="text-lg font-semibold text-text mb-4">Daily Insight</h3>
             <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm text-text space-y-3">
                <p>System status: <span className="text-emerald-500 font-medium">Healthy</span></p>
                <p>Last Sync: <span className="font-mono">{currentTime.toLocaleTimeString()}</span></p>
                {attendanceRate < 50 && totalEmployeesCount > 0 && (
                   <p className="text-amber-500">Notice: Low attendance occupancy detected for current workforce.</p>
                )}
                {totalEmployeesCount === 0 && (
                  <p className="text-textMuted italic">Please configure API settings to start receiving real-time data.</p>
                )}
             </div>
          </Card>
      </div>
    </div>
  );
};

export default Dashboard;