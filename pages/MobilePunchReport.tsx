import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Badge } from '../components/UI';
import { getMobilePunches, MobilePunch } from '../services/api';
import { IconFilter, IconDownload, IconDevice } from '../components/Icons';

const MobilePunchReport = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [punches, setPunches] = useState<MobilePunch[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    try {
      const data = getMobilePunches();
      // Filter by date
      const filtered = data.filter(p => p.timestamp.startsWith(date));
      setPunches(filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (error) {
      console.error('Failed to fetch mobile punches:', error);
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
          <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight">Mobile Punch Report</h1>
          <p className="text-sm text-textMuted">View employee punch locations and timestamps.</p>
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
                <th className="p-3 border-r border-white/10">Employee</th>
                <th className="p-3 border-r border-white/10 text-center">Type</th>
                <th className="p-3 border-r border-white/10 text-center">Time</th>
                <th className="p-3 border-r border-white/10">Location / Address</th>
                <th className="p-3 text-center">Map Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-textMuted">Loading data...</td>
                </tr>
              ) : punches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-textMuted italic">No mobile punches recorded for this date.</td>
                </tr>
              ) : (
                punches.map((punch, index) => (
                  <tr key={punch.id} className="hover:bg-surfaceHighlight transition-colors">
                    <td className="p-3 border-r border-border text-center text-textMuted">{index + 1}</td>
                    <td className="p-3 border-r border-border">
                      <div className="flex flex-col">
                        <span className="font-bold text-text">{punch.employeeName}</span>
                        <span className="text-xs text-textMuted font-mono">{punch.employeeId}</span>
                      </div>
                    </td>
                    <td className="p-3 border-r border-border text-center">
                      <Badge variant={punch.type === 'Punch In' ? 'success' : 'danger'}>
                        {punch.type.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-3 border-r border-border text-center font-mono font-bold text-text">
                      {new Date(punch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-3 border-r border-border">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-text">{punch.address}</span>
                        <span className="text-[10px] text-textMuted font-mono">
                          {punch.latitude.toFixed(6)}, {punch.longitude.toFixed(6)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <a 
                        href={`https://www.google.com/maps?q=${punch.latitude},${punch.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline text-xs font-bold"
                      >
                        VIEW ON MAP
                      </a>
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
          Export Report
        </Button>
      </div>
    </div>
  );
};

export default MobilePunchReport;
