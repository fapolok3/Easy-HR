import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select } from '../components/UI';
import { IconCheckCircle, IconX, IconUsers, IconSettings, IconCamera, IconUser, IconTrash } from '../components/Icons';
import { saveLocalEmployee, getOrgSettings, checkGlobalEmailExists, uploadEmployeeAvatar } from '../services/api';
import { OrgSettings } from '../types';
import { Employee } from '../types';

const CreateEmployee = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    departments: [],
    designations: [],
    employmentTypes: [],
    workplaces: [],
    shifts: [],
    leavePolicies: []
  });

  const [formData, setFormData] = useState({
    name: '',
    officeId: '',
    deviceId: '',
    email: '',
    password: '',
    gender: 'Male',
    department: '',
    designation: '',
    shift: '',
    shiftEffectiveDate: new Date().toISOString().split('T')[0],
    leavePolicy: '',
    workplace: '',
    joinDate: new Date().toISOString().split('T')[0]
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getOrgSettings();
      setOrgSettings(settings);
    };
    loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check unique email
    const emailExists = await checkGlobalEmailExists(formData.email);
    if (emailExists) {
       setError('An employee with this email/phone already exists in the system.');
       setLoading(false);
       return;
    }

    const employeeId = formData.officeId || Math.random().toString(36).substr(2, 6).toUpperCase();
    let avatarUrl = '';

    if (avatarFile) {
      try {
        const uploadedUrl = await uploadEmployeeAvatar(avatarFile, employeeId);
        if (uploadedUrl) avatarUrl = uploadedUrl;
      } catch (uploadErr: any) {
        setError(uploadErr.message || 'Failed to upload image');
        setLoading(false);
        return;
      }
    }

    const newEmployee: Employee = {
      id: employeeId,
      name: formData.name,
      designation: formData.designation || 'Not Set',
      department: formData.department || 'Not Set',
      status: 'Active',
      joinDate: formData.joinDate,
      email: formData.email,
      phone: '-',
      gender: formData.gender,
      zkDeviceId: formData.deviceId,
      shift: formData.shift,
      shiftEffectiveDate: formData.shiftEffectiveDate,
      leavePolicy: formData.leavePolicy,
      avatarUrl: avatarUrl,
      workplace: formData.workplace,
      password: formData.password
    };

    await saveLocalEmployee(newEmployee);
    
    setLoading(false);
    setShowNotification(true);
    
    setTimeout(() => {
      setShowNotification(false);
      navigate('/employees');
    }, 2000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/employees')}
            className="p-2 hover:bg-surfaceHighlight rounded-full text-textMuted hover:text-text transition-colors"
          >
            <IconX className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-text">Create Employee</h1>
            <p className="text-textMuted">Fill in the details to add a new employee to the system.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {error && (
            <div className="md:col-span-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-lg text-center uppercase">
                {error}
            </div>
        )}
        <Card className="p-6 md:col-span-1 space-y-6">
          <h2 className="text-lg font-bold text-[#1cbdb0] uppercase flex items-center gap-2">
            <IconUsers className="w-5 h-5" /> Basic Information
          </h2>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-surfaceHighlight border-2 border-border flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <IconUser className="w-16 h-16 text-textMuted" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-[#1cbdb0] hover:bg-[#16a398] text-white rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110">
                <IconCamera className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </label>
              {avatarPreview && (
                <button 
                  type="button"
                  onClick={removeAvatar}
                  className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-textMuted uppercase font-bold tracking-widest">Employee Photo</p>
          </div>
          
          <Input 
            label="Full Name" 
            placeholder="e.g. John Doe" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required 
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Office ID" 
              placeholder="e.g. EMP101" 
              value={formData.officeId}
              onChange={e => setFormData({...formData, officeId: e.target.value})}
              required 
            />
            <Input 
              label="Device ID" 
              placeholder="e.g. 51001" 
              value={formData.deviceId}
              onChange={e => setFormData({...formData, deviceId: e.target.value})}
            />
          </div>

          <Input 
            label="Email Address" 
            type="email" 
            placeholder="john@example.com" 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            required 
          />

          <Input 
            label="Password" 
            type="password" 
            placeholder="••••••••" 
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            required 
          />
          
          <Input 
            label="Join Date" 
            type="date" 
            value={formData.joinDate}
            onChange={e => setFormData({...formData, joinDate: e.target.value})}
            required 
          />

          <Select 
            label="Gender" 
            value={formData.gender}
            onChange={e => setFormData({...formData, gender: e.target.value})}
            options={[
              { label: 'Male', value: 'Male' },
              { label: 'Female', value: 'Female' },
              { label: 'Other', value: 'Other' }
            ]}
          />
        </Card>

        <Card className="p-6 md:col-span-1 space-y-6">
          <h2 className="text-lg font-bold text-[#1cbdb0] uppercase flex items-center gap-2">
            <IconSettings className="w-5 h-5" /> Organizational Details
          </h2>

          <Select 
            label="Department"
            value={formData.department}
            onChange={e => setFormData({...formData, department: e.target.value})}
            options={[
              { label: 'Please Select', value: '' },
              ...orgSettings.departments.map(d => ({ label: d, value: d }))
            ]}
          />
          
          <Select 
            label="Designation"
            value={formData.designation}
            onChange={e => setFormData({...formData, designation: e.target.value})}
            options={[
              { label: 'Please Select', value: '' },
              ...orgSettings.designations.map(d => ({ label: d, value: d }))
            ]}
          />
          
          <Select 
            label="Shift"
            value={formData.shift}
            onChange={e => setFormData({...formData, shift: e.target.value})}
            options={[
              { label: 'Please Select', value: '' },
              ...orgSettings.shifts.map(s => ({ label: s.name, value: s.id }))
            ]}
          />

          {formData.shift && (
            <Input 
              label="Shift Effective Date" 
              type="date" 
              value={formData.shiftEffectiveDate}
              onChange={e => setFormData({...formData, shiftEffectiveDate: e.target.value})}
              required 
            />
          )}
          
          <Select 
            label="Leave Policy"
            value={formData.leavePolicy}
            onChange={e => setFormData({...formData, leavePolicy: e.target.value})}
            options={[
              { label: 'Please Select', value: '' },
              ...orgSettings.leavePolicies.map(p => ({ label: p.name, value: p.name }))
            ]}
          />

          <Select 
            label="Workplace / Office"
            value={formData.workplace}
            onChange={e => setFormData({...formData, workplace: e.target.value})}
            options={[
              { label: 'Please Select', value: '' },
              ...orgSettings.workplaces.map(w => ({ label: w, value: w }))
            ]}
            required
          />

          <div className="pt-6">
             <Button type="submit" className="w-full" disabled={loading}>
               {loading ? 'Creating...' : 'Create Employee Record'}
             </Button>
          </div>
        </Card>
      </form>

      {showNotification && (
        <div className="fixed top-20 right-8 bg-surface border border-emerald-500/50 p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 z-50">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <IconCheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">Employee Created</p>
            <p className="text-xs text-textMuted">Redirecting to employee list...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateEmployee;
