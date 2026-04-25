import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Badge } from '../components/UI';
import { getMobilePunches, fetchEmployees } from '../services/api';
import { MobilePunch, Employee } from '../types';
import { IconFilter, IconDownload, IconDevice, IconX } from '../components/Icons';

const MobilePunchReport = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [punches, setPunches] = useState<MobilePunch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPunch, setSelectedPunch] = useState<MobilePunch | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, emps] = await Promise.all([
        getMobilePunches(),
        fetchEmployees()
      ]);
      setEmployees(emps);
      // Filter by date using local date components to avoid timezone shifting
      const filtered = data.filter(p => {
        const d = new Date(p.timestamp);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const localDate = `${y}-${m}-${day}`;
        return localDate === date;
      });
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
                <th className="p-3 border-r border-white/10">Office / Workplace</th>
                <th className="p-3 border-r border-white/10 text-center">Type</th>
                <th className="p-3 border-r border-white/10 text-center">Time</th>
                <th className="p-3 border-r border-white/10">Location / Address</th>
                <th className="p-3 text-center">Map Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-textMuted">Loading data...</td>
                </tr>
              ) : punches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-textMuted italic">No mobile punches recorded for this date.</td>
                </tr>
              ) : (
                punches.map((punch, index) => {
                  if (!punch) return null;
                  return (
                    <tr key={punch.id} className="hover:bg-surfaceHighlight transition-colors">
                      <td className="p-3 border-r border-border text-center text-textMuted">{index + 1}</td>
                      <td className="p-3 border-r border-border">
                        <div className="flex flex-col">
                          <span className="font-bold text-text">{punch.employeeName}</span>
                          <span className="text-xs text-textMuted font-mono">{punch.employeeId}</span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-border font-medium text-text">
                        {employees.find(e => e.id === punch.employeeId)?.workplace || 'Unknown'}
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
                        <button 
                          onClick={() => {
                            setSelectedPunch(punch);
                            setShowMapModal(true);
                          }}
                          className="text-primary hover:underline text-xs font-bold bg-transparent border-none cursor-pointer"
                        >
                          VIEW ON MAP
                        </button>
                      </td>
                    </tr>
                  );
                })
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

      {/* Map Modal */}
      {showMapModal && selectedPunch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-2xl bg-white overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-border flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-text">{selectedPunch.employeeName}</h3>
                <p className="text-xs text-textMuted">{selectedPunch.type} - {new Date(selectedPunch.timestamp).toLocaleTimeString()}</p>
              </div>
              <button 
                onClick={() => setShowMapModal(false)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <IconX className="w-5 h-5 text-textMuted" />
              </button>
            </div>
            
            <div className="h-[400px] w-full bg-slate-100 relative">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${selectedPunch.latitude},${selectedPunch.longitude}&z=16&output=embed`}
              ></iframe>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-border flex items-center justify-center">
                <IconDevice className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-text uppercase leading-none mb-1">PUNCH LOCATION</p>
                <p className="text-sm text-textMuted truncate">{selectedPunch.address}</p>
              </div>
              <Button onClick={() => setShowMapModal(false)} variant="secondary" size="sm">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MobilePunchReport;
