import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Badge, Select } from '../components/UI';
import { useSession } from '../App';
import { 
  getCompanyBilling, 
  saveCompanyBilling, 
  getCompanyBillingStatus, 
  getCompanyById, 
  DEFAULT_BKASH_NUMBER, 
  DEFAULT_PER_MONTH_BILL 
} from '../services/api';
import { CompanyBilling, BillingPayment } from '../types';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { IconCheckCircle, IconAlertCircle, IconMenu, IconX } from '../components/Icons';

const Billing = () => {
  const { session, logout } = useSession();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<CompanyBilling | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [dueMonths, setDueMonths] = useState<string[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Form states
  const [payMonth, setPayMonth] = useState('');
  const [trxId, setTrxId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New cumulative / all dues payment toggle
  const [payMode, setPayMode] = useState<'single' | 'all'>('all');

  const loadBillingData = async () => {
    if (!session?.companyId) return;
    setLoading(true);
    try {
      const comp = await getCompanyById(session.companyId);
      setCompany(comp);
      
      const bill = await getCompanyBilling(session.companyId);
      setBilling(bill);

      if (comp) {
        const status = getCompanyBillingStatus(comp.createdAt, bill);
        setDueMonths(status.dueMonths);
        setIsLocked(status.isLocked);
        if (status.dueMonths.length > 0) {
          setPayMonth(status.dueMonths[0]);
          // Default to paying 'all' if there are multiple due months, otherwise single
          setPayMode(status.dueMonths.length > 1 ? 'all' : 'single');
        }
      }
    } catch (err) {
      console.error('Error loading billing data:', err);
      toast.error('Failed to load subscription details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, [session]);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billing || !trxId.trim()) {
      toast.error('Please enter a valid bKash Transaction ID.');
      return;
    }

    const trimmedTrx = trxId.trim().toUpperCase();

    // Check if transaction ID has already been submitted
    const isTrxExists = billing.payments.some(
      p => p.trxId.toLowerCase() === trimmedTrx.toLowerCase()
    );
    if (isTrxExists) {
      toast.error('Duplicate Submission', {
        description: 'This Transaction ID has already been submitted.'
      });
      return;
    }

    setSubmitting(true);
    try {
      let newPayments: BillingPayment[] = [];

      if (payMode === 'all' && dueMonths.length > 0) {
        // Create a separate submission entry for each due month with the same transaction ID
        newPayments = dueMonths.map(m => ({
          id: Math.random().toString(36).substring(2, 9).toUpperCase(),
          month: m,
          amount: billing.perMonthBill,
          trxId: trimmedTrx,
          timestamp: new Date().toISOString(),
          status: 'pending'
        }));
      } else {
        // Submit payment for single selected month
        if (!payMonth) {
          toast.error('Please select a billing month.');
          setSubmitting(false);
          return;
        }
        newPayments = [{
          id: Math.random().toString(36).substring(2, 9).toUpperCase(),
          month: payMonth,
          amount: billing.perMonthBill,
          trxId: trimmedTrx,
          timestamp: new Date().toISOString(),
          status: 'pending'
        }];
      }

      const updatedBilling: CompanyBilling = {
        ...billing,
        payments: [...newPayments, ...(billing.payments || [])]
      };

      await saveCompanyBilling(updatedBilling);
      setBilling(updatedBilling);
      setTrxId('');
      toast.success('Payment Submissions Logged!', {
        description: `Your Bkash Trx ID: ${trimmedTrx} has been sent for super admin verification.`
      });
      
      await loadBillingData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMonthName = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surfaceHighlight flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1cbdb0] mx-auto"></div>
          <p className="text-textMuted uppercase font-bold tracking-widest text-xs">Verifying subscription status...</p>
        </div>
      </div>
    );
  }

  const perMonthBill = billing?.perMonthBill ?? DEFAULT_PER_MONTH_BILL;
  const totalCumulativeDue = dueMonths.length * perMonthBill;

  const startYear = company?.createdAt ? new Date(company.createdAt).getFullYear() : 2026;
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = Math.min(startYear, currentYear); y <= currentYear; y++) {
    years.push(y);
  }
  if (!years.includes(currentYear)) {
    years.push(currentYear);
  }
  years.sort((a, b) => b - a);

  const filteredPayments = (billing?.payments || []).filter(p => {
    let paymentYear = new Date().getFullYear();
    if (p.month) {
      const parts = p.month.split('-');
      if (parts[0]) {
        paymentYear = parseInt(parts[0]);
      }
    } else if (p.timestamp) {
      paymentYear = new Date(p.timestamp).getFullYear();
    }
    return paymentYear === selectedYear;
  });

  // --- RENDERING SUSPENDED LOCKED SCREEN VIEW ---
  if (isLocked) {
    return (
      <div className="min-h-screen bg-surfaceHighlight/50 text-text p-4 md:p-8 flex items-center justify-center animate-in fade-in duration-300">
        <div className="w-full max-w-4xl space-y-6">
          
          {/* Locked Alert Panel */}
          <Card className="border-danger/40 bg-danger/5 p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center shrink-0">
              <IconAlertCircle className="w-10 h-10 animate-pulse" />
            </div>
            <div className="space-y-2 text-center md:text-left flex-1">
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
                <Badge variant="danger" className="text-xs uppercase font-extrabold px-3 py-1">ACCESS SUSPENDED</Badge>
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight">Portal Locked due to Due Bill</h1>
              </div>
              <p className="text-sm text-textMuted leading-relaxed font-bold uppercase tracking-tight mt-1">
                Your subscription is suspended. Under SaaS billing policy, please clear your outstanding balance to restore portal access instantly.
              </p>
            </div>
            <Button variant="secondary" onClick={() => { logout(); navigate('/login'); }} className="shrink-0 h-11 px-6 uppercase text-xs tracking-widest font-black">
              Logout Account
            </Button>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* bKash Instructions Panel */}
            <Card className="p-6 md:p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h2 className="text-lg font-black uppercase tracking-wider text-[#1cbdb0]">BKash Payment Instructions</h2>
                <div className="p-5 bg-[#1cbdb0]/5 border border-[#1cbdb0]/20 rounded-xl space-y-3">
                  <div className="flex justify-between border-b border-border pb-2 text-sm">
                    <span className="text-textMuted font-bold uppercase text-[10px]">Merchant bKash Number:</span>
                    <span className="text-text font-black font-mono tracking-wider text-md">{billing?.bkashNumber || DEFAULT_BKASH_NUMBER}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2 text-sm">
                    <span className="text-textMuted font-bold uppercase text-[10px]">Per Month Rate:</span>
                    <span className="text-text font-black text-md">{perMonthBill} BDT</span>
                  </div>
                  <div className="flex justify-between pb-1 text-sm border-b border-border">
                    <span className="text-textMuted font-bold uppercase text-[10px]">Months Unpaid:</span>
                    <span className="text-danger font-black text-md">{dueMonths.length} Months</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm">
                    <span className="text-textMuted font-bold uppercase text-[10px]">Total Cumulative Due:</span>
                    <span className="text-danger font-black text-md select-all">{totalCumulativeDue} BDT</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider">Unpaid Dues:</h3>
                  <div className="flex flex-wrap gap-2">
                    {dueMonths.map(m => (
                      <span key={m} className="px-3 py-1.5 bg-danger/10 text-danger border border-danger/20 rounded-lg text-xs font-black uppercase tracking-wider">
                        {getMonthName(m)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-surfaceHighlight rounded-xl text-[11px] text-textMuted leading-relaxed space-y-1">
                  <p className="font-bold text-text uppercase">Instructions:</p>
                  <p>1. Send money or pay the requested total amount to our bKash Merchant number above.</p>
                  <p>2. Paste the Transaction ID (TrxID) inside the payment verification form to the right.</p>
                  <p>3. Portal will unlock instantly upon super admin verification.</p>
                </div>
              </div>
            </Card>

            {/* bKash Payment Form */}
            <Card className="p-6 md:p-8">
              <form onSubmit={handlePaySubmit} className="space-y-6">
                <h2 className="text-lg font-black uppercase tracking-wider text-text">Verify & Restore Access</h2>

                {dueMonths.length > 0 ? (
                  <>
                    {/* Paymode Selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black uppercase text-textMuted">Choose Payment Scope</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button" 
                          onClick={() => setPayMode('all')}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${payMode === 'all' ? 'border-[#1cbdb0] bg-[#1cbdb0]/5 text-text' : 'border-border bg-transparent text-textMuted'}`}
                        >
                          <p className="text-xs font-black uppercase">Pay All Dues</p>
                          <p className="text-lg font-black mt-1">{totalCumulativeDue} Tk</p>
                          <p className="text-[9px] uppercase font-bold mt-1 text-[#1cbdb0]">Clears {dueMonths.length} months</p>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setPayMode('single')}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${payMode === 'single' ? 'border-[#1cbdb0] bg-[#1cbdb0]/5 text-text' : 'border-border bg-transparent text-textMuted'}`}
                        >
                          <p className="text-xs font-black uppercase">Pay Single Month</p>
                          <p className="text-lg font-black mt-1">{perMonthBill} Tk</p>
                          <p className="text-[9px] uppercase font-bold mt-1 text-primary">Select month below</p>
                        </button>
                      </div>
                    </div>

                    {payMode === 'single' && (
                      <Select
                        label="Select Bill Month"
                        options={dueMonths.map(m => ({ label: getMonthName(m), value: m }))}
                        value={payMonth}
                        onChange={e => setPayMonth(e.target.value)}
                        required
                      />
                    )}

                    <Input
                      label="Amount to Send (BDT)"
                      type="number"
                      value={payMode === 'all' ? totalCumulativeDue : perMonthBill}
                      disabled
                      className="font-bold text-lg text-text bg-surfaceHighlight/40"
                    />

                    <Input
                      label="bKash Transaction ID (TrxID)"
                      placeholder="e.g., K7L2X9J1P8"
                      value={trxId}
                      onChange={e => setTrxId(e.target.value)}
                      required
                      className="font-mono text-lg tracking-widest uppercase font-black"
                    />

                    <Button 
                      type="submit" 
                      className="w-full h-12 uppercase font-black tracking-widest bg-emerald-600 hover:bg-emerald-700 mt-4 text-sm"
                      isLoading={submitting}
                    >
                      Verify bKash TrxID
                    </Button>
                  </>
                ) : (
                  <div className="p-8 text-center text-textMuted italic space-y-3">
                    <IconCheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                    <p className="font-bold uppercase text-xs tracking-wider">No Due Bills Remaining</p>
                    <p className="text-xs">Your payment is processing. Super Admin is reviewing your submission.</p>
                  </div>
                )}
              </form>
            </Card>
          </div>

          {/* Previous submissions */}
          <Card className="p-6 md:p-8">
            <h2 className="text-lg font-black uppercase tracking-wider text-text mb-4">Your Recent Submissions & Payments</h2>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-[#1cbdb0] text-white uppercase text-xs font-black">
                  <tr>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3 text-right">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {!billing?.payments || billing.payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-textMuted italic uppercase font-bold text-xs tracking-wider">
                        No previous bKash payment submissions found.
                      </td>
                    </tr>
                  ) : (
                    billing.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-surfaceHighlight/30 transition-colors">
                        <td className="px-4 py-3.5 font-extrabold text-text uppercase">{getMonthName(p.month)}</td>
                        <td className="px-4 py-3.5 font-mono text-text text-sm tracking-wider font-extrabold">{p.trxId}</td>
                        <td className="px-4 py-3.5 text-text font-bold">{p.amount} BDT</td>
                        <td className="px-4 py-3.5 text-textMuted text-xs font-semibold">
                          {new Date(p.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {p.status === 'pending' && (
                            <span className="px-3 py-1 text-xs font-black bg-amber-100 text-amber-700 rounded-full border border-amber-200 uppercase tracking-widest animate-pulse">
                              Pending Review
                            </span>
                          )}
                          {p.status === 'approved' && (
                            <span className="px-3 py-1 text-xs font-black bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 uppercase tracking-widest">
                              Approved
                            </span>
                          )}
                          {p.status === 'rejected' && (
                            <span className="px-3 py-1 text-xs font-black bg-red-100 text-red-700 rounded-full border border-red-200 uppercase tracking-widest">
                              Rejected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      </div>
    );
  }

  // --- STANDARD COMPLIANT VIEW (WHEN PORTAL IS UNLOCKED) ---
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-text uppercase tracking-tight">SaaS Subscription Portal</h1>
        <p className="text-sm text-textMuted font-bold uppercase tracking-wider">Configure monthly subscription bills, verify dues, and process bKash logs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column status overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 md:p-8 space-y-6">
            <h2 className="text-md font-black uppercase tracking-wider text-[#1cbdb0]">Subscription Overview</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center shrink-0">
                  <IconCheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] text-textMuted uppercase font-extrabold tracking-wider">Subscription Status</p>
                  <p className="text-sm font-black text-emerald-500 uppercase">PORTAL ACTIVE</p>
                </div>
              </div>

              <div className="p-4 bg-surfaceHighlight/50 border border-border rounded-xl grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-textMuted uppercase font-extrabold tracking-wider">Monthly Charge</p>
                  <p className="text-sm font-black text-text">{perMonthBill} Tk</p>
                </div>
                <div>
                  <p className="text-[10px] text-textMuted uppercase font-extrabold tracking-wider">Cutoff Day</p>
                  <p className="text-sm font-black text-text">{billing?.cutoffDay}th / Month</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 md:p-8 space-y-4">
            <h2 className="text-md font-black uppercase tracking-wider text-text">bKash Merchant Account</h2>
            <p className="text-xs text-textMuted leading-relaxed uppercase font-bold tracking-tight">
              To pay dues or pre-pay, send the payment amount to this target bKash account:
            </p>
            <div className="p-4 bg-surfaceHighlight border border-border rounded-xl text-center font-mono text-lg font-black tracking-widest text-[#1cbdb0] select-all">
              {billing?.bkashNumber || DEFAULT_BKASH_NUMBER}
            </div>
          </Card>
        </div>

        {/* Right column Form + Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pay form */}
            <Card className="p-6 md:p-8">
              <form onSubmit={handlePaySubmit} className="space-y-4">
                <h2 className="text-md font-black uppercase tracking-wider text-text">Pay Bill / Advance Bill</h2>

                {dueMonths.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    <button 
                      type="button" 
                      onClick={() => setPayMode('all')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${payMode === 'all' ? 'border-[#1cbdb0] bg-[#1cbdb0]/5 text-text font-black' : 'border-border text-textMuted'}`}
                    >
                      <p className="text-[10px] uppercase font-bold">Pay All Dues</p>
                      <p className="text-md font-black mt-0.5">{totalCumulativeDue} Tk</p>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setPayMode('single')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${payMode === 'single' ? 'border-[#1cbdb0] bg-[#1cbdb0]/5 text-text font-black' : 'border-border text-textMuted'}`}
                    >
                      <p className="text-[10px] uppercase font-bold">Pay Single</p>
                      <p className="text-md font-black mt-0.5">{perMonthBill} Tk</p>
                    </button>
                  </div>
                )}

                {payMode === 'single' ? (
                  <Select
                    label="Select Billing Month"
                    options={[
                      ...dueMonths.map(m => ({ label: getMonthName(m), value: m })),
                      ...[0, 1, 2, 3].map(offset => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + offset);
                        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (dueMonths.includes(mStr)) return null;
                        return { label: getMonthName(mStr), value: mStr };
                      }).filter(Boolean) as any[]
                    ]}
                    value={payMonth}
                    onChange={e => setPayMonth(e.target.value)}
                    required
                  />
                ) : (
                  <Input
                    label="Due Months Covered"
                    value={dueMonths.map(m => getMonthName(m)).join(', ') || 'None'}
                    disabled
                    className="font-bold text-xs uppercase"
                  />
                )}
                
                <Input
                  label="Amount (BDT)"
                  type="number"
                  value={payMode === 'all' ? totalCumulativeDue : perMonthBill}
                  disabled
                  className="font-black text-md"
                />
                
                <Input
                  label="bKash Transaction ID (TrxID)"
                  placeholder="e.g., K7L2X9J1P8"
                  value={trxId}
                  onChange={e => setTrxId(e.target.value)}
                  required
                  className="font-mono text-sm tracking-widest uppercase font-black"
                />

                <Button 
                  type="submit" 
                  className="w-full uppercase font-black tracking-widest text-xs h-11"
                  isLoading={submitting}
                >
                  Submit Payment Log
                </Button>
              </form>
            </Card>

            {/* Dues breakdown list */}
            <Card className="p-6 md:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <h2 className="text-md font-black uppercase tracking-wider text-[#1cbdb0]">Subscription Status</h2>
                
                <div className="space-y-2">
                  <p className="text-xs font-bold text-textMuted uppercase tracking-wider">Unpaid Dues:</p>
                  {dueMonths.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dueMonths.map(m => (
                        <span key={m} className="px-2.5 py-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase">
                          {getMonthName(m)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider">No due month(s)! You are up to date.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-textMuted uppercase tracking-wider">Approved Paid Months:</p>
                  <div className="flex flex-wrap gap-2">
                    {billing?.payments
                      .filter(p => p.status === 'approved')
                      .map(p => (
                        <span key={p.id} className="px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black uppercase">
                          {getMonthName(p.month)}
                        </span>
                      ))
                    }
                    {billing?.payments.filter(p => p.status === 'approved').length === 0 && (
                      <p className="text-xs text-textMuted italic">No payments approved yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Table */}
          <Card className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/60">
              <div>
                <h2 className="text-md font-black uppercase tracking-wider text-text">Payment Submission Logs</h2>
                <p className="text-xs text-textMuted uppercase font-bold tracking-wide mt-1">
                  Showing logs for the year: {selectedYear}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-textMuted uppercase tracking-wider shrink-0">Select Year:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-1.5 text-xs font-bold uppercase rounded-lg border border-border bg-surfaceHighlight text-text focus:outline-none focus:ring-2 focus:ring-[#1cbdb0] min-w-[100px]"
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-[#1cbdb0] text-white uppercase text-xs font-black">
                  <tr>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Transaction ID</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3 text-right">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-textMuted italic uppercase font-bold text-xs tracking-wider">
                        No payment submissions found for {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-surfaceHighlight/30 transition-colors">
                        <td className="px-4 py-3.5 font-extrabold text-text uppercase">{getMonthName(p.month)}</td>
                        <td className="px-4 py-3.5 font-mono text-text tracking-wider font-extrabold select-all">{p.trxId}</td>
                        <td className="px-4 py-3.5 text-text font-bold">{p.amount} BDT</td>
                        <td className="px-4 py-3.5 text-textMuted text-xs font-semibold">
                          {new Date(p.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {p.status === 'pending' && (
                            <span className="px-2 py-0.5 text-[10px] font-black bg-amber-100 text-amber-700 rounded-full border border-amber-200 uppercase tracking-wider">
                              Pending Review
                            </span>
                          )}
                          {p.status === 'approved' && (
                            <span className="px-2 py-0.5 text-[10px] font-black bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 uppercase tracking-wider">
                              Approved
                            </span>
                          )}
                          {p.status === 'rejected' && (
                            <span className="px-2 py-0.5 text-[10px] font-black bg-red-100 text-red-700 rounded-full border border-red-200 uppercase tracking-wider">
                              Rejected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Billing;
