import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Badge, Select } from '../components/UI';
import { IconSearch, IconUsers, IconCheckCircle, IconX, IconFilter, IconChevronDown, IconChevronUp } from '../components/Icons';
import { fetchEmployees, getOrgSettings, OrgSettings } from '../services/api';
import { Employee } from '../types';

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    departments: [],
    designations: [],
    employmentTypes: [],
    workplaces: [],
    shifts: [],
    leavePolicies: []
  });

  // Filter State
  const [filters, setFilters] = useState({
    department: '',
    designation: '',
    shiftGroup: '',
    employmentType: '',
    gender: '',
    workplace: '',
    status: 'Active',
    lineManager: ''
  });

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await fetchEmployees();
      setEmployees(data);
      const settings = await getOrgSettings();
      setOrgSettings(settings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const matchesGlobalSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === '' || emp.status === filters.status;
    const matchesDept = filters.department === '' || emp.department === filters.department;
    const matchesGender = filters.gender === '' || emp.gender === filters.gender;
    const matchesDesignation = filters.designation === '' || emp.designation === filters.designation;
    
    return matchesGlobalSearch && matchesStatus && matchesDept && matchesGender && matchesDesignation;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-text">Manage Employees</h1>
           <p className="text-textMuted">View and manage all employee records in one place.</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsFilterVisible(!isFilterVisible)}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border ${
               isFilterVisible ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-text hover:bg-surfaceHighlight'
             }`}
           >
             <IconFilter className="w-4 h-4" />
             <span>FILTER</span>
             {isFilterVisible ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
           </button>
           <Button onClick={() => navigate('/employees/create')}>+ Create Employee</Button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {isFilterVisible && (
        <Card className="p-6 bg-surface border-border animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Select 
              label="DEPARTMENTS"
              value={filters.department}
              onChange={e => setFilters({...filters, department: e.target.value})}
              options={[
                { label: 'Please Select', value: '' },
                ...orgSettings.departments.map(d => ({ label: d, value: d }))
              ]}
            />
            <Select 
              label="DESIGNATIONS"
              value={filters.designation}
              onChange={e => setFilters({...filters, designation: e.target.value})}
              options={[
                { label: 'Please Select', value: '' },
                ...orgSettings.designations.map(d => ({ label: d, value: d }))
              ]}
            />
             <Select 
              label="SHIFT GROUPS"
              value={filters.shiftGroup}
              onChange={e => setFilters({...filters, shiftGroup: e.target.value})}
              options={[
                { label: 'Please Select', value: '' },
                ...orgSettings.shifts.map(s => ({ label: s.name, value: s.name }))
              ]}
            />
            <Select 
              label="EMPLOYMENT TYPE"
              value={filters.employmentType}
              onChange={e => setFilters({...filters, employmentType: e.target.value})}
              options={[
                { label: 'Please Select', value: '' },
                ...orgSettings.employmentTypes.map(t => ({ label: t, value: t }))
              ]}
            />
            <Select 
              label="GENDER"
              value={filters.gender}
              onChange={e => setFilters({...filters, gender: e.target.value})}
              options={[
                { label: 'Please Select', value: '' },
                { label: 'Male', value: 'Male' },
                { label: 'Female', value: 'Female' }
              ]}
            />
            <Select 
              label="WORKPLACE"
              value={filters.workplace}
              onChange={e => setFilters({...filters, workplace: e.target.value})}
              options={[
                { label: 'Please Select', value: '' },
                ...orgSettings.workplaces.map(w => ({ label: w, value: w }))
              ]}
            />
            <Select 
              label="STATUS"
              value={filters.status}
              onChange={e => setFilters({...filters, status: e.target.value})}
              options={[
                { label: 'Please Select', value: '' },
                { label: 'Active', value: 'Active' },
                { label: 'Inactive', value: 'Inactive' },
                { label: 'Resigned', value: 'Resigned' },
                { label: 'Terminated', value: 'Terminated' }
              ]}
            />
            <Input 
              label="SEARCH BY NAME/ID/RFID"
              placeholder="Employee name/ID/RFID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
             <Select 
              label="LINE MANAGER"
              className="lg:col-span-1"
              value={filters.lineManager}
              onChange={e => setFilters({...filters, lineManager: e.target.value})}
              options={[{ label: 'Please Select', value: '' }]}
            />
          </div>
          <div className="mt-8 flex justify-end">
            <Button className="w-full md:w-auto px-12 gap-2">
              <IconSearch className="w-4 h-4" /> Search
            </Button>
          </div>
        </Card>
      )}

      {/* Table Card */}
      <Card className="overflow-hidden">
        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-textMuted">
            <thead className="bg-surfaceHighlight text-xs uppercase font-medium text-text">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                       <div className="animate-pulse flex justify-center text-primary">Loading data...</div>
                    </td>
                 </tr>
              ) : filteredEmployees.length === 0 ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-textMuted">
                      No employees found matching your criteria.
                    </td>
                 </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-surfaceHighlight/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                           {emp.name.split(' ').map(n => n[0]).join('')}
                         </div>
                         <div>
                            <Link to={`/employees/${emp.id}`} className="font-medium text-text hover:text-primary transition-colors hover:underline">
                              {emp.name}
                            </Link>
                            <p className="text-xs">{emp.email}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{emp.id}</td>
                    <td className="px-6 py-4">{emp.designation}</td>
                    <td className="px-6 py-4">{emp.department}</td>
                    <td className="px-6 py-4">
                      <Badge variant={emp.status === 'Active' ? 'success' : emp.status === 'Inactive' ? 'default' : emp.status === 'Resigned' ? 'warning' : 'danger'}>
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/employees/${emp.id}`} className="text-primary hover:text-primaryHover font-medium text-xs">View Profile</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Employees;