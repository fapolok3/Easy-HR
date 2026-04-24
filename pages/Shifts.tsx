import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Modal, Select as UISelect } from '../components/UI';
import { getOrgSettings, saveOrgSettings, OrgSettings, Shift } from '../services/api';
import { IconTrash, IconEdit, IconCheckCircle } from '../components/Icons';

const Shifts = () => {
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    departments: [],
    designations: [],
    employmentTypes: [],
    workplaces: [],
    shifts: [],
    leavePolicies: []
  });
  
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftFormData, setShiftFormData] = useState<Partial<Shift>>({
    name: '',
    startTime: '09:00 am',
    endTime: '06:00 pm',
    lateAfter: '09:10 am',
    earlyExitBefore: '05:50 pm',
    offDays: []
  });

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getOrgSettings();
      setOrgSettings(settings);
    };
    loadSettings();
  }, []);

  const handleOpenShiftModal = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setShiftFormData({
        ...shift,
        offDays: shift.offDays || []
      });
    } else {
      setEditingShift(null);
      setShiftFormData({
        name: '',
        startTime: '09:00 am',
        endTime: '06:00 pm',
        lateAfter: '09:10 am',
        earlyExitBefore: '05:50 pm',
        offDays: []
      });
    }
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    let updatedShifts = [...orgSettings.shifts];
    
    if (editingShift) {
      updatedShifts = updatedShifts.map(s => s.id === editingShift.id ? { ...s, ...shiftFormData } as Shift : s);
    } else {
      const newShift: Shift = {
        ...shiftFormData,
        id: String(Date.now()),
      } as Shift;
      updatedShifts.push(newShift);
    }

    const updated = { ...orgSettings, shifts: updatedShifts };
    setOrgSettings(updated);
    await saveOrgSettings(updated);
    setIsShiftModalOpen(false);
  };

  const handleRemoveShift = async (index: number) => {
    const updatedShifts = orgSettings.shifts.filter((_, i) => i !== index);
    const updated = { ...orgSettings, shifts: updatedShifts };
    setOrgSettings(updated);
    await saveOrgSettings(updated);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight">Shift Management</h1>
          <p className="text-sm text-textMuted">Configure and manage company working hours and rotas.</p>
        </div>
        <Button onClick={() => handleOpenShiftModal()} className="bg-slate-800 text-white hover:bg-slate-700 h-9 px-4 text-sm">
          <IconCheckCircle className="w-4 h-4 mr-2" />
          Create Shift
        </Button>
      </div>

      <Card className="p-2 md:p-4 overflow-hidden">
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left text-[11px] md:text-[12px] whitespace-nowrap table-fixed">
            <thead className="bg-[#1cbdb0] text-white uppercase font-bold text-center">
              <tr>
                <th className="w-12 py-3 border-r border-white/10">SL</th>
                <th className="w-48 py-3 border-r border-white/10 text-left px-3">Name</th>
                <th className="py-3 border-r border-white/10">Start Time</th>
                <th className="py-3 border-r border-white/10">End Time</th>
                <th className="py-3 border-r border-white/10">Late After</th>
                <th className="py-3 border-r border-white/10">Early Exit</th>
                <th className="py-3 border-r border-white/10 text-center">Off Days</th>
                <th className="w-24 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgSettings.shifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-textMuted text-sm">
                    No shifts configured. Click "Create Shift" to start.
                  </td>
                </tr>
              ) : (
                orgSettings.shifts.map((shift, index) => (
                  <tr key={shift.id} className="hover:bg-surfaceHighlight/30 transition-colors text-textMuted text-center">
                    <td className="py-3 border-r border-border">{index + 1}</td>
                    <td className="py-3 px-3 text-left border-r border-border truncate font-medium text-[#1cbdb0]">
                      {shift.name}
                    </td>
                    <td className="py-3 border-r border-border">{shift.startTime}</td>
                    <td className="py-3 border-r border-border">{shift.endTime}</td>
                    <td className="py-3 border-r border-border">{shift.lateAfter}</td>
                    <td className="py-3 border-r border-border">{shift.earlyExitBefore}</td>
                    <td className="py-3 border-r border-border font-bold text-[9px] uppercase">
                      {shift.offDays && shift.offDays.length > 0 ? (
                         <div className="flex flex-wrap justify-center gap-1">
                            {shift.offDays.map(d => (
                              <span key={d} className="bg-slate-100 px-1 rounded">{d.substring(0,3)}</span>
                            ))}
                         </div>
                      ) : '-'}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenShiftModal(shift)}
                          className="p-1.5 bg-[#1cbdb0] text-white rounded hover:bg-[#16a398] transition-colors"
                          title="Edit"
                        >
                          <IconEdit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleRemoveShift(index)}
                          className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          title="Delete"
                        >
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal 
        isOpen={isShiftModalOpen} 
        onClose={() => setIsShiftModalOpen(false)} 
        title={editingShift ? 'Edit Shift' : 'Create New Shift'}
      >
        <form onSubmit={handleSaveShift} className="space-y-4">
          <Input 
            label="Shift Name" 
            value={shiftFormData.name} 
            onChange={e => setShiftFormData({...shiftFormData, name: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Start Time" 
              value={shiftFormData.startTime} 
              placeholder="09:00 am"
              onChange={e => setShiftFormData({...shiftFormData, startTime: e.target.value})}
            />
            <Input 
              label="End Time" 
              value={shiftFormData.endTime} 
              placeholder="06:00 pm"
              onChange={e => setShiftFormData({...shiftFormData, endTime: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Late After" 
              value={shiftFormData.lateAfter} 
              placeholder="09:10 am"
              onChange={e => setShiftFormData({...shiftFormData, lateAfter: e.target.value})}
            />
            <Input 
              label="Early Exit Before" 
              value={shiftFormData.earlyExitBefore} 
              placeholder="05:50 pm"
              onChange={e => setShiftFormData({...shiftFormData, earlyExitBefore: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-textMuted uppercase">Weekly Off Days</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                <label key={day} className="flex items-center gap-2 p-2 border border-border rounded-lg hover:bg-surfaceHighlight cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={shiftFormData.offDays?.includes(day)}
                    onChange={(e) => {
                      const currentOffDays = shiftFormData.offDays || [];
                      if (e.target.checked) {
                        setShiftFormData({ ...shiftFormData, offDays: [...currentOffDays, day] });
                      } else {
                        setShiftFormData({ ...shiftFormData, offDays: currentOffDays.filter(d => d !== day) });
                      }
                    }}
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                  />
                  <span className="text-[11px] font-medium text-text">{day}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="ghost" type="button" onClick={() => setIsShiftModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingShift ? 'Update Shift' : 'Create Shift'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Shifts;
