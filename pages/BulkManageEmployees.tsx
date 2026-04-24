import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select } from '../components/UI';
import { IconUsers, IconCheckCircle, IconArrowLeft } from '../components/Icons';
import { fetchEmployees, getOrgSettings, bulkUpdateEmployees } from '../services/api';
import { Employee, OrgSettings } from '../types';

const BulkManageEmployees = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedIds = location.state?.ids as string[] || [];

  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targetEmployees, setTargetEmployees] = useState<Employee[]>([]);
  
  const [bulkData, setBulkData] = useState<any>({
    department: '',
    designation: '',
    shift: '',
    shiftEffectiveDate: '',
    employmentType: '',
    gender: '',
    leavePolicy: '',
    lineManager: '',
    workplace: ''
  });

  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    departments: [],
    designations: [],
    shifts: [],
    leavePolicies: [],
    employmentTypes: [],
    workplaces: []
  });

  useEffect(() => {
    if (selectedIds.length === 0) {
      navigate('/employees');
      return;
    }

    const loadData = async () => {
      try {
        const [allEmps, settings] = await Promise.all([
          fetchEmployees(),
          getOrgSettings()
        ]);
        setEmployees(allEmps);
        setOrgSettings(settings);
        setTargetEmployees(allEmps.filter(e => selectedIds.includes(e.id)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedIds, navigate]);

  const handleBulkUpdate = async () => {
    setIsUpdating(true);
    try {
      const updates: any = {};
      Object.keys(bulkData).forEach(key => {
        const val = bulkData[key];
        if (val !== '' && val !== undefined) {
          updates[key] = val;
        }
      });

      if (Object.keys(updates).length > 0) {
        await bulkUpdateEmployees(targetEmployees, updates);
        navigate('/employees');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update employees');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-primary">Loading configuration...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate('/employees')}>
          <IconArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-black text-text">Bulk Manage Employees</h1>
          <p className="text-textMuted">Updating {selectedIds.length} selected records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select 
              label="Department"
              value={bulkData.department}
              onChange={e => setBulkData({...bulkData, department: e.target.value})}
              options={[
                { label: 'Keep Existing', value: '' },
                ...orgSettings.departments.map(d => ({ label: d, value: d }))
              ]}
            />
            <Select 
              label="Designation"
              value={bulkData.designation}
              onChange={e => setBulkData({...bulkData, designation: e.target.value})}
              options={[
                { label: 'Keep Existing', value: '' },
                ...orgSettings.designations.map(d => ({ label: d, value: d }))
              ]}
            />
            <Select 
              label="Shift"
              value={bulkData.shift}
              onChange={e => {
                const newShift = e.target.value;
                setBulkData({
                  ...bulkData, 
                  shift: newShift,
                  shiftEffectiveDate: newShift && !bulkData.shiftEffectiveDate ? new Date().toISOString().split('T')[0] : bulkData.shiftEffectiveDate
                });
              }}
              options={[
                { label: 'Keep Existing', value: '' },
                ...orgSettings.shifts.map(s => ({ label: s.name, value: s.id }))
              ]}
            />
            <Input 
              label="Shift Effective Date" 
              type="date" 
              value={bulkData.shiftEffectiveDate}
              disabled={!bulkData.shift}
              onChange={e => setBulkData({...bulkData, shiftEffectiveDate: e.target.value})}
            />
            <Select 
              label="Employment Type"
              value={bulkData.employmentType}
              onChange={e => setBulkData({...bulkData, employmentType: e.target.value})}
              options={[
                { label: 'Keep Existing', value: '' },
                ...orgSettings.employmentTypes.map(t => ({ label: t, value: t }))
              ]}
            />
            <Select 
              label="Gender"
              value={bulkData.gender}
              onChange={e => setBulkData({...bulkData, gender: e.target.value})}
              options={[
                { label: 'Keep Existing', value: '' },
                { label: 'Male', value: 'Male' },
                { label: 'Female', value: 'Female' }
              ]}
            />
            <Select 
              label="Leave Policy"
              value={bulkData.leavePolicy}
              onChange={e => setBulkData({...bulkData, leavePolicy: e.target.value})}
              options={[
                { label: 'Keep Existing', value: '' },
                ...orgSettings.leavePolicies.map(p => ({ label: p.name, value: p.name }))
              ]}
            />
            <Select 
              label="Workplace"
              value={bulkData.workplace}
              onChange={e => setBulkData({...bulkData, workplace: e.target.value})}
              options={[
                { label: 'Keep Existing', value: '' },
                ...orgSettings.workplaces.map(w => ({ label: w, value: w }))
              ]}
            />
            <Select 
              label="Line Manager"
              className="sm:col-span-2"
              value={bulkData.lineManager}
              onChange={e => setBulkData({...bulkData, lineManager: e.target.value})}
              options={[
                { label: 'Keep Existing', value: '' },
                ...employees.filter(e => e.isLineManager).map(e => ({ label: e.name, value: e.name }))
              ]}
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
             <Button variant="secondary" onClick={() => navigate('/employees')}>Cancel</Button>
             <Button 
               onClick={handleBulkUpdate}
               disabled={isUpdating || Object.values(bulkData).every(v => v === '' || v === undefined)}
               className="gap-2"
             >
               {isUpdating ? 'Applying Changes...' : <><IconCheckCircle className="w-4 h-4" /> Update Employees</>}
             </Button>
          </div>
        </Card>

        <Card className="p-4 bg-surfaceHighlight/30 h-fit">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <IconUsers className="w-4 h-4 text-primary" />
            Selected Employees ({targetEmployees.length})
          </h3>
          <div className="max-h-[500px] overflow-y-auto space-y-2">
            {targetEmployees.map(emp => (
              <div key={emp.id} className="p-2 rounded bg-white border border-border text-xs flex justify-between items-center">
                <span className="font-medium">{emp.name}</span>
                <span className="text-textMuted uppercase">{emp.employeeId}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BulkManageEmployees;
