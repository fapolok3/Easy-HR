import React, { useState, useEffect, useMemo } from 'react';
import { Card, Input, Button, Badge } from '../components/UI';
import { getMobilePunches, fetchEmployees } from '../services/api';
import { MobilePunch, Employee } from '../types';
import { IconFilter, IconDownload, IconDevice, IconX, IconClock, IconUsers, IconCheckCircle, IconSearch, IconXCircle, IconChevronLeft } from '../components/Icons';
import { motion, AnimatePresence } from 'motion/react';

const MobilePunchReport = () => {
  const [viewMode, setViewMode] = useState<'employees' | 'details'>('employees');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
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
      
      const filtered = data.filter(p => {
        const d = new Date(p.timestamp);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        
        if (filterMode === 'daily') {
          const punchDate = `${y}-${m}-${day}`;
          return punchDate === selectedDate;
        } else {
          const punchMonth = `${y}-${m}`;
          return punchMonth === selectedMonth;
        }
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
  }, [selectedDate, selectedMonth, filterMode]);

  const handleDownloadExcel = () => {
    if (filteredPunches.length === 0) return;

    const headers = ['SL', 'Employee ID', 'Employee Name', 'Workplace', 'Type', 'Date', 'Time', 'Address', 'Latitude', 'Longitude'];
    const csvContent = [
      headers.join(','),
      ...filteredPunches.map((p, i) => [
        (i + 1),
        p.employeeId,
        `"${p.employeeName}"`,
        `"${employees.find(e => e.id === p.employeeId)?.workplace || 'Main Office'}"`,
        p.type,
        new Date(p.timestamp).toLocaleDateString(),
        new Date(p.timestamp).toLocaleTimeString(),
        `"${p.address.replace(/"/g, '""')}"`,
        p.latitude,
        p.longitude
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `Mobile_Punch_Report_${filterMode === 'daily' ? selectedDate : selectedMonth}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const activeEmployees = useMemo(() => {
    const employeeMap = new Map<string, { id: string, name: string, punchCount: number, lastPunch: string }>();
    
    filteredPunches.forEach(p => {
      const existing = employeeMap.get(p.employeeId);
      if (existing) {
        existing.punchCount++;
        if (new Date(p.timestamp) > new Date(existing.lastPunch)) {
          existing.lastPunch = p.timestamp;
        }
      } else {
        employeeMap.set(p.employeeId, {
          id: p.employeeId,
          name: p.employeeName,
          punchCount: 1,
          lastPunch: p.timestamp
        });
      }
    });

    return Array.from(employeeMap.values()).sort((a, b) => b.punchCount - a.punchCount);
  }, [filteredPunches]);

  const employeePunches = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return filteredPunches.filter(p => p.employeeId === selectedEmployeeId);
  }, [filteredPunches, selectedEmployeeId]);

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 font-sans transition-all">
      {/* Header Section */}
      <div className="space-y-6 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {viewMode === 'details' && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setViewMode('employees');
                  setSelectedEmployeeId(null);
                }}
                className="p-2 h-auto -ml-2"
              >
                <IconChevronLeft className="w-6 h-6" />
              </Button>
            )}
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <IconDevice className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-black text-text uppercase tracking-tight leading-none">
              {viewMode === 'employees' ? 'Mobile Punch Report' : 'Employee Detailed Punches'}
            </h1>
          </div>
          <p className="text-xs text-textMuted font-medium pl-1">
            {viewMode === 'employees' 
              ? 'Detailed tracking of outdoor employee movements and attendance.'
              : `Viewing punches for ${activeEmployees.find(e => e.id === selectedEmployeeId)?.name || 'Employee'}`
            }
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-surface p-4 rounded-xl shadow-sm border border-border relative z-40">
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-border">
            <button 
              onClick={() => setFilterMode('daily')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === 'daily' ? 'bg-white text-primary shadow-sm' : 'text-textMuted hover:text-text'}`}
            >
              Daily
            </button>
            <button 
              onClick={() => setFilterMode('monthly')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === 'monthly' ? 'bg-white text-primary shadow-sm' : 'text-textMuted hover:text-text'}`}
            >
              Monthly
            </button>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <input 
              type="text" 
              placeholder="Search employee or location..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl py-2 pl-3 pr-10 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary h-10 font-medium"
            />
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
          </div>
          
          {filterMode === 'daily' ? (
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[160px] border border-border bg-surface rounded-xl text-sm font-bold h-10 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-[180px] border border-border bg-surface rounded-xl text-sm font-bold h-10 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}

          <button 
            onClick={handleDownloadExcel} 
            className="flex items-center justify-center gap-2 bg-text text-white px-5 h-10 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 w-full sm:w-auto uppercase tracking-widest"
          >
            <IconDownload className="w-4 h-4 text-primary" />
            <span>Export Excel</span>
          </button>

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
              <h3 className="text-xl font-black text-text leading-none">{stats.total}</h3>
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
              <h3 className="text-xl font-black text-text leading-none">{stats.uniqueEmps}</h3>
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
              <h3 className="text-xl font-black text-text leading-none">{stats.ins}</h3>
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
              <h3 className="text-xl font-black text-text leading-none">{stats.outs}</h3>
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
                {viewMode === 'employees' ? (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border">Employee Details</th>
                    <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border text-center">Total Punches</th>
                    <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border text-center">Last Punch At</th>
                    <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border text-right">Actions</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border">Punch Details</th>
                    <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border text-center">Action</th>
                    <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border text-center">Time</th>
                    <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border">Location</th>
                    <th className="px-6 py-4 text-[10px] font-black text-textMuted uppercase tracking-widest border-b border-border text-right">Map</th>
                  </>
                )}
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
              ) : (viewMode === 'employees' ? activeEmployees.length : employeePunches.length) === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-50">
                      <div className="p-6 bg-slate-100 rounded-full">
                        <IconSearch className="w-12 h-12 text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-black text-text">No records found</p>
                        <p className="text-sm text-textMuted font-medium max-w-xs mx-auto">We couldn't find any records matching your criteria for this view.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : viewMode === 'employees' ? (
                activeEmployees.map((emp, index) => (
                  <motion.tr 
                    key={emp.id} 
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
                            {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-text text-xs group-hover:text-primary transition-colors">{emp.name}</span>
                          <span className="text-xs text-textMuted font-bold uppercase tracking-tight">{emp.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge className="bg-indigo-50 text-indigo-600 border-none font-black">{emp.punchCount} Punches</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-black text-text text-xs">
                          {new Date(emp.lastPunch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] font-bold text-textMuted uppercase mt-1">
                          {new Date(emp.lastPunch).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setViewMode('details');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black hover:shadow-lg active:scale-95 transition-all outline-none"
                      >
                        View Details
                      </button>
                    </td>
                  </motion.tr>
                ))
              ) : (
                employeePunches.map((punch, index) => {
                  if (!punch) return null;
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
                        <div className="flex flex-col">
                          <span className="font-black text-text text-xs capitalize">{punch.type} Report</span>
                          <span className="text-[10px] text-textMuted font-bold uppercase tracking-widest">{new Date(punch.timestamp).toLocaleDateString()}</span>
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
                          <span className="font-black text-text text-sm leading-none">
                            {new Date(punch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 max-w-[250px]">
                          <span className="text-xs font-bold text-text line-clamp-2 leading-snug">{punch.address}</span>
                          <span className="text-[10px] font-mono text-textMuted">
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
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 hover:shadow-lg active:scale-95 transition-all outline-none"
                        >
                          Show Map
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
          Showing {filteredPunches.length} records for {
            filterMode === 'daily' 
              ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }
        </p>
        <div className="flex items-center gap-3">
           <Button onClick={() => window.print()} className="bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[10px] hidden sm:flex">
             Print View
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
              className="w-full max-w-xl bg-white overflow-hidden relative rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] z-50"
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
              
              <div className="h-[300px] w-full bg-slate-100 relative group">
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

