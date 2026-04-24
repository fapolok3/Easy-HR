import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Select as UISelect } from '../components/UI';
import { 
  getOrgSettings, 
  fetchEmployees, 
  saveLeaveRequest, 
  getLeaveRequests,
  LeaveRequest,
  OrgSettings
} from '../services/api';
import { Employee } from '../types';
import { IconCheckCircle, IconClock, IconFileText, IconCalendar } from '../components/Icons';

const ApplyLeave = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [empData, settingsData, leaveData] = await Promise.all([
          fetchEmployees(),
          getOrgSettings(),
          getLeaveRequests()
        ]);
        setEmployees(empData);
        setOrgSettings(settingsData);
        setLeaveRequests(leaveData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const employeePolicy = selectedEmployee && orgSettings 
    ? orgSettings.leavePolicies.find(p => p.name === selectedEmployee.leavePolicy)
    : null;

  const calculateUsedLeaves = (empId: string, category: string) => {
    return leaveRequests
      .filter(r => r.employeeId === empId && r.leaveCategory === category && r.status === 'Approved')
      .reduce((total, r) => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return total + diffDays;
      }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedCategory || !startDate || !endDate) return;

    // Basic date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      alert("End date cannot be before start date");
      return;
    }

    setIsSubmitting(true);
    
    const newRequest: LeaveRequest = {
      id: String(Date.now()),
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      leaveCategory: selectedCategory,
      startDate,
      endDate,
      reason,
      status: 'Pending',
      appliedDate: new Date().toISOString().split('T')[0]
    };

    await saveLeaveRequest(newRequest);
    const updatedLeaves = await getLeaveRequests();
    setLeaveRequests(updatedLeaves);
    
    // Reset form
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
    setReason('');
    setIsSubmitting(false);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-textMuted uppercase animate-pulse">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight">Apply for Leave</h1>
        <p className="text-sm text-textMuted">Submit a new leave application or track your existing requests.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Application Form */}
        <Card className="lg:col-span-1 p-6 space-y-6">
          <div className="flex items-center gap-2 text-primary border-b border-border pb-4 mb-2">
            <IconFileText className="w-5 h-5" />
            <h2 className="font-bold uppercase tracking-tight">New Application</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <UISelect 
              label="Select Employee"
              value={selectedEmployeeId}
              onChange={e => setSelectedEmployeeId(e.target.value)}
              options={[
                { label: 'Choose Employee', value: '' },
                ...employees.map(e => ({ label: e.name, value: e.id }))
              ]}
              required
            />

            {selectedEmployee && (
              <>
                <UISelect 
                  label="Leave Category"
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  disabled={!employeePolicy}
                  options={[
                    { label: 'Choose Category', value: '' },
                    ...(employeePolicy?.categories.map(c => ({ label: c.name, value: c.name })) || [])
                  ]}
                  required
                />

                {!employeePolicy && (
                  <p className="text-[10px] text-red-500 uppercase font-bold italic">
                    Note: This employee has no leave policy assigned.
                  </p>
                )}

                {selectedCategory && employeePolicy && (
                  <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-textMuted uppercase font-bold">Balance Info</p>
                      <p className="text-xs font-bold text-text uppercase">{selectedCategory}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary">
                        {calculateUsedLeaves(selectedEmployee.id, selectedCategory)} / {employeePolicy.categories.find(c => c.name === selectedCategory)?.maxLeaves || 0}
                      </p>
                      <p className="text-[10px] text-textMuted uppercase font-bold">Days Used</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="Start Date" 
                    type="date" 
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    required
                  />
                  <Input 
                    label="End Date" 
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    required
                  />
                </div>

                <div className="w-full">
                  <label className="block text-sm font-medium text-textMuted mb-1">Reason (Optional)</label>
                  <textarea 
                    className="w-full min-h-[100px] p-3 bg-surfaceHighlight border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Briefly explain the reason..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11"
                  disabled={isSubmitting || !employeePolicy}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </>
            )}
          </form>
        </Card>

        {/* Recent Requests */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
             <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
               <div className="flex items-center gap-2 text-[#1cbdb0]">
                 <IconClock className="w-5 h-5" />
                 <h2 className="font-bold uppercase tracking-tight">Recent Requests</h2>
               </div>
               <span className="text-[10px] font-bold text-textMuted uppercase bg-surfaceHighlight px-2.5 py-1 rounded-full">
                 Total: {leaveRequests.length} Applications
               </span>
             </div>

             <div className="overflow-x-auto border border-border rounded-xl">
               <table className="w-full text-left text-[12px] whitespace-nowrap">
                 <thead className="bg-surfaceHighlight text-textMuted uppercase font-bold">
                   <tr>
                     <th className="px-4 py-3 border-r border-border w-16 text-center">SL</th>
                     <th className="px-4 py-3 border-r border-border">Employee</th>
                     <th className="px-4 py-3 border-r border-border">Category</th>
                     <th className="px-4 py-3 border-r border-border text-center">Duration</th>
                     <th className="px-4 py-3 border-r border-border text-center">Applied On</th>
                     <th className="px-4 py-3 text-center">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                   {leaveRequests.length === 0 ? (
                     <tr>
                       <td colSpan={6} className="px-4 py-12 text-center text-textMuted italic">
                         No leave applications found.
                       </td>
                     </tr>
                   ) : (
                     [...leaveRequests].reverse().map((req, index) => (
                       <tr key={req.id} className="hover:bg-surfaceHighlight/30 transition-colors text-textMuted">
                         <td className="px-4 py-3 text-center border-r border-border font-mono">{leaveRequests.length - index}</td>
                         <td className="px-4 py-3 border-r border-border font-semibold text-text uppercase tracking-tight">{req.employeeName}</td>
                         <td className="px-4 py-3 border-r border-border">
                           <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[10px] font-bold uppercase">
                             {req.leaveCategory}
                           </span>
                         </td>
                         <td className="px-4 py-3 border-r border-border text-center">
                           <div className="flex flex-col">
                             <span className="font-bold text-text">{req.startDate}</span>
                             <span className="text-[10px] text-textMuted">to {req.endDate}</span>
                           </div>
                         </td>
                         <td className="px-4 py-3 border-r border-border text-center font-mono">{req.appliedDate}</td>
                         <td className="px-4 py-3 text-center">
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                             req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 shadow-sm border border-emerald-500/20' :
                             req.status === 'Rejected' ? 'bg-red-500/10 text-red-500 shadow-sm border border-red-500/20' :
                             'bg-amber-500/10 text-amber-500 shadow-sm border border-amber-500/20 animate-pulse'
                           }`}>
                             {req.status}
                           </span>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </Card>

          <Card className="p-6 bg-surfaceHighlight/30 border-dashed">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <IconCheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-text uppercase tracking-tight">Application Rules Reminder</h4>
                <p className="text-xs text-textMuted leading-relaxed max-w-[500px]">
                  Ensure you select the correct leave category. Eligibility rules (joining date limit) and backtrack limits are checked against the company policy before final approval.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ApplyLeave;
