import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, Badge } from '../components/UI';
import { fetchAttendance } from '../services/api';
import { AttendanceRecord } from '../types';
import { IconClock, IconFilter, IconDownload } from '../components/Icons';

const LateReport = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAttendance(date, date);
      // Filter for late records only
      setRecords(data.filter(r => r.isLate));
    } catch (error) {
      console.error('Failed to fetch late report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date]);

  const formatTimeTo12Hour = (timeStr: string) => {
    if (!timeStr || timeStr === '-') return '-';
    try {
      const [hours, minutes] = timeStr.split(':');
      let h = parseInt(hours);
      const m = minutes;
      const ampm = h >= 12 ? 'pm' : 'am';
      h = h % 12;
      h = h ? h : 12;
      return `${h}:${m} ${ampm}`;
    } catch(e) {
      return timeStr;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight">Daily Late Report</h1>
          <p className="text-sm text-textMuted">List of employees who arrived late on the selected date.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surfaceHighlight p-2 rounded-lg border border-border shadow-sm">
            <span className="text-[10px] text-textMuted uppercase font-bold">Rows:</span>
            <select 
              value={rowsPerPage} 
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold rounded p-1 outline-none cursor-pointer"
            >
              {[50, 100, 500, 1000].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <Input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[200px]"
          />
          <Button onClick={loadData} variant="secondary">
            <IconFilter className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1cbdb0] text-white font-bold uppercase">
              <tr>
                <th className="p-3 border-r border-white/10 w-16 text-center">SL</th>
                <th className="p-3 border-r border-white/10">Employee ID</th>
                <th className="p-3 border-r border-white/10">Employee Name</th>
                <th className="p-3 border-r border-white/10 text-center">Date</th>
                <th className="p-3 border-r border-white/10 text-center">In Time</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-textMuted">Loading report data...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-textMuted italic">No late records found for this date.</td>
                </tr>
              ) : (
                records
                  .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                  .map((rec, index) => (
                  <tr key={index} className="hover:bg-surfaceHighlight transition-colors">
                    <td className="p-3 border-r border-border text-center text-textMuted">{(currentPage - 1) * rowsPerPage + index + 1}</td>
                    <td className="p-3 border-r border-border font-mono">{rec.employeeId}</td>
                    <td className="p-3 border-r border-border font-bold text-text">
                      <button 
                        onClick={() => navigate(`/employees/${rec.employeeId}`)}
                        className="hover:text-primary transition-colors text-left"
                      >
                        {rec.employeeName}
                      </button>
                    </td>
                    <td className="p-3 border-r border-border text-center text-textMuted">{rec.date}</td>
                    <td className="p-3 border-r border-border text-center font-mono font-bold text-red-600 bg-red-50">
                       <div className="flex items-center justify-center gap-2">
                          {formatTimeTo12Hour(rec.checkIn)}
                          <span className="text-[10px] font-black">(L)</span>
                       </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="warning">LATE</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-4 mt-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-textMuted uppercase font-bold">
              {Math.min((currentPage - 1) * rowsPerPage + 1, records.length)} - {Math.min(currentPage * rowsPerPage, records.length)} OF {records.length}
            </span>
            <div className="flex items-center gap-1">
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1 min-w-[32px]"
              >
                &lt;
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={currentPage * rowsPerPage >= records.length}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1 min-w-[32px]"
              >
                &gt;
              </Button>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={() => window.print()} className="bg-slate-800 text-white hover:bg-slate-900">
          <IconDownload className="w-4 h-4 mr-2" />
          Print Report
        </Button>
      </div>
    </div>
  );
};

export default LateReport;
