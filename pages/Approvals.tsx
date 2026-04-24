import React, { useState, useEffect } from 'react';
import { Card, Button } from '../components/UI';
import { 
  getLeaveRequests, 
  updateLeaveRequestStatus,
  LeaveRequest
} from '../services/api';
import { IconCheckCircle, IconX, IconClock, IconCalendar } from '../components/Icons';

const Approvals = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setRequests(getLeaveRequests());
    setIsLoading(false);
  }, []);

  const handleAction = (id: string, status: 'Approved' | 'Rejected') => {
    updateLeaveRequestStatus(id, status);
    setRequests(getLeaveRequests());
  };

  if (isLoading) {
    return <div className="p-8 text-center text-textMuted uppercase animate-pulse">Loading...</div>;
  }

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const historyRequests = requests.filter(r => r.status !== 'Pending');

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight">Leave Approvals</h1>
        <p className="text-sm text-textMuted">Review and manage pending leave applications from employees.</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-black text-textMuted uppercase flex items-center gap-2 tracking-widest">
           <span className="w-8 h-px bg-border"></span>
           Pending Applications ({pendingRequests.length})
        </h2>
        
        {pendingRequests.length === 0 ? (
          <Card className="p-12 text-center text-textMuted italic border-dashed">
            No pending leave requests at the moment.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map(req => (
              <div key={req.id}>
                <Card className="p-5 flex flex-col gap-4 border-l-4 border-l-amber-500">
                  <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surfaceHighlight flex items-center justify-center font-bold text-text uppercase">
                      {req.employeeName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-text uppercase tracking-tight">{req.employeeName}</h3>
                      <p className="text-[10px] text-textMuted font-bold uppercase">{req.leaveCategory}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase">
                      Pending
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-y border-border">
                   <div className="flex flex-col">
                     <span className="text-[10px] text-textMuted uppercase font-bold flex items-center gap-1">
                       <IconCalendar className="w-3 h-3 text-primary" /> From
                     </span>
                     <span className="text-sm font-black text-text">{req.startDate}</span>
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[10px] text-textMuted uppercase font-bold flex items-center gap-1">
                       <IconCalendar className="w-3 h-3 text-primary" /> To
                     </span>
                     <span className="text-sm font-black text-text">{req.endDate}</span>
                   </div>
                </div>

                {req.reason && (
                  <div className="bg-surfaceHighlight/50 p-3 rounded-lg">
                    <p className="text-[11px] text-textMuted italic leading-relaxed">"{req.reason}"</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600"
                    onClick={() => handleAction(req.id, 'Approved')}
                  >
                    <IconCheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex-1 text-red-500 hover:bg-red-500/10"
                    onClick={() => handleAction(req.id, 'Rejected')}
                  >
                    <IconX className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
      </div>

      <div className="space-y-6 pt-8">
        <h2 className="text-sm font-black text-textMuted uppercase flex items-center gap-2 tracking-widest">
           <span className="w-8 h-px bg-border"></span>
           Approval History
        </h2>
        
        <Card className="overflow-hidden border border-border">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead className="bg-surfaceHighlight text-textMuted uppercase font-bold">
              <tr>
                <th className="px-4 py-3 border-r border-border">Employee</th>
                <th className="px-4 py-3 border-r border-border">Category</th>
                <th className="px-4 py-3 border-r border-border text-center">Duration</th>
                <th className="px-4 py-3 border-r border-border text-center">Applied On</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {historyRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-textMuted italic">
                    No approval history found.
                  </td>
                </tr>
              ) : (
                [...historyRequests].reverse().map(req => (
                  <tr key={req.id} className="hover:bg-surfaceHighlight/30 transition-colors text-textMuted">
                    <td className="px-4 py-3 border-r border-border font-semibold text-text uppercase tracking-tight">{req.employeeName}</td>
                    <td className="px-4 py-3 border-r border-border">
                       <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded text-[10px] font-bold uppercase">
                        {req.leaveCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-border text-center">
                      <span className="font-bold">{req.startDate}</span> to <span className="font-bold">{req.endDate}</span>
                    </td>
                    <td className="px-4 py-3 border-r border-border text-center font-mono">{req.appliedDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
};

export default Approvals;
