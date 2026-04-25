import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Select as UISelect } from '../components/UI';
import { fetchEmployees, getOrgSettings, getAdvanceRoster, saveAdvanceRoster } from '../services/api';
import { Employee, Shift, AdvanceRoster } from '../types';
import { IconChevronLeft, IconChevronRight, IconSave, IconSearch, IconClock, IconCalendar } from '../components/Icons';
import { motion } from 'motion/react';

const AdvanceRostering = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [rosterData, setRosterData] = useState<AdvanceRoster[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  const monthStr = useMemo(() => {
    const y = selectedMonth.getFullYear();
    const m = String(selectedMonth.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [selectedMonth]);

  const daysInMonth = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => i + 1);
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empData, settings, roster] = await Promise.all([
        fetchEmployees(),
        getOrgSettings(),
        getAdvanceRoster(monthStr)
      ]);
      setEmployees(empData.filter(e => e.status === 'Active'));
      setShifts(settings.shifts || []);
      setRosterData(roster);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthStr]);

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedMonth(newDate);
  };

  const getShiftForDay = (empId: string, day: number) => {
    const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
    const empRoster = rosterData.find(r => r.employeeId === empId);
    return empRoster?.assignments[dateStr] || '';
  };

  const updateRoster = (empId: string, empName: string, day: number, shiftId: string) => {
    const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
    const newRosterData = [...rosterData];
    const index = newRosterData.findIndex(r => r.employeeId === empId);

    if (index >= 0) {
      newRosterData[index] = {
        ...newRosterData[index],
        assignments: {
          ...newRosterData[index].assignments,
          [dateStr]: shiftId
        }
      };
    } else {
      newRosterData.push({
        employeeId: empId,
        employeeName: empName,
        month: monthStr,
        assignments: { [dateStr]: shiftId }
      });
    }
    setRosterData(newRosterData);
    setSaveStatus('idle');
  };

  const handleSaveAll = async () => {
    setSaveStatus('saving');
    try {
      for (const roster of rosterData) {
        await saveAdvanceRoster(roster);
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight flex items-center gap-2">
            <IconClock className="w-8 h-8 text-primary" />
            Advance Rostering
          </h1>
          <p className="text-sm text-textMuted font-medium">Schedule specific shifts for individual dates.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-border rounded-xl p-1 shadow-sm">
            <button 
              onClick={() => handleMonthChange(-1)} 
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <IconChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 font-black uppercase text-sm tracking-widest min-w-[150px] text-center">
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button 
              onClick={() => handleMonthChange(1)} 
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <IconChevronRight className="w-5 h-5" />
            </button>
          </div>

          <Button 
            onClick={handleSaveAll} 
            disabled={saveStatus === 'saving'}
            className={`${saveStatus === 'success' ? 'bg-emerald-500' : 'bg-slate-900'} text-white min-w-[140px] shadow-lg shadow-slate-200 uppercase font-black tracking-widest text-xs h-11 px-6 rounded-xl`}
          >
            <IconSave className="w-4 h-4 mr-2" />
            {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'success' ? 'SAVED!' : 'SAVE ROSTER'}
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-white shadow-xl rounded-2xl border-none">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
           <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
              <input 
                type="text" 
                placeholder="Search employee by name or ID..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
              <IconCalendar className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                {filteredEmployees.length} Employees Active
              </span>
           </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-4 border-b border-slate-100 min-w-[220px] bg-slate-50 sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                   <p className="text-[10px] font-black text-textMuted uppercase tracking-widest">Employee Information</p>
                </th>
                {daysInMonth.map(day => {
                  const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
                  const isWeekend = date.getDay() === 5 || date.getDay() === 6; // Friday/Saturday for BD context? Usually Friday.
                  return (
                    <th key={day} className={`p-2 border-b border-r border-slate-100 text-center min-w-[100px] ${isWeekend ? 'bg-rose-50/50' : ''}`}>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-textMuted uppercase">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className="text-lg font-black text-text leading-none mt-0.5">{day}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                   <td colSpan={daysInMonth.length + 1} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-xs font-black text-textMuted uppercase tracking-widest">Loading Roster Matrix...</p>
                      </div>
                   </td>
                </tr>
              ) : filteredEmployees.map((emp, idx) => (
                <motion.tr 
                  key={emp.id} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  <td className="p-4 border-b border-slate-100 bg-white group-hover:bg-slate-50 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-xs shrink-0">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-text text-sm truncate uppercase tracking-tight">{emp.name}</p>
                        <p className="text-[10px] text-textMuted font-bold uppercase tracking-tighter">{emp.id} • {emp.designation}</p>
                      </div>
                    </div>
                  </td>
                  {daysInMonth.map(day => {
                    const currentShiftId = getShiftForDay(emp.id, day);
                    const shiftObj = shifts.find(s => s.id === currentShiftId);
                    
                    return (
                      <td key={day} className="p-2 border-b border-r border-slate-100 text-center">
                        <select 
                          className={`w-full text-[10px] font-black uppercase tracking-tighter py-1.5 px-2 rounded-lg border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer ${
                            currentShiftId === 'Off Day' ? 'bg-rose-100 text-rose-600' : 
                            currentShiftId ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                          }`}
                          value={currentShiftId}
                          onChange={(e) => updateRoster(emp.id, emp.name, day, e.target.value)}
                        >
                          <option value="">Default</option>
                          <option value="Off Day">OFF DAY</option>
                          {shifts.map(s => (
                            <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                          ))}
                        </select>
                        {shiftObj && (
                          <div className="mt-1 text-[8px] font-bold text-textMuted uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                            {shiftObj.startTime} - {shiftObj.endTime}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm text-indigo-500">
               <IconClock className="w-6 h-6" />
            </div>
            <div>
               <h4 className="font-black text-indigo-900 uppercase text-sm tracking-tight">Rostering Guide</h4>
               <p className="text-xs text-indigo-600/80 max-w-md">"Default" will use the employee's standard assigned shift. Select "OFF DAY" to overwrite with a holiday, or pick any other shift to override for that specific date.</p>
            </div>
         </div>
         <Button 
            onClick={handleSaveAll} 
            disabled={saveStatus === 'saving'}
            className="bg-indigo-600 text-white rounded-2xl px-10 py-3 font-black uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all text-sm"
          >
            {saveStatus === 'saving' ? 'Processing...' : 'Sync All Changes'}
         </Button>
      </div>
    </div>
  );
};

export default AdvanceRostering;
