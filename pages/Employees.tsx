import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Card, Button, Input, Badge, Select, Modal } from '../components/UI';
import { IconSearch, IconUsers, IconCheckCircle, IconX, IconFilter, IconChevronDown, IconChevronUp, IconDownload, IconUpload } from '../components/Icons';
import { fetchEmployees, getOrgSettings, bulkUpdateEmployees, saveBulkEmployees } from '../services/api';
import { Employee, OrgSettings } from '../types';

const Employees = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredEmployees.map(emp => emp.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const downloadSample = () => {
    const headers = [['ID', 'Name', 'Email', 'Password', 'Department', 'Designation', 'Gender', 'Employment Type', 'Workplace', 'Status', 'Join Date']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee_bulk_upload_sample.xlsx");
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const formattedEmployees: Partial<Employee>[] = data.map(item => ({
          id: String(item.ID || item.id || `EMP${Math.floor(Math.random() * 10000)}`),
          name: item.Name || item.name,
          email: item.Email || item.email,
          password: item.Password || item.password || '123456',
          department: item.Department || item.department,
          designation: item.Designation || item.designation,
          gender: item.Gender || item.gender,
          employmentType: item['Employment Type'] || item.employmentType,
          workplace: item.Workplace || item.workplace,
          status: item.Status || item.status || 'Active',
          joinDate: item['Join Date'] || item.joinDate || new Date().toISOString().split('T')[0]
        }));

        await saveBulkEmployees(formattedEmployees);
        await loadEmployees();
        alert(`Successfully imported ${formattedEmployees.length} employees.`);
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('Failed to parse the excel file. Please ensure it follows the sample format.');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleBulkUpload} 
        className="hidden" 
        accept=".xlsx, .xls, .csv" 
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight">Employees</h1>
           <p className="text-textMuted text-sm">View and manage all employee records in one place.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <div className="flex items-center gap-1.5 bg-surfaceHighlight/50 px-2 py-1 rounded-lg border border-border">
             <span className="text-[10px] text-textMuted uppercase font-bold tracking-wider">Rows:</span>
             <select 
               value={rowsPerPage} 
               onChange={(e) => {
                 setRowsPerPage(Number(e.target.value));
                 setCurrentPage(1);
               }}
               className="bg-transparent text-xs font-bold text-text outline-none cursor-pointer pr-1"
             >
               {[50, 100, 500, 1000].map(size => (
                 <option key={size} value={size}>{size}</option>
               ))}
             </select>
           </div>
           
           <Button size="sm" variant="secondary" onClick={downloadSample} className="gap-1 px-3">
             <IconDownload className="w-3.5 h-3.5" /> <span>Sample</span>
           </Button>
           
           <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} isLoading={isUploading} className="gap-1 px-3">
             <IconUpload className="w-3.5 h-3.5" /> <span>Upload</span>
           </Button>

           <button 
             onClick={() => setIsFilterVisible(!isFilterVisible)}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border uppercase tracking-wider ${
               isFilterVisible ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-text hover:bg-surfaceHighlight'
             }`}
           >
             <IconFilter className="w-3.5 h-3.5" />
             <span>Filter</span>
             {isFilterVisible ? <IconChevronUp className="w-3.5 h-3.5" /> : <IconChevronDown className="w-3.5 h-3.5" />}
           </button>

           <Button size="sm" onClick={() => navigate('/employees/create')} className="px-3">
             + Create
           </Button>
           
           {selectedIds.length > 0 && (
             <Button size="sm" variant="primary" onClick={() => navigate('/employees/bulk', { state: { ids: selectedIds } })} className="animate-in fade-in slide-in-from-right-4 px-3">
               Manage ({selectedIds.length})
             </Button>
           )}
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
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    checked={selectedIds.length === filteredEmployees.length && filteredEmployees.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
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
                    <td colSpan={7} className="px-6 py-8 text-center">
                       <div className="animate-pulse flex justify-center text-primary">Loading data...</div>
                    </td>
                 </tr>
              ) : filteredEmployees.length === 0 ? (
                 <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-textMuted">
                      No employees found matching your criteria.
                    </td>
                 </tr>
              ) : (
                filteredEmployees
                  .slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
                  .map((emp) => (
                  <tr key={emp.id} className={`hover:bg-surfaceHighlight/50 transition-colors ${selectedIds.includes(emp.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        checked={selectedIds.includes(emp.id)}
                        onChange={() => handleSelectOne(emp.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs overflow-hidden">
                           {emp.avatarUrl ? (
                             <img src={emp.avatarUrl} alt={emp.name} className="w-full h-full object-cover" />
                           ) : (
                             emp.name.split(' ').map(n => n[0]).join('')
                           )}
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

        {/* Pagination Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-textMuted uppercase font-bold">
              {Math.min((currentPage - 1) * rowsPerPage + 1, filteredEmployees.length)} - {Math.min(currentPage * rowsPerPage, filteredEmployees.length)} OF {filteredEmployees.length}
            </span>
            <div className="flex items-center gap-1">
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1 min-w-[32px]"
              >
                &lt;
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={currentPage * rowsPerPage >= filteredEmployees.length}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1 min-w-[32px]"
              >
                &gt;
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Employees;