import React, { useEffect, useState } from 'react';
import { Card, Button, Badge } from '../components/UI';
import { IconSearch, IconCalendar, IconUser, IconChevronDown, IconFileText, IconClock, IconCheckCircle, IconXCircle, IconAlertCircle } from '../components/Icons';
import { fetchAttendance, fetchEmployees, getCurrentSession, getOrgSettings } from '../services/api';
import DateRangePicker from '../components/DateRangePicker';
import { AttendanceRecord, Employee, Shift } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

const IndividualAttendanceReport = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date State - Default to current month
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));

  // Bulk and export states
  const [bulkMonth, setBulkMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');

  // Helper to calculate summary for a specific set of records
  const calculateEmpSummary = (empRecords: AttendanceRecord[]) => {
    const present = empRecords.filter(r => r && (r.status === 'Present' || r.status === 'On Time' || r.status === 'Late')).length;
    const absent = empRecords.filter(r => r && r.status === 'Absent').length;
    const late = empRecords.filter(r => r && r.isLate).length;
    const earlyExit = empRecords.filter(r => r && r.isEarlyExit).length;
    const leave = empRecords.filter(r => r && r.status === 'Leave').length;
    
    const totalWorkingHours = empRecords.reduce((acc, r) => {
      if (r && r.hours && r.hours !== '-') {
        return acc + parseFloat(r.hours);
      }
      return acc;
    }, 0);
    
    const expectedWorkingHours = empRecords.reduce((acc, r) => {
      if (!r) return acc;
      const recordDate = new Date(r.date);
      const reportToday = new Date();
      reportToday.setHours(0,0,0,0);
      
      // Only count expected hours for dates that have already passed (including today)
      if (recordDate > reportToday) {
        return acc;
      }
      
      const isHoliday = !!r.isHoliday;
      const isOffDay = !!r.isOffDay;
      const isLeave = r.status === 'Leave';
      
      if (isHoliday || isOffDay || isLeave) {
        return acc;
      }
      
      if (r.expectedHours) {
        return acc + parseFloat(r.expectedHours);
      }
      return acc;
    }, 0);

    return {
      present,
      absent,
      late,
      earlyExit,
      leave,
      totalWorkingHours,
      expectedWorkingHours
    };
  };

  const generateEmployeePDFPage = (
    doc: jsPDF, 
    emp: Employee, 
    empRecords: AttendanceRecord[], 
    startD: string, 
    endD: string
  ) => {
    // Add Title Header
    doc.setFillColor(28, 189, 176); // Deep teal background accent
    doc.rect(0, 0, 210, 15, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('EASY HR - ATTENDANCE REPORT', 15, 10);
    
    // Back to dark text for content
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Meta block
    doc.setFont('helvetica', 'bold');
    doc.text('EMPLOYEE DETAILS', 15, 25);
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 27, 195, 27);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${emp.name}`, 15, 33);
    doc.text(`ID: ${emp.id}`, 15, 38);
    doc.text(`Designation: ${emp.designation || '-'}`, 15, 43);
    
    doc.text(`Department: ${emp.department || '-'}`, 110, 33);
    doc.text(`Workplace: ${emp.workplace || 'No Workplace'}`, 110, 38);
    doc.text(`Report Period: ${format(new Date(startD), 'dd/MM/yyyy')} to ${format(new Date(endD), 'dd/MM/yyyy')}`, 110, 43);

    // Summary box
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY STATISTICS', 15, 52);
    doc.line(15, 54, 195, 54);
    
    const empSummary = calculateEmpSummary(empRecords);
    
    autoTable(doc, {
      startY: 57,
      head: [['Present', 'Absent', 'Late', 'Early Exit', 'Leave', 'Work Hours', 'Expected Hours']],
      body: [[
        empSummary.present,
        empSummary.absent,
        empSummary.late,
        empSummary.earlyExit,
        empSummary.leave,
        empSummary.totalWorkingHours.toFixed(2) + ' hrs',
        empSummary.expectedWorkingHours.toFixed(2) + ' hrs'
      ]],
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240], textColor: [80, 80, 80], fontStyle: 'bold', halign: 'center' },
      bodyStyles: { halign: 'center', fontStyle: 'bold', textColor: [28, 189, 176] },
      styles: { fontSize: 9, cellPadding: 3 }
    });
    
    // Attendance details table
    doc.setFont('helvetica', 'bold');
    const finalYOfSummary = (doc as any).lastAutoTable.finalY || 70;
    doc.text('ATTENDANCE LOGS', 15, finalYOfSummary + 8);
    doc.line(15, finalYOfSummary + 10, 195, finalYOfSummary + 10);
    
    const sortedRecords = [...empRecords].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const tableRows = sortedRecords.map(rec => [
      format(new Date(rec.date), 'dd/MM/yyyy') + ` (${format(new Date(rec.date), 'EEE')})`,
      formatTimeTo12Hour(rec.checkIn),
      formatTimeTo12Hour(rec.checkOut),
      rec.status === 'Leave' ? 'LEAVE' : (rec.status || '-'),
      rec.hours !== '-' ? rec.hours + ' hrs' : '-',
      rec.location || '-'
    ]);

    // Dynamically adjust font size and cell padding depending on list size to guarantee a perfect single-page layout
    let dynamicFontSize = 8;
    let dynamicCellPadding = 1.8;
    if (sortedRecords.length > 25) {
      dynamicFontSize = 6.5;
      dynamicCellPadding = 1.0;
    } else if (sortedRecords.length > 15) {
      dynamicFontSize = 7.5;
      dynamicCellPadding = 1.4;
    }
    
    autoTable(doc, {
      startY: finalYOfSummary + 13,
      head: [['Date', 'In Time', 'Out Time', 'Status', 'Working Hours', 'Source']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [28, 189, 176], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: dynamicFontSize, cellPadding: dynamicCellPadding },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 28 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 28, halign: 'center' },
        5: { cellWidth: 28, halign: 'center' }
      },
      margin: { bottom: 10 },
      rowPageBreak: 'avoid'
    });
  };

  const exportToExcel = () => {
    if (!selectedEmployee || records.length === 0) return;
    
    const promise = new Promise((resolve, reject) => {
      try {
        const sortedRecords = [...records].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const dataRows = sortedRecords.map(rec => ({
          'Employee ID': selectedEmployee.id,
          'Employee Name': selectedEmployee.name,
          'Department': selectedEmployee.department || '-',
          'Designation': selectedEmployee.designation || '-',
          'Date': format(new Date(rec.date), 'dd/MM/yyyy'),
          'Day': format(new Date(rec.date), 'EEE'),
          'In Time': formatTimeTo12Hour(rec.checkIn),
          'Out Time': formatTimeTo12Hour(rec.checkOut),
          'Status': rec.status === 'Leave' ? 'LEAVE' : (rec.status || '-'),
          'Working Hours': rec.hours !== '-' ? rec.hours : '-',
          'Source/Device': rec.location || '-'
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
        
        setTimeout(() => {
          XLSX.writeFile(workbook, `${selectedEmployee.name.replace(/\s+/g, '_')}_Attendance_${startDate}_to_${endDate}.xlsx`);
          resolve(true);
        }, 800);
      } catch (err) {
        reject(err);
      }
    });

    toast.promise(promise, {
      loading: 'Generating Excel report...',
      success: 'Excel report downloaded successfully!',
      error: 'Failed to generate Excel report.'
    });
  };

  const exportToPDF = () => {
    if (!selectedEmployee || records.length === 0) return;

    const promise = new Promise((resolve, reject) => {
      try {
        const doc = new jsPDF('p', 'mm', 'a4');
        generateEmployeePDFPage(doc, selectedEmployee, records, startDate, endDate);
        
        setTimeout(() => {
          doc.save(`${selectedEmployee.name.replace(/\s+/g, '_')}_Attendance_${startDate}_to_${endDate}.pdf`);
          resolve(true);
        }, 800);
      } catch (err) {
        reject(err);
      }
    });

    toast.promise(promise, {
      loading: 'Generating PDF report...',
      success: 'PDF report downloaded successfully!',
      error: 'Failed to generate PDF report.'
    });
  };

  const downloadAllMonthlyPDFs = async () => {
    if (!bulkMonth || employees.length === 0) return;
    
    setBulkLoading(true);
    setBulkProgress('Initializing...');
    
    try {
      const selectedDate = new Date(bulkMonth + '-02'); // Use 2nd day of month to avoid timezone shifts
      const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
      
      setBulkProgress('Fetching logs...');
      const allLogs = await fetchAttendance(monthStart, monthEnd);
      
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Calculate index pages based on employee count
      const itemsPerPage = 32;
      const indexPagesCount = Math.ceil(employees.length / itemsPerPage) || 1;
      
      // Draw dynamic table of contents (index pages)
      for (let p = 0; p < indexPagesCount; p++) {
        if (p > 0) {
          doc.addPage();
        }
        
        // Header Banner
        doc.setFillColor(28, 189, 176); // Deep teal background accent
        doc.rect(0, 0, 210, 15, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('EASY HR - MONTHLY ATTENDANCE BATCH', 15, 10);
        
        // Context branding title
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`REPORT INDEX (Page ${p + 1} of ${indexPagesCount})`, 15, 25);
        
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(15, 27, 195, 27);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Month: ${format(selectedDate, 'MMMM yyyy')}`, 15, 33);
        doc.text(`Total Employees Included: ${employees.length}`, 110, 33);
        
        // Slice employees for this current TOC page
        const startIdx = p * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, employees.length);
        const pageEmployees = employees.slice(startIdx, endIdx);
        
        const indexRows = pageEmployees.map((emp, localIdx) => {
          const globalIdx = startIdx + localIdx;
          // Each employee report is guaranteed to take exactly 1 page
          const targetPageNum = indexPagesCount + globalIdx + 1;
          return [
            globalIdx + 1,
            emp.id,
            emp.name,
            emp.department || '-',
            emp.designation || '-',
            `Page ${targetPageNum}`
          ];
        });
        
        autoTable(doc, {
          startY: 37,
          head: [['SL', 'Employee ID', 'Employee Name', 'Department', 'Designation', 'Report Page']],
          body: indexRows,
          theme: 'striped',
          headStyles: { fillColor: [28, 189, 176], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 8.5, cellPadding: 1.8 },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 25 },
            2: { cellWidth: 50 },
            3: { cellWidth: 38 },
            4: { cellWidth: 40 },
            5: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [28, 189, 176] }
          },
          margin: { left: 15, right: 15 }
        });
      }
      
      // Generate single-page reports for each employee
      let pagesAdded = indexPagesCount;
      for (let i = 0; i < employees.length; i++) {
        const emp = employees[i];
        setBulkProgress(`Generating report ${i + 1}/${employees.length}`);
        
        const empRecords = allLogs.filter(r => r.employeeId === emp.id);
        
        doc.addPage();
        generateEmployeePDFPage(doc, emp, empRecords, monthStart, monthEnd);
        pagesAdded++;
      }
      
      if (pagesAdded > indexPagesCount) {
        doc.save(`All_Employees_Attendance_${bulkMonth}.pdf`);
        toast.success(`Exported ${employees.length} employee reports with Index successfully!`);
      } else {
        toast.error("No employee data available for the selected month.");
      }
    } catch (error) {
      console.error("Error generating bulk PDF with TOC:", error);
      toast.error("An error occurred during bulk export.");
    } finally {
      setBulkLoading(false);
      setBulkProgress('');
    }
  };

  useEffect(() => {
    const loadEmployeesAndShifts = async () => {
      const [empData, settings] = await Promise.all([
        fetchEmployees(),
        getOrgSettings()
      ]);
      setEmployees(empData);
      if (settings && settings.shifts) {
        setShifts(settings.shifts);
      }
      
      const session = getCurrentSession();
      if (session?.isEmployee && session.employeeId) {
        const emp = empData.find(e => e.id === session.employeeId);
        if (emp) setSelectedEmployee(emp);
      }
    };
    loadEmployeesAndShifts();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      loadReport();
    }
  }, [selectedEmployee, startDate, endDate]);

  const loadReport = async () => {
    setLoading(true);
    const data = await fetchAttendance(startDate, endDate);
    // Filter for the selected employee
    const empRecords = data.filter(r => r.employeeId === selectedEmployee?.id);
    setRecords(empRecords);
    setLoading(false);
  };

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
        const recordDate = new Date(r.date);
        const reportToday = new Date();
        reportToday.setHours(0,0,0,0);
        
        // Only count expected hours for dates that have already passed (including today)
        if (recordDate > reportToday) {
            return acc;
        }
        
        const isHoliday = !!r.isHoliday;
        const isOffDay = !!r.isOffDay;
        const isLeave = r.status === 'Leave';
        
        if (isHoliday || isOffDay || isLeave) {
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
            {/* Bulk Download Card */}
            <Card className="p-4 border border-[#1cbdb0]/30 bg-[#1cbdb0]/5">
              <h2 className="text-xs font-black text-[#1cbdb0] mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[#1cbdb0] animate-pulse"></span>
                Bulk Monthly PDF Export
              </h2>
              <p className="text-[10px] text-textMuted uppercase font-bold mb-3">Download all employee reports together in a single consolidated PDF.</p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-black text-textMuted mb-1 uppercase tracking-wider">Select Month</label>
                  <input 
                    type="month" 
                    value={bulkMonth}
                    onChange={(e) => setBulkMonth(e.target.value)}
                    className="w-full bg-surfaceHighlight border border-border rounded p-2 text-xs font-bold text-text focus:outline-none focus:border-primary"
                  />
                </div>
                
                <Button 
                  onClick={downloadAllMonthlyPDFs}
                  disabled={bulkLoading || employees.length === 0}
                  className="w-full text-xs font-bold uppercase tracking-wider h-9 bg-[#1cbdb0] text-white hover:bg-[#15a398] transition-all flex items-center justify-center gap-2"
                >
                  {bulkLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{bulkProgress || 'Processing...'}</span>
                    </>
                  ) : (
                    <>
                      <IconFileText className="w-3.5 h-3.5" />
                      Download All PDFs
                    </>
                  )}
                </Button>
              </div>
            </Card>

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
                      {(() => {
                        const sObj = shifts.find(s => s.id === emp.shift || s.name === emp.shift);
                        return sObj ? (
                          <span className="text-[9px] font-bold uppercase mt-0.5" style={{ color: sObj.color || '#1cbdb0' }}>
                            {sObj.name}
                          </span>
                        ) : emp.shift ? (
                          <span className="text-[9px] text-textMuted italic mt-0.5">
                            {emp.shift}
                          </span>
                        ) : null;
                      })()}
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
          <Card className="p-4 flex flex-wrap items-center gap-4 relative z-50">
            <DateRangePicker 
              startDate={startDate} 
              endDate={endDate} 
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }} 
            />
            
            <div className="flex flex-col ml-auto">
               <Button 
                variant="primary" 
                onClick={loadReport} 
                disabled={!selectedEmployee || loading}
                className="mt-auto px-6"
               >
                 {loading ? 'Processing...' : 'Sync Data'}
               </Button>
            </div>
          </Card>

          {selectedEmployee ? (
            <>
                {selectedEmployee && (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white border border-border flex items-center justify-center overflow-hidden">
                         {selectedEmployee.avatar ? <img src={selectedEmployee.avatar} alt="" className="w-full h-full object-cover" /> : <IconUser className="w-6 h-6 text-textMuted" />}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-text uppercase">{selectedEmployee.name}</h2>
                        <p className="text-sm text-textMuted font-medium uppercase">{selectedEmployee.designation} • {selectedEmployee.department} • {selectedEmployee.workplace || 'No Workplace'}</p>
                        {(() => {
                          const sObj = shifts.find(s => s.id === selectedEmployee.shift || s.name === selectedEmployee.shift);
                          return sObj ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest text-white mt-1.5 uppercase" style={{ backgroundColor: sObj.color || '#1cbdb0' }}>
                              Shift: {sObj.name} ({sObj.startTime} - {sObj.endTime})
                            </span>
                          ) : selectedEmployee.shift ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest text-white mt-1.5 uppercase bg-slate-500">
                              Shift: {selectedEmployee.shift}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Individual Download Actions */}
                    <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                      <Button 
                        variant="secondary"
                        onClick={exportToExcel}
                        disabled={records.length === 0 || loading}
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 uppercase tracking-wide cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Export Excel
                      </Button>
                      <Button 
                        variant="secondary"
                        onClick={exportToPDF}
                        disabled={records.length === 0 || loading}
                        className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 uppercase tracking-wide cursor-pointer"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Export PDF
                      </Button>
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
