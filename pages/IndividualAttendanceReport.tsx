import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { IconSearch, IconCalendar, IconUser, IconChevronDown, IconFileText, IconClock, IconCheckCircle, IconXCircle, IconAlertCircle } from '../components/Icons';
import { fetchAttendance, fetchEmployees, getCurrentSession } from '../services/api';
import { AttendanceRecord, Employee } from '../types';

const IndividualAttendanceReport = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date State - Default to current month
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  useEffect(() => {
    const loadEmployees = async () => {
      const data = await fetchEmployees();
      setEmployees(data);
      
      const session = getCurrentSession();
      if (session?.isEmployee && session.employeeId) {
        const emp = data.find(e => e.id === session.employeeId);
        if (emp) setSelectedEmployee(emp);
      }
    };
    loadEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadReport();
    }
  }, [selectedEmployee, selectedMonth, selectedYear]);

  const loadReport = async () => {
    setLoading(true);
    // Calculate start and end date for the selected month
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0);
    
    const formatDateObj = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const startDate = formatDateObj(start);
    const endDate = formatDateObj(end);
    
    const data = await fetchAttendance(startDate, endDate);
    // Filter for the selected employee
    const empRecords = data.filter(r => r.employeeId === selectedEmployee?.id);
    setRecords(empRecords);
    setLoading(false);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);

  // Summary Calculations
  const summary = {
    present: records.filter(r => r && (r.status === 'Present' || r.status === 'On Time' || r.status === 'Late')).length,
    absent: records.filter(r => r && r.status === 'Absent').length,
    late: records.filter(r => r && r.isLate).length,
    earlyExit: records.filter(r => r && r.isEarlyExit).length,
    leave: records.filter(r => r && r.status === 'Leave').length,
    totalWorkingHours: records.reduce((acc, r) => {
        if(r && r.hours && r.hours !== '-') {
            return acc + parseFloat(r.hours);
        }
        return acc;
    }, 0).toFixed(2),
    expectedWorkingHours: records.reduce((acc, r) => {
        if (!r) return acc;
        const isCurrentMonth = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();
        const recordDate = new Date(r.date);
        const reportToday = new Date();
        reportToday.setHours(0,0,0,0);
        
        // If current month, only count expected hours up to today
        if (isCurrentMonth && recordDate > reportToday) {
            return acc;
        }
        
        if (r.expectedHours) {
            return acc + parseFloat(r.expectedHours);
        }
        return acc;
    }, 0).toFixed(2)
  };

  const formatTimeTo12Hour = (timeStr: string) => {
    if (!timeStr || timeStr === '-' || timeStr === 'Absent') return '-';
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;
    
    try {
      const parts = timeStr.split(':');
      if (parts.length < 2) return timeStr;
      
      let hours = parseInt(parts[0]);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const filteredEmployeesList = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-xl font-bold text-[#1cbdb0] uppercase tracking-wide">Individual Attendance Report</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Employee Selection */}
        {!getCurrentSession()?.isEmployee && (
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4">
              <h2 className="text-sm font-bold text-text mb-3 uppercase tracking-wider">Select Employee</h2>
              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full bg-surfaceHighlight border border-border rounded py-2 pl-3 pr-8 text-sm focus:outline-none focus:border-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <IconSearch className="absolute right-2 top-2.5 w-4 h-4 text-textMuted" />
              </div>
              <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                {filteredEmployeesList.map(emp => (
                  <div 
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border ${selectedEmployee?.id === emp.id ? 'bg-primary/10 border-primary shadow-sm' : 'hover:bg-surfaceHighlight border-transparent'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {emp.avatar ? <img src={emp.avatar} alt="" className="w-full h-full object-cover" /> : <IconUser className="w-4 h-4 text-textMuted" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-bold truncate ${selectedEmployee?.id === emp.id ? 'text-primary' : 'text-text'}`}>{emp.name}</span>
                      <span className="text-[10px] text-textMuted truncate">{emp.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Main Content: Report */}
        <div className={getCurrentSession()?.isEmployee ? "lg:col-span-4 space-y-6" : "lg:col-span-3 space-y-6"}>
          {/* Controls */}
          <Card className="p-4 flex flex-wrap items-center gap-4">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-textMuted uppercase mb-1">Month</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-background border border-border rounded px-3 py-1.5 text-sm focus:outline-none min-w-[120px]"
              >
                {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-textMuted uppercase mb-1">Year</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-background border border-border rounded px-3 py-1.5 text-sm focus:outline-none min-w-[100px]"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex flex-col ml-auto">
               <Button 
                variant="primary" 
                onClick={loadReport} 
                disabled={!selectedEmployee || loading}
                className="mt-auto"
               >
                 {loading ? 'Loading...' : 'Refresh Report'}
               </Button>
            </div>
          </Card>

          {selectedEmployee ? (
            <>
                {selectedEmployee && (
                  <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20 mb-6">
                    <div className="w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center overflow-hidden">
                       {selectedEmployee.avatar ? <img src={selectedEmployee.avatar} alt="" className="w-full h-full object-cover" /> : <IconUser className="w-6 h-6 text-textMuted" />}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-text uppercase">{selectedEmployee.name}</h2>
                      <p className="text-sm text-textMuted font-medium uppercase">{selectedEmployee.designation} • {selectedEmployee.department} • {selectedEmployee.workplace || 'No Workplace'}</p>
                    </div>
                  </div>
                )}
                {/* Summary Section */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                <SummaryCard label="Present" value={summary.present} icon={<IconCheckCircle className="text-success" />} color="text-success" />
                <SummaryCard label="Absent" value={summary.absent} icon={<IconXCircle className="text-danger" />} color="text-danger" />
                <SummaryCard label="Late" value={summary.late} icon={<IconClock className="text-warning" />} color="text-warning" />
                <SummaryCard label="Early Exit" value={summary.earlyExit} icon={<IconClock className="text-danger" />} color="text-danger" />
                <SummaryCard label="Leave" value={summary.leave} icon={<IconAlertCircle className="text-accent" />} color="text-accent" />
                <SummaryCard label="Work Hours" value={summary.totalWorkingHours} icon={<IconClock className="text-text" />} color="text-[#1cbdb0]" />
                <SummaryCard label="Expected" value={summary.expectedWorkingHours} icon={<IconCalendar className="text-textMuted" />} color="text-textMuted" />
              </div>

              {/* Attendance Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-[#1cbdb0] text-white">
                      <tr>
                        <th className="p-3 font-bold border-r border-[#15a398]">Date</th>
                        <th className="p-3 font-bold border-r border-[#15a398]">In Time</th>
                        <th className="p-3 font-bold border-r border-[#15a398]">Out Time</th>
                        <th className="p-3 font-bold border-r border-[#15a398]">Status</th>
                        <th className="p-3 font-bold border-r border-[#15a398] text-center">Working Hours</th>
                        <th className="p-3 font-bold text-center">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center text-textMuted italic">Calculating records...</td></tr>
                      ) : records.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-textMuted">No records found for this month.</td></tr>
                      ) : (
                        records.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(rec => (
                          <tr key={rec.id} className="border-b border-border hover:bg-surfaceHighlight transition-colors">
                            <td className="p-3 font-medium text-text border-r border-border">
                              {new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              <span className="ml-2 text-[10px] text-textMuted font-normal uppercase">
                                {new Date(rec.date).toLocaleDateString('en-GB', { weekday: 'short' })}
                              </span>
                            </td>
                            <td className={`p-3 text-text border-r border-border font-mono text-[13px] ${rec.isLate ? 'bg-red-50 text-red-600 font-bold' : rec.isHoliday && rec.checkIn !== '-' ? 'bg-amber-50 text-amber-700 font-bold' : rec.isOffDay && rec.checkIn !== '-' ? 'bg-blue-50 text-blue-600 font-bold' : (!rec.isLate && rec.checkIn !== '-' ? 'bg-emerald-50 text-emerald-700 font-bold' : '')}`}>
                              <div className="flex items-center justify-between">
                                 <span>{formatTimeTo12Hour(rec.checkIn)}</span>
                                 {rec.isLate && <span className="text-[10px] font-black text-red-600 bg-white px-1 rounded border border-red-200">(L)</span>}
                                 {rec.isHoliday && rec.checkIn !== '-' && <span className="text-[10px] font-black text-amber-600 bg-white px-1 rounded border border-amber-200">(H)</span>}
                                 {rec.isOffDay && rec.checkIn !== '-' && <span className="text-[10px] font-black text-blue-600 bg-white px-1 rounded border border-blue-200">(OF)</span>}
                              </div>
                            </td>
                            <td className={`p-3 text-text border-r border-border font-mono text-[13px] ${rec.isEarlyExit ? 'bg-red-50 text-red-600 font-bold' : rec.isHoliday && rec.checkOut !== '-' && rec.checkOut !== null ? 'bg-amber-50 text-amber-700 font-bold' : rec.isOffDay && rec.checkOut !== '-' && rec.checkOut !== null ? 'bg-blue-50 text-blue-600 font-bold' : (!rec.isEarlyExit && rec.checkOut !== '-' && rec.checkOut !== null ? 'bg-emerald-50 text-emerald-700 font-bold' : '')}`}>
                              <div className="flex items-center justify-between">
                                 <span>{formatTimeTo12Hour(rec.checkOut)}</span>
                                 {rec.isEarlyExit && <span className="text-[10px] font-black text-red-600 bg-white px-1 rounded border border-red-200">EL</span>}
                                 {rec.isHoliday && rec.checkOut !== '-' && rec.checkOut !== null && <span className="text-[10px] font-black text-amber-600 bg-white px-1 rounded border border-amber-200">(H)</span>}
                                 {rec.isOffDay && rec.checkOut !== '-' && rec.checkOut !== null && <span className="text-[10px] font-black text-blue-600 bg-white px-1 rounded border border-blue-200">(OF)</span>}
                              </div>
                            </td>
                            <td className="p-3 border-r border-border text-center">
                              {rec.status ? (
                                <Badge variant={
                                  rec.status === 'Present' || rec.status === 'On Time' ? 'success' :
                                  rec.status === 'Absent' ? 'danger' :
                                  rec.status === 'Late' ? 'warning' : 
                                  rec.status === 'Off Day' ? 'default' :
                                  rec.status === 'Holiday' ? 'warning' : 'default'
                                }>
                                  {rec.status === 'Leave' ? 'LEAVE' : rec.status}
                                </Badge>
                              ) : (
                                <span className="text-textMuted">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-[#1cbdb0] border-r border-border">
                              {rec.hours !== '-' ? rec.hours : '-'}
                            </td>
                            <td className="p-3 text-center text-[10px] font-bold text-textMuted uppercase whitespace-nowrap">
                              {rec.location}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center text-textMuted bg-surface rounded-xl border border-dashed border-border p-12 text-center">
               <div className="w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center mb-4">
                  <IconUser className="w-8 h-8" />
               </div>
               <h3 className="text-lg font-bold text-text mb-2 uppercase">No Employee Selected</h3>
               <p className="text-sm max-w-xs uppercase font-medium">Please select an employee from the left panel to view their individual attendance report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) => (
  <Card className="p-3 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow">
     <div className="mb-2">{icon}</div>
     <span className="text-[10px] font-bold text-textMuted uppercase mb-1">{label}</span>
     <span className={`text-xl font-bold ${color}`}>{value}</span>
  </Card>
);

export default IndividualAttendanceReport;
