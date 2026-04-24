import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Modal } from '../components/UI';
import { getOrgSettings, saveOrgSettings, OrgSettings, Holiday } from '../services/api';
import { IconTrash, IconEdit, IconPlus, IconCalendar } from '../components/Icons';

const Holidays = () => {
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    departments: [],
    designations: [],
    employmentTypes: [],
    workplaces: [],
    shifts: [],
    leavePolicies: [],
    holidays: []
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState<Partial<Holiday>>({
    name: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    setOrgSettings(getOrgSettings());
  }, []);

  const handleOpenModal = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData(holiday);
    } else {
      setEditingHoliday(null);
      setFormData({
        name: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedHolidays = [...(orgSettings.holidays || [])];
    
    if (editingHoliday) {
      updatedHolidays = updatedHolidays.map(h => h.id === editingHoliday.id ? { ...h, ...formData } as Holiday : h);
    } else {
      const newHoliday: Holiday = {
        ...formData,
        id: String(Date.now()),
      } as Holiday;
      updatedHolidays.push(newHoliday);
    }

    const updated = { ...orgSettings, holidays: updatedHolidays };
    setOrgSettings(updated);
    saveOrgSettings(updated);
    setIsModalOpen(false);
  };

  const handleRemove = (id: string) => {
    const updatedHolidays = (orgSettings.holidays || []).filter(h => h.id !== id);
    const updated = { ...orgSettings, holidays: updatedHolidays };
    setOrgSettings(updated);
    saveOrgSettings(updated);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight">Holiday Management</h1>
          <p className="text-sm text-textMuted">Set dates as holidays for the entire organization.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-[#1cbdb0] text-white hover:bg-[#16a398]">
          <IconPlus className="w-4 h-4 mr-2" />
          Add Holiday
        </Button>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#1cbdb0] text-white uppercase font-bold">
              <tr>
                <th className="p-3 border-r border-white/10 w-16 text-center">SL</th>
                <th className="p-3 border-r border-white/10">Holiday Name</th>
                <th className="p-3 border-r border-white/10">Date</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(!orgSettings.holidays || orgSettings.holidays.length === 0) ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-textMuted italic">
                    No holidays defined yet.
                  </td>
                </tr>
              ) : (
                orgSettings.holidays.sort((a,b) => a.date.localeCompare(b.date)).map((holiday, index) => (
                  <tr key={holiday.id} className="hover:bg-surfaceHighlight transition-colors">
                    <td className="p-3 border-r border-border text-center text-textMuted">{index + 1}</td>
                    <td className="p-3 border-r border-border font-bold text-text">{holiday.name}</td>
                    <td className="p-3 border-r border-border text-textMuted flex items-center gap-2">
                       <IconCalendar className="w-4 h-4" />
                       {new Date(holiday.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                       <span className="text-[10px] uppercase font-bold text-primary">
                          ({new Date(holiday.date).toLocaleDateString('en-GB', { weekday: 'short' })})
                       </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => handleOpenModal(holiday)}
                          className="text-primary hover:text-primaryHover"
                        >
                          <IconEdit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleRemove(holiday.id)}
                          className="text-danger hover:text-red-700"
                        >
                          <IconTrash className="w-4 h-4" />
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
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input 
            label="Holiday Name" 
            placeholder="e.g. Eid-ul-Fitr, New Year"
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
          />
          <Input 
            label="Date" 
            type="date"
            value={formData.date} 
            onChange={e => setFormData({...formData, date: e.target.value})}
            required
          />
          <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingHoliday ? 'Update Holiday' : 'Create Holiday'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Holidays;
