import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Badge, Modal, Toast } from '../components/UI';
import { 
  IconArrowLeft, IconDevice, IconCheckCircle, IconX, IconSearch, 
  IconUser, IconLock, IconUnlock, IconFingerprint, IconAlertCircle, IconPlus
} from '../components/Icons';
import { 
  fetchDevices, fetchEmployees, updateDeviceAllocation, 
  getFingerprints, deleteFingerprints, startEnrollment, 
  stopEnrollment, getEnrollmentStatus 
} from '../services/api';
import { Device, Employee, Fingerprint, EnrollmentStatus } from '../types';

const DeviceConfig = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'allocated' | 'unallocated'>('allocated');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fingerprint Management State
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);
  const [isFingerModalOpen, setIsFingerModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus | null>(null);
  const [enrollmentForm, setEnrollmentForm] = useState({ hand: 'right', finger: 'index' });
  const [isStartingEnrollment, setIsStartingEnrollment] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'danger', visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [devs, emps] = await Promise.all([fetchDevices(), fetchEmployees()]);
        const currentDev = devs.find(d => String(d.identifier) === id || String(d.id) === id);
        setDevice(currentDev || null);
        setEmployees(emps);
      } catch (err) {
        console.error('Error loading device config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  // Derived lists
  // Since we don't have a direct "allocated_users" API, we might use some logic or just show all for now.
  // Actually, item 11/12/13 suggests the device expects an allocation action.
  // For this demo, let's assume we maintain allocation status based on some field or just simulate it.
  // A better way is to check the device status for each user if available, but here we'll use a local filter.
  // In a real system, there would be a join table in Supabase.
  
  const allocatedEmployees = employees.filter(emp => emp.zkDeviceId === id);
  const unallocatedEmployees = employees.filter(emp => emp.zkDeviceId !== id);

  const filteredEmployees = (activeTab === 'allocated' ? allocatedEmployees : unallocatedEmployees)
    .filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleAllocation = async (employeeId: string, action: 'allocate' | 'revoke') => {
    if (!device) return;
    setProcessing(employeeId);
    try {
      await updateDeviceAllocation(String(device.identifier), employeeId, action);
      // Update local state (simulation since we don't have a join table yet, but let's assume it updates the user record)
      // In a real app, this would update Supabase employees.zk_device_id
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId ? { ...emp, zkDeviceId: action === 'allocate' ? id : undefined } : emp
      ));
      setToast({
        message: `Successfully ${action === 'allocate' ? 'allocated' : 'revoked'} ${employees.find(e => e.id === employeeId)?.name}`,
        type: 'success',
        visible: true
      });
    } catch (err) {
      setToast({
        message: `Failed to ${action} user.`,
        type: 'danger',
        visible: true
      });
    } finally {
      setProcessing(null);
    }
  };

  const openFingerprints = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsFingerModalOpen(true);
    setFingerprints([]);
    try {
      const data = await getFingerprints(emp.id);
      setFingerprints(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFinger = async (fingerId: number) => {
    if (!selectedEmployee) return;
    if (!confirm('Are you sure you want to delete this fingerprint?')) return;
    
    try {
      await deleteFingerprints(selectedEmployee.id, [{ finger_id: fingerId }]);
      setFingerprints(prev => prev.filter(f => f.id !== fingerId));
    } catch (err) {
      alert('Failed to delete fingerprint.');
    }
  };

  const handleStartEnrollment = async () => {
    if (!selectedEmployee || !device || isStartingEnrollment) return;
    setIsStartingEnrollment(true);
    setEnrollmentStatus(null);
    try {
      await startEnrollment(String(device.identifier), selectedEmployee.id, enrollmentForm.hand, enrollmentForm.finger);
      setIsEnrollmentModalOpen(true);
      checkEnrollmentStatus(0, true);
    } catch (err) {
      alert('Failed to start enrollment.');
    } finally {
      setIsStartingEnrollment(false);
    }
  };

  const checkEnrollmentStatus = async (retryCount = 0, initial = false) => {
    if (!selectedEmployee || !device) return;
    
    // Stop polling if modal is closed (except for the initial call)
    if (!initial && !isEnrollmentModalOpen) return;

    try {
      const status = await getEnrollmentStatus(String(device.id), selectedEmployee.id);
      setEnrollmentStatus(status);
      
      if (status.running) {
        // Poll every 3 seconds while running
        setTimeout(() => checkEnrollmentStatus(retryCount + 1), 3000);
      } else {
        // Not running anymore - check if successful
        if (status.status) {
          setToast({
            message: 'Enrollment completed successfully!',
            type: 'success',
            visible: true
          });
          // Automatically refresh fingerprints list
          const data = await getFingerprints(selectedEmployee.id);
          setFingerprints(data);
        } else if (retryCount > 0) {
          // Only show error if it was previously running or it's been a few retries
          setToast({
            message: 'Enrollment failed or timed out.',
            type: 'danger',
            visible: true
          });
        }
      }
    } catch (err) {
      console.error('Error checking enrollment status:', err);
      // Retry after delay on error
      if (retryCount < 20) { // Limit retries on actual API error
        setTimeout(() => checkEnrollmentStatus(retryCount + 1), 5000);
      }
    }
  };

  const handleStopEnrollment = async () => {
    if (!device) return;
    try {
      await stopEnrollment(String(device.identifier));
      setEnrollmentStatus(null);
      setIsEnrollmentModalOpen(false);
    } catch (err) {
      alert('Failed to stop enrollment.');
    }
  };

  if (loading) return <div className="p-8 text-center text-primary animate-pulse">Loading configuration...</div>;
  if (!device) return <div className="p-8 text-center text-danger">Device not found.</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 text-text">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.visible} 
        onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => navigate('/devices')} className="p-2">
            <IconArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IconDevice className="w-6 h-6 text-primary" />
              Configure: {device.identifier}
            </h1>
            <p className="text-sm text-textMuted">{device.location} • {device.type}</p>
          </div>
        </div>
        <Badge variant={device.status === 'active' || device.status === 'online' ? 'success' : 'danger'}>
          {device.status.toUpperCase()}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surfaceHighlight p-1 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('allocated')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'allocated' ? 'bg-surface text-primary shadow-sm' : 'text-textMuted hover:text-text'}`}
        >
          Allocated ({allocatedEmployees.length})
        </button>
        <button 
          onClick={() => setActiveTab('unallocated')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'unallocated' ? 'bg-surface text-primary shadow-sm' : 'text-textMuted hover:text-text'}`}
        >
          Unallocated ({unallocatedEmployees.length})
        </button>
      </div>

      {/* Main Content */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
           <div className="relative w-full max-w-sm">
              <IconSearch className="absolute left-3 top-2.5 w-4 h-4 text-textMuted" />
              <input 
                type="text" 
                placeholder="Search employees..." 
                className="w-full bg-surfaceHighlight border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surfaceHighlight text-xs uppercase font-medium text-text">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-textMuted italic">
                    No employees found in this category.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-surfaceHighlight/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center text-xs font-bold border border-border">
                            {emp.name.charAt(0)}
                         </div>
                         <div>
                            <p className="font-bold text-text">{emp.name}</p>
                            <p className="text-[10px] text-textMuted">ID: {emp.id}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-textMuted">{emp.department}</td>
                    <td className="px-6 py-4 text-textMuted">{emp.designation}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="gap-2"
                          onClick={() => openFingerprints(emp)}
                        >
                          <IconFingerprint className="w-4 h-4" /> Fingers
                        </Button>
                        {activeTab === 'allocated' ? (
                          <Button 
                            variant="danger" 
                            size="sm" 
                            className="gap-2"
                            isLoading={processing === emp.id}
                            onClick={() => handleAllocation(emp.id, 'revoke')}
                          >
                            <IconUnlock className="w-4 h-4" /> Revoke
                          </Button>
                        ) : (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="gap-2"
                            isLoading={processing === emp.id}
                            onClick={() => handleAllocation(emp.id, 'allocate')}
                          >
                            <IconLock className="w-4 h-4" /> Allocate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Fingerprints Modal */}
      <Modal 
        isOpen={isFingerModalOpen} 
        onClose={() => setIsFingerModalOpen(false)} 
        title={`Fingerprints: ${selectedEmployee?.name}`}
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-text uppercase tracking-wider">Saved Prints</h4>
            {fingerprints.length === 0 ? (
              <p className="text-sm text-textMuted italic bg-surfaceHighlight p-4 rounded-xl border border-border border-dashed text-center">
                No fingerprints found for this person.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {fingerprints.map(print => (
                  <div key={print.id} className="flex items-center justify-between p-3 bg-surfaceHighlight rounded-xl border border-border group">
                    <div className="flex items-center gap-3">
                      <IconFingerprint className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs font-bold text-text capitalize">{print.finger}</p>
                        <p className="text-[10px] text-textMuted capitalize">{print.hand} hand</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteFinger(print.id)}
                      className="p-1.5 text-danger opacity-0 group-hover:opacity-100 hover:bg-danger/10 rounded-lg transition-all"
                    >
                      <IconX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-border space-y-4">
             <h4 className="text-sm font-bold text-text uppercase tracking-wider">Start New Enrollment</h4>
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs text-textMuted font-bold uppercase mb-2 block">Hand</label>
                   <select 
                     value={enrollmentForm.hand}
                     onChange={(e) => setEnrollmentForm({...enrollmentForm, hand: e.target.value})}
                     className="w-full bg-surfaceHighlight border border-border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                   >
                     <option value="right">Right</option>
                     <option value="left">Left</option>
                   </select>
                </div>
                <div>
                   <label className="text-xs text-textMuted font-bold uppercase mb-2 block">Finger</label>
                   <select 
                     value={enrollmentForm.finger}
                     onChange={(e) => setEnrollmentForm({...enrollmentForm, finger: e.target.value})}
                     className="w-full bg-surfaceHighlight border border-border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                   >
                     <option value="thumb">Thumb</option>
                     <option value="index">Index</option>
                     <option value="middle">Middle</option>
                     <option value="ring">Ring</option>
                     <option value="pinky">Pinky</option>
                   </select>
                </div>
             </div>
             <Button 
               className="w-full gap-2" 
               onClick={handleStartEnrollment}
               isLoading={isStartingEnrollment}
               disabled={isStartingEnrollment}
             >
                <IconPlus className="w-4 h-4" /> Start Enrollment
             </Button>
          </div>
        </div>
      </Modal>

      {/* Enrollment Progress Modal */}
      <Modal 
        isOpen={isEnrollmentModalOpen} 
        onClose={() => {
          if (enrollmentStatus && !enrollmentStatus.running) {
            setIsEnrollmentModalOpen(false);
          }
        }} 
        title={enrollmentStatus?.running ? "Enrollment in Progress" : "Enrollment Result"}
      >
        <div className="text-center py-6 space-y-4">
          <div className="relative inline-block">
            {enrollmentStatus?.running ? (
              <>
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <IconFingerprint className="absolute inset-0 m-auto w-8 h-8 text-primary" />
              </>
            ) : enrollmentStatus?.status ? (
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                <IconCheckCircle className="w-10 h-10 text-success" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-danger/10 flex items-center justify-center">
                <IconX className="w-10 h-10 text-danger" />
              </div>
            )}
          </div>

          <div>
            <h3 className="font-bold text-lg text-text">
              {enrollmentStatus?.running 
                ? "Waiting for Fingerprint" 
                : enrollmentStatus?.status 
                  ? "Enrollment Success" 
                  : "Enrollment Failed"}
            </h3>
            <p className="text-sm text-textMuted px-8">
              {enrollmentStatus?.running 
                ? `Please place the ${enrollmentForm.hand} ${enrollmentForm.finger} on the device reader.`
                : enrollmentStatus?.status
                  ? `Successfully enrolled ${selectedEmployee?.name}'s ${enrollmentForm.hand} ${enrollmentForm.finger}.`
                  : "The device could not complete the enrollment. Please try again."}
            </p>
          </div>

          {enrollmentStatus?.running && enrollmentStatus.from && enrollmentStatus.to && (
            <div className="space-y-1 px-8">
              <div className="flex justify-between text-[10px] font-bold text-textMuted uppercase">
                <span>Progress</span>
                <span>{enrollmentStatus.from} / {enrollmentStatus.to}</span>
              </div>
              <div className="w-full bg-surfaceHighlight h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-500" 
                  style={{ width: `${(parseInt(enrollmentStatus.from) / parseInt(enrollmentStatus.to)) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {enrollmentStatus?.running && (
            <div className="bg-surfaceHighlight p-4 rounded-xl border border-border flex items-center gap-3 text-left">
              <IconAlertCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-xs text-textMuted">This process will timeout if not completed quickly. Please follow device instructions.</p>
            </div>
          )}

          {enrollmentStatus?.running ? (
            <Button variant="danger" className="w-full" onClick={handleStopEnrollment}>
              Cancel Enrollment
            </Button>
          ) : (
            <Button variant="primary" className="w-full" onClick={() => setIsEnrollmentModalOpen(false)}>
              Close
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default DeviceConfig;
