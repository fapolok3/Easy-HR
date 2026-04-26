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
  const [currentTime, setCurrentTime] = useState(new Date());
  const controls = useAnimation();
  const session = getCurrentSession();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setLocation({
            lat,
            lng,
            address: 'Detecting address...' 
          });
          
          try {
            // Using OSM Nominatim - Free reverse geocoding
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
              headers: { 'Accept-Language': 'en' }
            });
            const data = await response.json();
            const address = data.display_name || `${lat}, ${lng}`;
            setLocation(prev => prev ? { ...prev, address } : null);
          } catch (err) {
            console.error('Reverse geocoding error:', err);
            setLocation(prev => prev ? { ...prev, address: `${lat}, ${lng}` } : null);
          }
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
    
    const companyId = emp?.companyId || session?.companyId;
    
    if (!companyId) {
      console.error('Punch failed: No companyId associated with this employee or session.', { emp, session });
      alert('Error: This employee record is not associated with any company. Please update the employee profile first.');
      setPunching(false);
      setPunchProgress(0);
      return;
    }

    console.log('Attempting to save punch:', {
      employeeId: selectedEmployeeId,
      employeeName: emp?.name,
      companyId: companyId,
      type,
      location: location.address
    });

    try {
      const newPunch = await saveMobilePunch({
        employeeId: selectedEmployeeId,
        employeeName: emp?.name || 'Unknown',
        companyId: companyId,
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

      <div className="p-3 md:p-6 max-w-[300px] mx-auto w-full space-y-4">
        {/* Employee Selection */}
        {!session?.isEmployee && (
          <Card className="p-3">
            <label className="text-[9px] font-black text-textMuted uppercase mb-1.5 block tracking-widest">Select Employee</label>
            <select 
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Choose employee...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </Card>
        )}

        {/* Real-time Clock */}
        <div className="text-center py-1">
          <p className="text-2xl font-black text-slate-800 tabular-nums tracking-tight">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </p>
          <p className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 inline-block px-2 py-0.5 rounded-full">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* Status Card */}
        <Card className="p-3 border-slate-200 shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <IconDevice className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-800 text-[11px] uppercase truncate">
                {selectedEmployeeId ? employees.find(e => e.id === selectedEmployeeId)?.name : 'Employee'}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <p className="text-[9px] font-bold text-textMuted truncate">{location?.address || 'Locating...'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
            <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
              <p className="text-[8px] text-textMuted uppercase font-black tracking-widest mb-0.5 opacity-60">Punch In</p>
              <p className={`text-xs font-black tracking-tight ${todayPunches.length > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                {todayPunches.length > 0
                  ? new Date(todayPunches[0].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})
                  : '--:--'}
              </p>
            </div>
            <div className="bg-slate-50/80 p-2 rounded-lg border border-slate-100">
              <p className="text-[8px] text-textMuted uppercase font-black tracking-widest mb-0.5 opacity-60">Punch Out</p>
              <p className={`text-xs font-black tracking-tight ${todayPunches.length > 1 ? 'text-red-500' : 'text-slate-300'}`}>
                {todayPunches.length > 1
                  ? new Date(todayPunches[todayPunches.length - 1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})
                  : '--:--'}
              </p>
            </div>
          </div>
        </Card>

        {/* Today's Punch Activity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
             <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Today's Activity</h4>
             <span className="text-[8px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">{todayPunches.length} Punches</span>
          </div>
          
          <div className="space-y-1.5 max-h-[140px] overflow-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
            {todayPunches.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-xl p-4 text-center">
                 <IconClock className="w-5 h-5 text-slate-300 mx-auto mb-1 opacity-50" />
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No activity</p>
              </div>
            ) : (
              todayPunches.slice().reverse().map((punch, idx) => (
                <div key={punch.id || idx} className="bg-white border border-slate-100 rounded-lg p-2 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] ${idx === 0 ? 'bg-primary shadow-sm' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                      {todayPunches.length - idx}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-800 uppercase leading-none">
                        {new Date(punch.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}
                      </p>
                      <p className="text-[8px] font-bold text-textMuted mt-0.5 flex items-center gap-1">
                        <span className="truncate max-w-[140px]">{punch.address}</span>
                      </p>
                    </div>
                  </div>
                  <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md tracking-widest shadow-sm ${punch.type === 'Punch In' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {punch.type === 'Punch In' ? 'Entry' : 'Exit'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map View */}
        <Card className="overflow-hidden p-0 h-[180px] relative border-border">
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
        <div className="flex flex-col items-center gap-2 py-4">
           <p className="text-[9px] font-bold text-textMuted uppercase tracking-widest">Hold to Punch</p>
           
           <div className="relative w-24 h-24 flex items-center justify-center">
             {/* Progress Circle */}
             <svg className="absolute inset-0 w-full h-full -rotate-90">
               <circle
                 cx="48"
                 cy="48"
                 r="44"
                 fill="transparent"
                 stroke="#e2e8f0"
                 strokeWidth="4"
               />
               <circle
                 cx="48"
                 cy="48"
                 r="44"
                 fill="transparent"
                 stroke="#1cbdb0"
                 strokeWidth="4"
                 strokeDasharray="276"
                 strokeDashoffset={276 - (276 * punchProgress) / 100}
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
               className="w-16 h-16 rounded-full border-4 border-slate-100 shadow-xl flex items-center justify-center text-primary z-10 select-none touch-none"
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
