import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Badge } from '../components/UI';
import { fetchAttendance } from '../services/api';
import { AttendanceRecord } from '../types';
import { IconXCircle, IconFilter, IconDownload } from '../components/Icons';

const AbsentReport = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAttendance(date, date);
      // Filter for absent records or those on an off day
      setRecords(data.filter(r => r.status === 'Absent' || r.status === 'Off Day'));
    } catch (error) {
      console.error('Failed to fetch absent report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date]);

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight">Daily Absent Report</h1>
          <p className="text-sm text-textMuted">List of employees who were absent on the selected date.</p>
        </div>
        <div className="flex items-center gap-3">
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
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-textMuted">Loading report data...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-textMuted italic">No absent records found for this date.</td>
                </tr>
              ) : (
                records.map((rec, index) => (
                  <tr key={index} className="hover:bg-surfaceHighlight transition-colors">
                    <td className="p-3 border-r border-border text-center text-textMuted">{index + 1}</td>
                    <td className="p-3 border-r border-border font-mono">{rec.employeeId}</td>
                    <td className="p-3 border-r border-border font-bold text-text">{rec.employeeName}</td>
                    <td className="p-3 border-r border-border text-center text-textMuted">{rec.date}</td>
                    <td className="p-3 text-center">
                      <Badge variant={rec.status === 'Absent' ? 'danger' : 'default'}>
                        {rec.status === 'Absent' ? 'ABSENT' : 'OFF DAY'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

export default AbsentReport;
