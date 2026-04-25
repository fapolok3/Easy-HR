import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';
import { Card, Button } from '../components/UI';
import { IconFingerprint, IconArrowLeft, IconClock, IconSearch, IconDevice } from '../components/Icons';
import { fetchEmployees, saveMobilePunch, getMobilePunches, getCurrentSession } from '../services/api';

const MobilePunch = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [todayPunches, setTodayPunches] = useState<any[]>([]);
  const [punching, setPunching] = useState(false);
  const [punchProgress, setPunchProgress] = useState(0);
  const controls = useAnimation();
  const session = getCurrentSession();

  useEffect(() => {
    const loadData = async () => {
      const emps = await fetchEmployees();
      setEmployees(emps);
      
      const session = getCurrentSession();
      if (session?.isEmployee && session.employeeId) {
        setSelectedEmployeeId(session.employeeId);
      }
    };
    loadData();
    
    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Detecting address...' // In real app, use reverse geocoding
          });
          
          // Mock reverse geocoding
          setTimeout(() => {
            setLocation(prev => prev ? { ...prev, address: 'Pirerbag Rd, Dhaka 1216' } : null);
          }, 1500);
        },
        (error) => console.error('Geolocation error:', error)
      );
    }
  }, []);

  useEffect(() => {
    const loadPunches = async () => {
      if (selectedEmployeeId) {
        const allPunches = await getMobilePunches();
        // Get today's local date in YYYY-MM-DD format
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const punches = allPunches.filter(p => {
          if (p.employeeId !== selectedEmployeeId) return false;
          
          // Use local date conversion to match local today
          const pDate = new Date(p.timestamp);
          const pDateStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(pDate.getDate()).padStart(2, '0')}`;
          return pDateStr === todayStr;
        });

        // Sort by timestamp just in case
        punches.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setTodayPunches(punches);
      }
    };
    loadPunches();
  }, [selectedEmployeeId]);

  const handlePunch = async () => {
    if (!selectedEmployeeId || !location) {
      console.warn('handlePunch called but missing selection or location:', { selectedEmployeeId, location });
      return;
    }

    const emp = employees.find(e => e.id === selectedEmployeeId);
    // Modified logic: First punch of the day is "Punch In", everything else is "Punch Out"
    const type = todayPunches.length === 0 ? 'Punch In' : 'Punch Out';
    
    console.log('Attempting to save punch:', {
      employeeId: selectedEmployeeId,
      employeeName: emp?.name,
      companyId: emp?.companyId || session?.companyId,
      type,
      location: location.address
    });

    try {
      const newPunch = await saveMobilePunch({
        employeeId: selectedEmployeeId,
        employeeName: emp?.name || 'Unknown',
        companyId: emp?.companyId || session?.companyId,
        type: type as any,
        timestamp: new Date().toISOString(),
        latitude: location.lat,
        longitude: location.lng,
        address: location.address
      });

      if (newPunch) {
        setTodayPunches([...todayPunches, newPunch]);
        alert(`Success! ${type} recorded successfully.`);
      } else {
        console.error('saveMobilePunch returned null. Check company ID or Supabase connection.');
        alert('Failed to save record. Please ensure you are logged in correctly.');
      }
    } catch (err) {
      console.error('Exception in handlePunch:', err);
      alert('An unexpected error occurred while saving.');
    }
    setPunchProgress(0);
    setPunching(false);
  };

  const timerRef = useRef<any>(null);

  const startPunching = () => {
    if (!selectedEmployeeId) {
       alert('Please select an employee first');
       return;
    }
    if (!location) {
       alert('Location not detected. Please enable GPS and wait a moment.');
       return;
    }
    setPunching(true);
    let progress = 0;
    timerRef.current = setInterval(() => {
      progress += 2;
      setPunchProgress(progress);
      if (progress >= 100) {
        clearInterval(timerRef.current);
        handlePunch();
      }
    }, 30);
  };

  const stopPunching = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPunching(false);
    setPunchProgress(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
        <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 rounded-full">
          <IconArrowLeft className="w-5 h-5 text-textMuted" />
        </button>
        <h1 className="text-lg font-bold text-text">Mobile Punch</h1>
        <div className="w-9" /> {/* Spacer */}
      </header>

      <div className="p-4 md:p-8 max-w-md mx-auto w-full space-y-6">
        {/* Employee Selection */}
        {!session?.isEmployee && (
          <Card className="p-4">
            <label className="text-xs font-bold text-textMuted uppercase mb-2 block">Select Employee</label>
            <select 
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Choose employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
              ))}
            </select>
          </Card>
        )}

        {/* Status Card */}
        <Card className="p-6 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-border flex items-center justify-center">
              <IconDevice className="w-6 h-6 text-textMuted" />
            </div>
            <div>
              <h3 className="font-bold text-text">
                {selectedEmployeeId ? employees.find(e => e.id === selectedEmployeeId)?.name : 'No Employee Selected'}
              </h3>
              <p className="text-xs text-textMuted">{location?.address || 'Detecting location...'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 border-t border-border pt-4">
            <div className="text-center">
              <p className="text-[10px] text-textMuted uppercase font-bold mb-1">Punch In</p>
              <p className={`text-sm font-bold ${todayPunches.length > 0 ? 'text-emerald-500' : 'text-slate-300'}`}>
                {todayPunches.length > 0
                  ? new Date(todayPunches[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                  : 'No Data'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-textMuted uppercase font-bold mb-1">Punch Out</p>
              <p className={`text-sm font-bold ${todayPunches.length > 1 ? 'text-red-500' : 'text-slate-300'}`}>
                {todayPunches.length > 1
                  ? new Date(todayPunches[todayPunches.length - 1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                  : 'No Data'}
              </p>
            </div>
          </div>
        </Card>

        <Button variant="secondary" className="w-full bg-slate-800 text-white border-none py-4 font-bold uppercase tracking-widest h-auto">
          SEE PREVIOUS PUNCHES
        </Button>

        {/* Map View */}
        <Card className="overflow-hidden p-0 h-[300px] relative border-border">
          {!location ? (
            <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
               <div className="text-center z-10 px-4">
                  <IconSearch className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-bold text-text">Locating...</p>
               </div>
            </div>
          ) : (
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`}
            ></iframe>
          )}
          
          {/* Legend removed since we don't need key check anymore */}
        </Card>

        {/* Punch Button Section */}
        <div className="flex flex-col items-center gap-4 py-8">
           <p className="text-xs font-bold text-textMuted uppercase tracking-widest">PRESS AND HOLD</p>
           
           <div className="relative w-32 h-32 flex items-center justify-center">
             {/* Progress Circle */}
             <svg className="absolute inset-0 w-full h-full -rotate-90">
               <circle
                 cx="64"
                 cy="64"
                 r="60"
                 fill="transparent"
                 stroke="#e2e8f0"
                 strokeWidth="4"
               />
               <circle
                 cx="64"
                 cy="64"
                 r="60"
                 fill="transparent"
                 stroke="#1cbdb0"
                 strokeWidth="4"
                 strokeDasharray="377"
                 strokeDashoffset={377 - (377 * punchProgress) / 100}
                 strokeLinecap="round"
                 className="transition-all duration-75"
               />
             </svg>
             
             <motion.button
               onMouseDown={startPunching}
               onMouseUp={stopPunching}
               onMouseLeave={stopPunching}
               onTouchStart={startPunching}
               onTouchEnd={stopPunching}
               animate={punching ? { scale: 0.9, backgroundColor: 'rgba(28, 189, 176, 0.1)' } : { scale: 1, backgroundColor: '#fff' }}
               className="w-24 h-24 rounded-full border-4 border-slate-100 shadow-xl flex items-center justify-center text-primary z-10 select-none touch-none"
             >
               <IconFingerprint className="w-12 h-12" />
             </motion.button>

             {/* Animated Rings */}
             {punching && (
               <>
                 <motion.div 
                   initial={{ scale: 0.8, opacity: 0.5 }}
                   animate={{ scale: 1.5, opacity: 0 }}
                   transition={{ duration: 1, repeat: Infinity }}
                   className="absolute inset-0 rounded-full border-2 border-primary"
                 />
                 <motion.div 
                   initial={{ scale: 0.8, opacity: 0.5 }}
                   animate={{ scale: 1.5, opacity: 0 }}
                   transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                   className="absolute inset-0 rounded-full border-2 border-primary"
                 />
               </>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePunch;
