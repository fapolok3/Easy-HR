import React, { useState, useEffect, useMemo } from 'react';
import { Card, Input, Button, Badge } from '../components/UI';
import { getMobilePunches, fetchEmployees } from '../services/api';
import { MobilePunch, Employee } from '../types';
import { IconFilter, IconDownload, IconDevice, IconX, IconClock, IconUsers, IconCheckCircle, IconSearch, IconXCircle } from '../components/Icons';
import { motion, AnimatePresence } from 'motion/react';

const MobilePunchReport = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [punches, setPunches] = useState<MobilePunch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPunch, setSelectedPunch] = useState<MobilePunch | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const stats = useMemo(() => {
    const total = punches.length;
    const uniqueIds = new Set(punches.map(p => p.employeeId));
    const uniqueEmps = uniqueIds.size;
    const ins = punches.filter(p => p.type === 'Punch In').length;
    const outs = punches.filter(p => p.type === 'Punch Out').length;
    return { total, uniqueEmps, ins, outs };
  }, [punches]);

  const filteredPunches = useMemo(() => {
    return punches.filter(p => 
      p.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [punches, searchTerm]);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 font-sans transition-all">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <IconDevice className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-text uppercase tracking-tight leading-none">Mobile Punch Report</h1>
          </div>
          <p className="text-sm text-textMuted font-medium pl-1">Detailed tracking of outdoor employee movements and attendance.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-border shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
            <input 
              type="text"
              placeholder="Search employee or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none font-medium"
            />
          </div>
          <Input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-[160px] border-none bg-slate-50 rounded-xl text-sm font-bold h-10 px-3"
          />
          <Button onClick={loadData} variant="secondary" className="rounded-xl px-4 h-10 bg-slate-100 hover:bg-slate-200 border-none text-primary font-bold">
            <IconFilter className="w-4 h-4 mr-2" />
            REFRESH
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5 flex items-center justify-between border-l-4 border-l-primary hover:shadow-md transition-shadow bg-white rounded-2xl shadow-sm">
            <div>
              <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Total Punches</p>
              <h3 className="text-2xl font-black text-text leading-none">{stats.total}</h3>
            </div>
            <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center">
              <IconClock className="w-6 h-6 text-primary" />
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5 flex items-center justify-between border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow bg-white rounded-2xl shadow-sm">
            <div>
              <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Active Employees</p>
              <h3 className="text-2xl font-black text-text leading-none">{stats.uniqueEmps}</h3>
            </div>
            <div className="w-12 h-12 bg-indigo-500/5 rounded-full flex items-center justify-center">
              <IconUsers className="w-6 h-6 text-indigo-500" />
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-5 flex items-center justify-between border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow bg-white rounded-2xl shadow-sm">
            <div>
              <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Punch In</p>
              <h3 className="text-2xl font-black text-text leading-none">{stats.ins}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-500/5 rounded-full flex items-center justify-center">
              <IconCheckCircle className="w-6 h-6 text-emerald-500" />
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-5 flex items-center justify-between border-l-4 border-l-rose-500 hover:shadow-md transition-shadow bg-white rounded-2xl shadow-sm">
            <div>
              <p className="text-[10px] font-black text-textMuted uppercase tracking-widest mb-1">Punch Out</p>
              <h3 className="text-2xl font-black text-text leading-none">{stats.outs}</h3>
            </div>
            <div className="w-12 h-12 bg-rose-500/5 rounded-full flex items-center justify-center">
              <IconXCircle className="w-6 h-6 text-rose-500" />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Main Table Content */}
      <Card className="overflow-hidden border-border bg-white shadow-xl rounded-2xl border-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border text-center w-16">SL</th>
                <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border">Employee Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border">Workplace</th>
                <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border text-center">Punch Action</th>
                <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border text-center">Precise Time</th>
                <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border">GPS Location & Address</th>
                <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm font-bold text-textMuted uppercase tracking-widest">Loading Report Data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredPunches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <div className="p-6 bg-slate-100 rounded-full">
                        <IconSearch className="w-12 h-12 text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-black text-text">No records found</p>
                        <p className="text-sm text-textMuted font-medium max-w-xs mx-auto">We couldn't find any mobile punch records matching your criteria for this date.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPunches.map((punch, index) => {
                  if (!punch) return null;
                  const employee = employees.find(e => e.id === punch.employeeId);
                  return (
                    <motion.tr 
                      key={punch.id} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-slate-50/50 transition-all cursor-default"
                    >
                      <td className="px-6 py-4 text-center font-mono text-xs text-textMuted">
                        {(index + 1).toString().padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                            <span className="text-primary font-black text-xs">
                              {punch.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-text text-sm group-hover:text-primary transition-colors">{punch.employeeName}</span>
                            <span className="text-xs text-textMuted font-bold uppercase tracking-tight">{punch.employeeId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                          <span className="text-xs font-bold text-slate-700 uppercase">{employee?.workplace || 'Main Office'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge 
                          variant={punch.type === 'Punch In' ? 'success' : 'danger'}
                          className={`shadow-sm px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest ${punch.type === 'Punch In' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}
                        >
                          {punch.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-black text-text text-base leading-none">
                            {new Date(punch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] font-bold text-textMuted uppercase mt-1">
                            {new Date(punch.timestamp).toLocaleTimeString([], { second: '2-digit' })} SEC
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 max-w-[250px]">
                          <div className="flex items-start gap-2">
                             <div className="p-1 bg-rose-50 rounded mt-0.5">
                                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                             </div>
                             <span className="text-xs font-bold text-text line-clamp-2 leading-snug">{punch.address}</span>
                          </div>
                          <span className="text-[10px] font-mono text-textMuted pl-5">
                            {punch.latitude.toFixed(6)}, {punch.longitude.toFixed(6)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            setSelectedPunch(punch);
                            setShowMapModal(true);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-95 transition-all outline-none"
                        >
                          View Map
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {/* Footer / Export */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-slate-100">
        <p className="text-xs font-bold text-textMuted uppercase tracking-widest italic">
          Showing {filteredPunches.length} records for {new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <div className="flex items-center gap-3">
           <Button onClick={() => window.print()} className="bg-slate-900 text-white hover:bg-black rounded-xl px-6 py-2 font-black uppercase tracking-widest text-xs shadow-lg shadow-slate-200">
            <IconDownload className="w-4 h-4 mr-2" />
            Generate PDF
          </Button>
        </div>
      </div>

      {/* Map Modal */}
      <AnimatePresence>
        {showMapModal && selectedPunch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowMapModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-3xl bg-white overflow-hidden relative rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] z-50"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <IconUsers className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-text leading-tight">{selectedPunch.employeeName}</h3>
                    <p className="text-xs text-textMuted font-bold uppercase tracking-tight">
                      <span className={selectedPunch.type === 'Punch In' ? 'text-emerald-500' : 'text-rose-500'}>{selectedPunch.type}</span>
                      <span className="mx-2 opacity-30">•</span>
                      {new Date(selectedPunch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowMapModal(false)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors group"
                >
                  <IconX className="w-6 h-6 text-textMuted group-hover:text-text group-hover:rotate-90 transition-transform" />
                </button>
              </div>
              
              <div className="h-[450px] w-full bg-slate-100 relative group">
                <iframe
                  width="100%"
                  height="100%"
                  className="grayscale-0"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${selectedPunch.latitude},${selectedPunch.longitude}&z=16&output=embed`}
                ></iframe>
                
                {/* Visual indicator of the point */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-8 h-8 bg-primary/20 rounded-full animate-ping flex items-center justify-center"></div>
                  <div className="w-4 h-4 bg-primary border-2 border-white rounded-full shadow-lg absolute inset-2"></div>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <IconDevice className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-textMuted uppercase tracking-widest leading-none mb-2">Location Witnessed</p>
                  <p className="text-sm font-bold text-text leading-tight">{selectedPunch.address}</p>
                  <p className="text-[11px] font-mono text-textMuted mt-1">Coordinates: {selectedPunch.latitude.toFixed(6)}, {selectedPunch.longitude.toFixed(6)}</p>
                </div>
                <Button onClick={() => setShowMapModal(false)} className="bg-slate-900 text-white rounded-xl px-6 py-2 font-black uppercase tracking-widest text-xs">
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobilePunchReport;

