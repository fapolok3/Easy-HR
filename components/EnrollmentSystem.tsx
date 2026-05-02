import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fingerprint, 
  RefreshCcw, 
  Search,
  User,
  Hand,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Monitor,
  UserPlus
} from 'lucide-react';
import { 
  fetchDevices, 
  fetchEmployees, 
  startEnrollment, 
  stopEnrollment, 
  getEnrollmentStatus, 
  createPerson,
  updateDeviceAllocation
} from '../services/api';
import { Device, Employee, EnrollmentStatus } from '../types';
import { toast } from 'sonner';

const HANDS = [
  { id: 'left', name: 'Left Hand' },
  { id: 'right', name: 'Right Hand' }
] as const;

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;

export const EnrollmentSystem: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [status, setStatus] = useState<EnrollmentStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedHand, setSelectedHand] = useState<'left' | 'right'>('right');
  const [selectedFinger, setSelectedFinger] = useState<string>('index');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [devs, emps] = await Promise.all([fetchDevices(), fetchEmployees()]);
      setDevices(devs);
      setEmployees(emps);
      if (devs.length > 0 && !selectedDevice) {
        setSelectedDevice(devs[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [tipsoiPersonId, setTipsoiPersonId] = useState<string | null>(null);

  // Polling for status when enrolling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (enrolling && selectedDevice && (tipsoiPersonId || selectedEmployee)) {
      interval = setInterval(async () => {
        try {
          // Status API needs device_id (numeric) and person_id (numeric)
          // Using tipsoiPersonId if we just created it, or fallback to employee.id if it's numeric
          const pId = tipsoiPersonId || selectedEmployee?.id;
          if (!pId) return;

          const statusData = await getEnrollmentStatus(String(selectedDevice.id), pId);
          setStatus(statusData);
          if (!statusData.running) {
            setEnrolling(false);
            if (statusData.status) {
              toast.success('Fingerprint enrolled successfully!');
            }
          }
        } catch (error) {
          console.error('Status check failed', error);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [enrolling, selectedDevice, selectedEmployee, tipsoiPersonId]);

  const handleRegisterAndEnroll = async () => {
    if (!selectedDevice || !selectedEmployee) {
      toast.error('Please select both a device and an employee');
      return;
    }

    try {
      setLoading(true);
      
      let pId = null;
      try {
        const res = await createPerson({
          identifier: selectedEmployee.id,
          name: selectedEmployee.name,
          primary_display_text: selectedEmployee.name.substring(0, 10),
          secondary_display_text: 'Employee'
        });
        pId = String(res.id);
        setTipsoiPersonId(pId);
        toast.info('Personnel record synced');
      } catch (err: any) {
        console.log('Registration info:', err.message);
        // If they already exist, we ignore the error and proceed
      }

      // Step 2: Allocate user to the specific device if needed
      try {
        // Documentation Page 16: {{BASE URL}}/devices/{{device_identifier}}/allocations
        await updateDeviceAllocation(selectedDevice.identifier, selectedEmployee.id, 'allocate');
      } catch (err: any) {
        console.log('Allocation info:', err.message);
      }

      // Step 3: Start Enrollment (POST /devices/{device_identifier}/startEnrollment)
      // Documentation Page 14 specifically indicates device_identifier in the path
      const res = await startEnrollment(
        selectedDevice.identifier, 
        selectedEmployee.id, 
        selectedHand, 
        selectedFinger
      );
      
      setEnrolling(true);
      toast.success(res.message || 'Enrollment started. Please place finger on device.');
    } catch (error: any) {
      console.error('Enrollment error:', error);
      toast.error(`Error: ${error.message || 'Failed to start enrollment'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopEnrollment = async () => {
    if (!selectedDevice) return;
    try {
      setLoading(true);
      await stopEnrollment(selectedDevice.identifier);
      setEnrolling(false);
      toast.success('Enrollment stopped');
    } catch (error: any) {
      toast.error(error.message || 'Failed to stop enrollment');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Fingerprint className="text-indigo-600 h-8 w-8" />
            Fingerprint Enrollment
          </h1>
          <p className="text-slate-500 mt-1">Configure biometric sensors according to Tipsoi Central Server API</p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Step 1: Device Selection */}
        <section className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Monitor className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="font-bold text-slate-900">1. Select Device</h2>
            </div>
            <div className="space-y-2">
              {devices.map(device => (
                <button
                  key={device.id}
                  onClick={() => setSelectedDevice(device)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    selectedDevice?.id === device.id 
                      ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500/20' 
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-bold text-slate-900">{device.identifier}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">{device.location || 'Default Location'}</p>
                  </div>
                  <CheckCircle2 className={`h-5 w-5 ${selectedDevice?.id === device.id ? 'text-indigo-600' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Step 2: Employee Selection */}
        <section className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-amber-100 p-2 rounded-lg">
                <User className="h-5 w-5 text-amber-600" />
              </div>
              <h2 className="font-bold text-slate-900">2. Select Personnel</h2>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search employees..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[400px] flex-1 pr-1 custom-scrollbar">
              {filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selectedEmployee?.id === emp.id 
                      ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500/20' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{emp.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">ID: {emp.id}</p>
                  </div>
                  <CheckCircle2 className={`h-4 w-4 ${selectedEmployee?.id === emp.id ? 'text-amber-600' : 'text-slate-100'}`} />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Step 3: Biometric Configuration & Action */}
        <section className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Hand className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="font-bold text-slate-900">3. Biometric Settings</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Hand Selection</label>
                <div className="grid grid-cols-2 gap-2">
                  {HANDS.map(hand => (
                    <button
                      key={hand.id}
                      onClick={() => setSelectedHand(hand.id)}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${
                        selectedHand === hand.id 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {hand.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Finger Choice</label>
                <div className="grid grid-cols-3 gap-2">
                  {FINGERS.map(finger => (
                    <button
                      key={finger}
                      onClick={() => setSelectedFinger(finger)}
                      className={`py-2 px-2 rounded-lg border text-xs font-bold capitalize transition-all ${
                        selectedFinger === finger 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {finger}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={handleRegisterAndEnroll}
                  disabled={loading || enrolling || !selectedDevice || !selectedEmployee}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all disabled:opacity-40 shadow-xl shadow-slate-200 group"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Fingerprint className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  )}
                  {enrolling ? 'Enrolling Now...' : 'Start Enrollment'}
                </button>

                {enrolling && (
                  <button 
                    onClick={handleStopEnrollment}
                    className="w-full flex items-center justify-center gap-2 py-3 text-rose-600 font-bold hover:bg-rose-50 rounded-xl transition-all"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    Cancel Enrollment
                  </button>
                )}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {(enrolling || status?.running) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-indigo-600 text-white rounded-2xl p-6 shadow-2xl shadow-indigo-200 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Fingerprint className="h-24 w-24" />
                </div>
                
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full animate-pulse">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                    <h4 className="font-bold text-lg">Awaiting Scanner...</h4>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-black/20 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between text-xs font-bold text-indigo-200 uppercase tracking-widest">
                        <span>Personnel</span>
                        <span>{selectedEmployee?.id}</span>
                      </div>
                      <p className="font-bold text-sm truncate">{selectedEmployee?.name}</p>
                    </div>

                    <div className="flex items-start gap-3 bg-indigo-500 p-4 rounded-xl">
                      <AlertCircle className="h-5 w-5 text-indigo-200 flex-shrink-0" />
                      <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                        Please place the <strong>{selectedHand} {selectedFinger}</strong> on the device biometric sensor. 
                        Sensors timeout in 10 minutes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 h-1 bg-indigo-400 group-enrolling animate-progress-stripes" style={{ width: '100%' }} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};
