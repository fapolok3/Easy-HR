import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, Badge, Modal } from '../components/UI';
import { IconArrowLeft, IconTrash, IconCheckCircle, IconEdit, IconSave, IconCamera, IconUser } from '../components/Icons';
import { fetchEmployees, saveLocalEmployee, deleteLocalEmployee, getOrgSettings, getCurrentSession, uploadEmployeeAvatar, deleteEmployeeAvatar } from '../services/api';
import { OrgSettings, Employee } from '../types';

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    departments: [],
    designations: [],
    employmentTypes: [],
    workplaces: [],
    shifts: [],
    leavePolicies: []
  });

  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const employees = await fetchEmployees();
      const found = employees.find(e => e.id === id);
      if (found) {
        setEmployee(found);
        setFormData(found);
      }
      const settings = await getOrgSettings();
      setOrgSettings(settings);
      setLoading(false);
    };
    loadData();
  }, [id]);

  const handleSave = () => {
    if (employee && formData) {
      const updatedEmployee = { ...employee, ...formData } as Employee;
      saveLocalEmployee(updatedEmployee);
      setEmployee(updatedEmployee);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (id) {
      deleteLocalEmployee(id);
      navigate('/employees');
    }
  };

  const updateStatus = (status: Employee['status']) => {
    if (employee) {
      const updated = { ...employee, status };
      saveLocalEmployee(updated);
      setEmployee(updated);
      setFormData(prev => ({ ...prev, status }));
    }
  };

  const toggleAdmin = () => {
    if (employee) {
      const updated = { ...employee, isAdmin: !employee.isAdmin };
      saveLocalEmployee(updated);
      setEmployee(updated);
    }
  };

  const toggleLineManager = () => {
    if (employee) {
      const updated = { ...employee, isLineManager: !employee.isLineManager };
      saveLocalEmployee(updated);
      setEmployee(updated);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && employee) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        return;
      }

      setIsUploading(true);
      try {
        const publicUrl = await uploadEmployeeAvatar(file, employee.id);
        if (publicUrl) {
          // If already had an avatar, we might want to delete the old one, but keeping it simple for now
          const updatedEmployee = { ...employee, avatarUrl: publicUrl };
          await saveLocalEmployee(updatedEmployee);
          setEmployee(updatedEmployee);
          setFormData(prev => ({ ...prev, avatarUrl: publicUrl }));
        }
      } catch (err: any) {
        alert(err.message || 'Failed to upload image');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removeAvatar = async () => {
    if (employee && employee.avatarUrl) {
      if (window.confirm('Are you sure you want to remove the profile picture?')) {
        setIsUploading(true);
        try {
          await deleteEmployeeAvatar(employee.avatarUrl);
          const updatedEmployee = { ...employee, avatarUrl: '' };
          await saveLocalEmployee(updatedEmployee);
          setEmployee(updatedEmployee);
          setFormData(prev => ({ ...prev, avatarUrl: '' }));
        } catch (err) {
          console.error(err);
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-textMuted animate-pulse">Loading profile...</div>;
  if (!employee) return <div className="p-8 text-center text-textMuted">Employee not found.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/employees')}
            className="p-2 hover:bg-surfaceHighlight rounded-lg text-textMuted hover:text-text transition-colors"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-text">{employee.name}</h1>
            <p className="text-textMuted">Employee Profile & Administration</p>
          </div>
        </div>
        <div className="flex gap-3">
          {isEditing ? (
            <Button onClick={handleSave} className="gap-2">
              <IconSave className="w-4 h-4" /> Save Changes
            </Button>
          ) : (
            !getCurrentSession()?.isEmployee && (
              <Button onClick={() => setIsEditing(true)} variant="secondary" className="gap-2">
                <IconEdit className="w-4 h-4" /> Edit Information
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8">
            <div className="flex items-center gap-6 mb-8 pb-8 border-b border-border">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold overflow-hidden border border-border">
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  ) : employee.avatarUrl ? (
                    <img src={employee.avatarUrl} alt={employee.name} className="w-full h-full object-cover" />
                  ) : (
                    employee.name.split(' ').map(n => n[0]).join('')
                  )}
                </div>
                {!getCurrentSession()?.isEmployee && (
                  <>
                    <label className="absolute -bottom-2 -right-2 p-2 bg-[#1cbdb0] hover:bg-[#16a398] text-white rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110 z-10">
                      <IconCamera className="w-4 h-4" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={isUploading} />
                    </label>
                    {employee.avatarUrl && (
                      <button 
                        onClick={removeAvatar}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors z-10"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
              <div>
                 <h2 className="text-xl font-bold text-text">{employee.name}</h2>
                 <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant={employee.status === 'Active' ? 'success' : 'danger'}>{employee.status}</Badge>
                    {employee.isAdmin && <Badge variant="warning">Admin</Badge>}
                    {employee.isLineManager && <Badge variant="default">Line Manager</Badge>}
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ... existing inputs ... */}
              <Input 
                label="Full Name" 
                value={formData.name} 
                disabled={!isEditing}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
              <Input 
                label="Employee ID" 
                value={formData.id} 
                disabled // ID usually immutable
              />
              <Input 
                label="ZKTeco Device ID" 
                value={formData.zkDeviceId || ''} 
                disabled={!isEditing}
                onChange={e => setFormData({ ...formData, zkDeviceId: e.target.value })}
              />
              <Input 
                label="Email Address" 
                type="email"
                value={formData.email} 
                disabled={!isEditing}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
              <Select 
                label="Department" 
                value={formData.department || ''} 
                disabled={!isEditing}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
                options={[
                  { label: 'Not Set', value: '' },
                  ...orgSettings.departments.map(d => ({ label: d, value: d }))
                ]}
              />
              <Select 
                label="Designation" 
                value={formData.designation || ''} 
                disabled={!isEditing}
                onChange={e => setFormData({ ...formData, designation: e.target.value })}
                options={[
                  { label: 'Not Set', value: '' },
                  ...orgSettings.designations.map(d => ({ label: d, value: d }))
                ]}
              />
              <div className="space-y-4">
                <Select 
                  label="Shift"
                  disabled={!isEditing}
                  value={formData.shift || ''}
                  onChange={e => setFormData({ ...formData, shift: e.target.value })}
                  options={[
                    { label: 'Not Set', value: '' },
                    ...orgSettings.shifts.map(s => ({ label: s.name, value: s.id }))
                  ]}
                />
                {(formData.shift || isEditing) && (
                  <Input 
                    label="Shift Effective Date" 
                    type="date"
                    value={formData.shiftEffectiveDate || ''} 
                    disabled={!isEditing}
                    onChange={e => setFormData({ ...formData, shiftEffectiveDate: e.target.value })}
                  />
                )}
              </div>
              <Select 
                label="Employment Type"
                disabled={!isEditing}
                value={formData.employmentType || ''}
                onChange={e => setFormData({ ...formData, employmentType: e.target.value })}
                options={[
                  { label: 'Not Set', value: '' },
                  ...orgSettings.employmentTypes.map(t => ({ label: t, value: t }))
                ]}
              />
              <Select 
                label="Gender"
                disabled={!isEditing}
                value={formData.gender || ''}
                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                options={[
                  { label: 'Male', value: 'Male' },
                  { label: 'Female', value: 'Female' },
                  { label: 'Other', value: 'Other' }
                ]}
              />
              <Select 
                label="Leave Policy" 
                disabled={!isEditing}
                value={formData.leavePolicy || ''}
                onChange={e => setFormData({ ...formData, leavePolicy: e.target.value })}
                options={[
                  { label: 'Not Set', value: '' },
                  ...orgSettings.leavePolicies.map(p => ({ label: p.name, value: p.name }))
                ]}
              />
              <Input 
                label="Joining Date" 
                type="date"
                value={formData.joinDate} 
                disabled={!isEditing}
                onChange={e => setFormData({ ...formData, joinDate: e.target.value })}
              />
              <Input 
                label="End Date" 
                type="date"
                value={formData.endDate || ''} 
                disabled={!isEditing}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              />
              <Select 
                label="Workplace" 
                value={formData.workplace || ''} 
                disabled={!isEditing}
                onChange={e => setFormData({ ...formData, workplace: e.target.value })}
                options={[
                  { label: 'Not Set', value: '' },
                  ...orgSettings.workplaces.map(w => ({ label: w, value: w }))
                ]}
              />
              <Input 
                label="Line Manager" 
                value={formData.lineManager || ''} 
                disabled={!isEditing}
                onChange={e => setFormData({ ...formData, lineManager: e.target.value })}
              />
              <Input 
                label="Login Password" 
                type="text"
                placeholder="Set password for employee login"
                value={formData.password || ''} 
                disabled={!isEditing}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </Card>

          {/* Leave Balance Section */}
          <Card className="p-8">
            <div className="flex items-center justify-between mb-6 outline-none">
              <div>
                <h3 className="text-xl font-bold text-text uppercase tracking-tight">Leave Balance</h3>
                <p className="text-xs text-textMuted uppercase font-semibold">Current entitlements based on assigned policy</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">
                  Policy: {employee.leavePolicy || 'Not Assigned'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {employee.leavePolicy ? (
                orgSettings.leavePolicies.find(p => p.name === employee.leavePolicy)?.categories?.map(cat => (
                  <div key={cat.id} className="bg-surfaceHighlight/30 p-4 rounded-xl border border-border flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-textMuted uppercase font-bold mb-1">{cat.name}</span>
                    <span className="text-2xl font-black text-[#1cbdb0]">{cat.maxLeaves}</span>
                    <span className="text-[10px] text-textMuted uppercase font-semibold">Total Days</span>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-8 text-center text-textMuted italic flex flex-col items-center gap-2">
                   <div className="w-12 h-12 rounded-full bg-surfaceHighlight flex items-center justify-center">
                     -
                   </div>
                   <p className="text-sm">No leave policy assigned to this employee.</p>
                </div>
              )}
              {employee.leavePolicy && (orgSettings.leavePolicies.find(p => p.name === employee.leavePolicy)?.categories?.length || 0) === 0 && (
                <div className="col-span-full py-8 text-center text-textMuted italic">
                  The assigned policy has no leave categories defined.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar Actions */}
        {!getCurrentSession()?.isEmployee && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-text mb-6">Actions</h3>
              <div className="space-y-3">
                <Button 
                  variant="secondary" 
                  className="w-full justify-start gap-3"
                  onClick={toggleAdmin}
                >
                  <Badge variant={employee.isAdmin ? 'warning' : 'default'} className="!p-1.5"><IconCheckCircle className="w-4 h-4" /></Badge>
                  {employee.isAdmin ? 'Revoke Admin' : 'Set as Admin'}
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full justify-start gap-3"
                  onClick={toggleLineManager}
                >
                  <Badge variant={employee.isLineManager ? 'success' : 'default'} className="!p-1.5"><IconCheckCircle className="w-4 h-4" /></Badge>
                  {employee.isLineManager ? 'Revoke Manager' : 'Set as Line Manager'}
                </Button>
                <div className="pt-4 border-t border-border mt-4 space-y-3">
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start hover:bg-amber-500/10 hover:text-amber-500 ${employee.status === 'Inactive' ? 'text-amber-500 bg-amber-500/10' : ''}`}
                    onClick={() => updateStatus('Inactive')}
                  >
                    Mark as Inactive
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start hover:bg-orange-500/10 hover:text-orange-500 ${employee.status === 'Resigned' ? 'text-orange-500 bg-orange-500/10' : ''}`}
                    onClick={() => updateStatus('Resigned')}
                  >
                    Resign Employee
                  </Button>
                  <Button 
                    variant="ghost" 
                    className={`w-full justify-start hover:bg-red-500/10 hover:text-red-500 ${employee.status === 'Terminated' ? 'text-red-500 bg-red-500/10' : ''}`}
                    onClick={() => updateStatus('Terminated')}
                  >
                    Terminate
                  </Button>
                  {employee.status !== 'Active' && (
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-emerald-500 hover:bg-emerald-500/10"
                      onClick={() => updateStatus('Active')}
                    >
                      Activate Employee
                    </Button>
                  )}
                </div>
                <div className="pt-4 border-t border-border mt-4">
                  <Button 
                    variant="danger" 
                    className="w-full gap-2"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <IconTrash className="w-4 h-4" /> Delete Employee
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-surfaceHighlight/30 border-dashed">
              <h4 className="text-sm font-medium text-textMuted mb-2">Notice</h4>
              <p className="text-xs text-textMuted leading-relaxed">
                Changing an employee status might affect their attendance records and payroll eligibility for the current period.
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)} 
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-textMuted">
            Are you sure you want to permanently delete <span className="text-text font-bold">{employee.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Confirm Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeeProfile;
