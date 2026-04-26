import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge } from '../components/UI';
import { IconSearch, IconCalendar, IconFilter, IconChevronDown, IconFileText } from '../components/Icons';
import { fetchAttendance, fetchEmployees } from '../services/api';
import { AttendanceRecord, Employee } from '../types';
import * as XLSX from 'xlsx';

const Attendance = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Filter & Sort State
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Name');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [deptFilter, setDeptFilter] = useState('All');
  const [desigFilter, setDesigFilter] = useState('All');
  
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Date State
  const today = new Date();
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const currentDay = formatDate(today);
  
  // Calculate 3 days back
  const getThreeDaysAgo = () => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return formatDate(d);
  };

  const [startDate, setStartDate] = useState(getThreeDaysAgo());
  const [endDate, setEndDate] = useState(currentDay);

  const loadData = async () => {
    setLoading(true);
    const [attendanceData, employeeData] = await Promise.all([
      fetchAttendance(startDate, endDate),
      fetchEmployees()
    ]);
    setRecords(attendanceData);
    setEmployees(employeeData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  // Get unique dates in range from records
  const uniqueDates = Array.from(new Set(records.map(r => r.date))).sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime()) as string[];

  // Advanced Filtered Employees
  const processedEmployees = employees
    .filter(emp => {
      const searchMatch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.id.toLowerCase().includes(searchTerm.toLowerCase());
      const deptMatch = deptFilter === 'All' || emp.department === deptFilter;
      const desigMatch = desigFilter === 'All' || emp.designation === desigFilter;
      
      // Status filtering is tricky in a matrix view. 
      // If a status is selected, we only show employees who have THAT status on ANY of the displayed days.
      if (statusFilter !== 'All') {
        const hasStatus = records.some(r => r.employeeId === emp.id && r.status === statusFilter);
        return searchMatch && deptMatch && desigMatch && hasStatus;
      }

      return searchMatch && deptMatch && desigMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'Name') return a.name.localeCompare(b.name);
      if (sortBy === 'ID') return a.id.localeCompare(b.id);
      return 0;
    });

  const filteredEmployees = processedEmployees.slice(0, rowsPerPage);

  // Departments and Designations for filters
  const departments = ['All', ...Array.from(new Set(employees.map(e => e.department)))];
  const designations = ['All', ...Array.from(new Set(employees.map(e => e.designation)))];

  const handleExport = () => {
    // Basic export for now
    const exportData = processedEmployees.map((emp, index) => {
      const row: any = {
        'SL': index + 1,
        'ID': emp.id,
        'Employee Name': emp.name
      };
      
      uniqueDates.forEach(date => {
        const rec = records.find(r => r.employeeId === emp.id && r.date === date);
        row[`${date} Entry`] = formatTimeTo12Hour(rec?.checkIn || '-');
        row[`${date} Exit`] = formatTimeTo12Hour(rec?.checkOut || '-');
        row[`${date} Hours`] = rec?.hours || '-';
      });
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detailed_Report');
    XLSX.writeFile(workbook, `Detailed_Attendance_Report_${startDate}_to_${endDate}.xlsx`);
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} (${days[d.getDay()]})`;
  };

  const formatTimeTo12Hour = (timeStr: string) => {
    if (!timeStr || timeStr === '-' || timeStr === 'Absent') return '-';
    // If it already has AM/PM, return as is
    if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;
    
    try {
      const parts = timeStr.split(':');
      if (parts.length < 2) return timeStr;
      
      let hours = parseInt(parts[0]);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      
      return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 bg-background min-h-[calc(100vh-64px)] flex flex-col">
      {/* Header - Stays top */}
      <div className="flex flex-col sm:flex-row items-baseline sm:items-center justify-between gap-2 border-b border-border pb-4 flex-shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-[#1cbdb0] uppercase tracking-wide">Detailed Report</h1>
        <button 
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`flex items-center gap-2 font-medium text-sm transition-colors ${showAdvancedFilters ? 'text-primary' : 'text-textMuted hover:text-text'}`}
        >
          <span>FILTER</span>
          <IconChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Advanced Filter Panel */}
      {showAdvancedFilters && (
        <div className="bg-surface p-4 rounded-lg shadow-sm border border-border grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 flex-shrink-0">
           <div>
              <label className="block text-xs font-bold text-text mb-1 uppercase tracking-wider">Department</label>
              <select 
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              >
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
           </div>
           <div>
              <label className="block text-xs font-bold text-text mb-1 uppercase tracking-wider">Designation</label>
              <select 
                value={desigFilter}
                onChange={(e) => setDesigFilter(e.target.value)}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              >
                {designations.map(desig => <option key={desig} value={desig}>{desig}</option>)}
              </select>
           </div>
           <div className="flex items-end">
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => {
                  setDeptFilter('All');
                  setDesigFilter('All');
                  setSearchTerm('');
                  setStatusFilter('All');
                }}
              >
                Reset All Filters
              </Button>
           </div>
        </div>
      )}

      {/* Filter Toolbar - Stable width */}
      <div className="flex flex-wrap items-center gap-3 bg-surface p-4 rounded-lg shadow-sm border border-border flex-shrink-0 max-w-full overflow-hidden">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input 
            type="text" 
            placeholder="Search Employee by Name/ID/RFID" 
            className="w-full bg-surface border border-border rounded py-2 pl-3 pr-10 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary h-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <IconSearch className="absolute right-3 top-2.5 w-4 h-4 text-textMuted" />
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2 bg-surface border border-border rounded px-3 py-2 h-10 w-full sm:w-auto">
          <div className="flex items-center gap-2">
             <input 
               type="date" 
               value={startDate}
               onChange={(e) => {
                  setStartDate(e.target.value);
               }}
               className="bg-transparent border-none text-sm text-text focus:outline-none p-0 w-[115px]" 
             />
             <span className="text-textMuted">-</span>
             <input 
               type="date" 
               value={endDate}
               onChange={(e) => {
                  setEndDate(e.target.value);
               }}
               className="bg-transparent border-none text-sm text-text focus:outline-none p-0 w-[115px]" 
             />
          </div>
          <IconCalendar className="w-4 h-4 text-textMuted" />
        </div>

        {/* Status Dropdown */}
        <div className="relative h-10 w-full sm:w-[180px]">
           <div 
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center justify-between bg-surface border border-border rounded px-3 py-2 w-full h-full text-sm text-textMuted cursor-pointer hover:border-primary transition-colors"
           >
              <span>{statusFilter === 'All' ? 'Attendance Status' : statusFilter}</span>
              <IconChevronDown className="w-4 h-4" />
           </div>
           
           {showStatusDropdown && (
             <>
               <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)}></div>
               <div className="absolute top-full left-0 mt-1 w-full bg-surface border border-border rounded shadow-lg z-50 overflow-hidden">
                  {['All', 'Present', 'Absent', 'Late'].map(status => (
                    <div 
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setShowStatusDropdown(false);
                      }}
                      className="px-4 py-2 text-sm text-text hover:bg-surfaceHighlight cursor-pointer"
                    >
                      {status}
                    </div>
                  ))}
               </div>
             </>
           )}
        </div>

        {/* Excel Export */}
        <button 
          onClick={handleExport}
          className="flex items-center justify-center gap-2 bg-[#1e293b] text-white px-4 h-10 rounded text-sm font-medium hover:bg-slate-900 transition-colors w-full sm:w-auto"
        >
          <IconFileText className="w-4 h-4 text-[#1cbdb0]" />
          <span>Excel</span>
          <IconChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Rows Per Page */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-bold text-text">Rows Per Page</span>
        <select 
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value))}
          className="bg-surface border border-border rounded px-2 py-1 text-sm text-text focus:outline-none"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Results Table - Scrollable Box */}
      <Card className="flex-1 overflow-hidden shadow-xl border border-slate-200 rounded-xl relative min-h-[600px] bg-white">
        <div className="absolute inset-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          <table className="min-w-full text-left text-[11px] border-separate border-spacing-0">
            <thead className="bg-[#1cbdb0] text-white font-bold sticky top-0 z-30 shadow-sm">
              <tr>
                <th className="p-2 border-r border-[#15a398] text-center w-10 min-w-[40px] max-w-[40px] sticky left-0 z-40 bg-[#1cbdb0] uppercase text-[9px] tracking-widest" rowSpan={2}>SL</th>
                <th className="p-2 border-r border-[#15a398] text-center w-36 min-w-[144px] max-w-[144px] sticky left-[40px] z-40 bg-[#1cbdb0] uppercase text-[9px] tracking-widest" rowSpan={2}>ID</th>
                <th className="p-2 border-r border-[#15a398] w-[220px] min-w-[220px] max-w-[220px] sticky left-[184px] z-40 bg-[#1cbdb0] uppercase text-[9px] tracking-widest" rowSpan={2}>Profile</th>
                {uniqueDates.map(date => (
                  <th key={date} colSpan={3} className="p-1.5 border-r border-[#15a398] text-center border-b border-[#15a398] text-[10px] uppercase tracking-wider font-extrabold bg-[#18a89c]">
                    {formatDateLabel(date)}
                  </th>
                ))}
              </tr>
              <tr className="bg-[#15948a] text-[9px] uppercase tracking-widest sticky top-[25px] z-30 font-black">
                {uniqueDates.map(date => (
                  <React.Fragment key={`${date}-sub`}>
                    <th className="px-2 py-1 border-r border-[#15a398] text-center">In</th>
                    <th className="px-2 py-1 border-r border-[#15a398] text-center">Out</th>
                    <th className="px-2 py-1 border-r border-[#15a398] text-center">Hrs</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3 + (uniqueDates.length * 3)} className="p-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] font-bold text-textMuted uppercase tracking-widest">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={3 + (uniqueDates.length * 3)} className="p-24 text-center">
                    <div className="flex flex-col items-center gap-1 opacity-40">
                      <IconSearch className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-black text-text uppercase tracking-tight">No match</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, index) => (
                  <tr key={emp.id} className="group hover:bg-slate-50/80 transition-all duration-200">
                    <td className="p-2 border-r border-slate-100 text-center font-mono text-[10px] text-textMuted sticky left-0 z-20 bg-white group-hover:bg-slate-50 transition-colors w-10 min-w-[40px] max-w-[40px]">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="p-2 border-r border-slate-100 text-center sticky left-[40px] z-20 bg-white group-hover:bg-slate-50 transition-colors w-36 min-w-[144px] max-w-[144px]">
                      <div className="bg-slate-100/80 border border-slate-200 rounded-md px-2 py-0.5 inline-flex items-center justify-center min-w-[110px] text-[10px] font-black text-slate-600 uppercase tracking-tight">
                        {emp.id}
                      </div>
                    </td>
                    <td className="p-1 border-r border-slate-100 sticky left-[184px] z-20 bg-white group-hover:bg-slate-50 transition-colors w-[220px] min-w-[220px] max-w-[220px]">
                      <div 
                        className="flex items-center gap-2 p-1 rounded-lg bg-slate-50/50 border border-slate-100 cursor-pointer group/item hover:border-primary/30 hover:bg-white hover:shadow-sm transition-all"
                        onClick={() => navigate(`/employees/${emp.id}`)}
                      >
                         <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center p-0.5">
                           {emp.avatar ? (
                             <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover rounded-md" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-primary font-black text-sm bg-primary/5 rounded-md">
                               {emp.name.charAt(0)}
                             </div>
                           )}
                         </div>
                         <div className="flex flex-col min-w-0">
                            <span className="font-black text-slate-800 text-[11px] leading-tight truncate group-hover/item:text-primary transition-colors uppercase tracking-tight">{emp.name}</span>
                            <span className="text-[9px] text-textMuted font-bold uppercase truncate tracking-tighter opacity-70">{emp.designation}</span>
                         </div>
                      </div>
                    </td>
                     {uniqueDates.map(date => {
                        const rec = records.find(r => r.employeeId === emp.id && r.date === date);
                        const isAbsent = !rec || rec.status === 'Absent' || rec.checkIn === '-';
                        const isHoliday = rec?.isHoliday;
                        const isOffDayStatus = rec?.isOffDay && isAbsent;
                        const isLeave = rec?.status === 'Leave';
                        const workedOnOffDay = rec?.isOffDay && !isAbsent;
                        const workedOnHoliday = rec?.isHoliday && !isAbsent;
                        const isLate = rec?.isLate && !workedOnOffDay && !workedOnHoliday;
                        const isEarlyExit = rec?.isEarlyExit;
                        
                        return (
                          <React.Fragment key={`${emp.id}-${date}`}>
                             <td className="p-0.5 border-r border-slate-100 align-middle min-w-[55px]">
                               <div className={`p-1 rounded-md border flex flex-col items-center justify-center min-h-[30px] w-full shadow-sm transition-all ${isAbsent && !isHoliday && !isOffDayStatus && !isLeave ? 'bg-red-50 border-red-100' : (isHoliday && isAbsent) || isOffDayStatus || isLeave ? 'bg-slate-50 border-border' : isLate ? 'bg-red-50 border-red-200' : workedOnHoliday ? 'bg-amber-50 border-amber-100' : workedOnOffDay ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                  {isHoliday && isAbsent ? (
                                    <span className="text-primary font-bold uppercase text-[7px]">Hol</span>
                                  ) : isOffDayStatus ? (
                                    <span className="text-textMuted font-bold uppercase text-[7px]">Off</span>
                                  ) : isLeave ? (
                                    <span className="text-accent font-bold uppercase text-[7px]">LV</span>
                                  ) : isAbsent ? (
                                    <span className="text-red-500 font-bold uppercase text-[8px]">Abs</span>
                                  ) : (
                                    <div className="flex flex-col items-center">
                                       <div className="flex items-center gap-1">
                                          <span className={`${isLate ? 'text-red-600' : workedOnHoliday ? 'text-amber-700' : workedOnOffDay ? 'text-blue-600' : 'text-emerald-700'} font-bold text-[9px]`}>{formatTimeTo12Hour(rec.checkIn)}</span>
                                          {isLate && <span className="text-[9px] font-black text-red-600"> (L)</span>}
                                       </div>
                                    </div>
                                  )}
                               </div>
                            </td>
                            <td className="p-0.5 border-r border-slate-100 align-middle min-w-[55px]">
                               <div className={`p-1 rounded-md border flex items-center justify-center min-h-[30px] w-full shadow-sm transition-all ${isEarlyExit ? 'bg-red-50 border-red-200' : (isHoliday && isAbsent) || isOffDayStatus || isLeave ? 'bg-slate-50 border-border' : workedOnHoliday ? 'bg-amber-50 border-amber-100' : workedOnOffDay ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                                  <div className="flex items-center gap-1">
                                    <span className={`${isEarlyExit ? 'text-red-600' : workedOnHoliday ? 'text-amber-700' : workedOnOffDay ? 'text-blue-600' : 'text-text'} font-medium text-[9px]`}>
                                      {rec?.checkOut && rec.checkOut !== '-' ? formatTimeTo12Hour(rec.checkOut) : '-'}
                                    </span>
                                    {isEarlyExit && <span className="text-[9px] font-black text-red-600">EL</span>}
                                  </div>
                               </div>
                            </td>
                           <td className="p-0.5 border-r border-slate-100 align-middle min-w-[55px]">
                              <div className="p-1 rounded-md border border-slate-100 bg-slate-50 flex items-center justify-center min-h-[30px] w-full shadow-sm">
                                 <span className="text-[#1cbdb0] font-bold text-[9px]">
                                   {rec?.hours && rec.hours !== '-' ? rec.hours : '-'}
                                 </span>
                              </div>
                           </td>
                         </React.Fragment>
                       );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Attendance;
