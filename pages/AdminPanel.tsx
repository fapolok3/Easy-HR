import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Modal, Select, Badge } from '../components/UI';
import { 
  getCompanies, 
  createCompany, 
  deleteCompany, 
  setCurrentSession, 
  getCompanyBilling, 
  saveCompanyBilling, 
  getCompanyBillingStatus,
  updateCompany,
  resetCompanyAdminPassword,
  getGlobalBkashNumber,
  saveGlobalBkashNumber,
  deleteCompanyBillingPayment
} from '../services/api';
import { Company, CompanyBilling, BillingPayment } from '../types';
import { IconPlus, IconTrash, IconEdit, IconCheckCircle, IconAlertCircle, IconSettings, IconUsers, IconXCircle, IconFileText, IconChevronDown, IconChevronUp } from '../components/Icons';
import { toast } from 'sonner';
import { useSession } from '../App';

interface AdminPanelProps {
  activeTab?: 'companies' | 'pending-payments' | 'locked-portals' | 'active-portals' | 'billing-settings';
}

const AdminPanel = ({ activeTab: routeActiveTab }: AdminPanelProps) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'companies' | 'pending-payments' | 'locked-portals' | 'active-portals' | 'billing-settings'>('companies');
  
  // Sync prop tab to internal state if provided
  const activeTab = routeActiveTab || internalActiveTab;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [billings, setBillings] = useState<Record<string, CompanyBilling>>({});
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Global settings
  const [globalBkash, setGlobalBkash] = useState('01787654321');
  const { systemLogo, setSystemLogo, systemName, setSystemName } = useSession();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [inputSystemName, setInputSystemName] = useState(systemName);

  useEffect(() => {
    setInputSystemName(systemName);
  }, [systemName]);

  const handleSaveSystemName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSystemName.trim()) {
      toast.error('System branding name cannot be empty.');
      return;
    }
    try {
      const { saveSystemBrandingConfig } = await import('../services/api');
      await saveSystemBrandingConfig(systemLogo, inputSystemName.trim());
      setSystemName(inputSystemName.trim());
      toast.success('System branding name updated successfully!');
    } catch (err) {
      toast.error('Failed to update system branding name.');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const uploadPromise = new Promise(async (resolve, reject) => {
      try {
        const { uploadSystemLogo } = await import('../services/api');
        const url = await uploadSystemLogo(file);
        if (url) {
          setSystemLogo(url);
          resolve(url);
        } else {
          reject(new Error('Failed to retrieve upload URL.'));
        }
      } catch (err: any) {
        reject(err);
      }
    });

    toast.promise(uploadPromise, {
      loading: 'Uploading custom logo to Supabase...',
      success: 'System logo uploaded and set successfully!',
      error: (err) => err.message || 'Failed to upload custom logo.'
    });

    try {
      await uploadPromise;
    } catch (e) {}
    setUploadingLogo(false);
  };

  const handleLogoDelete = async () => {
    if (window.confirm('Are you sure you want to remove the custom logo and revert to the default branding?')) {
      setUploadingLogo(true);
      try {
        const { deleteSystemLogo } = await import('../services/api');
        await deleteSystemLogo();
        setSystemLogo(null);
        toast.success('Custom system logo removed successfully.');
      } catch (err) {
        toast.error('Failed to delete system logo.');
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  // New & Edit Company Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    adminEmail: '',
    adminPassword: ''
  });

  // Subscription Settings Modal
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [billingForm, setBillingForm] = useState({
    cutoffDay: 10,
    perMonthBill: 2000,
    bkashNumber: '',
    manualOverride: false
  });

  const loadCompaniesAndBillings = async () => {
    setLoading(true);
    try {
      // Get global bkash settings
      const bk = getGlobalBkashNumber();
      setGlobalBkash(bk);

      // Get companies
      const comps = await getCompanies();
      setCompanies(comps);
      
      const bMap: Record<string, CompanyBilling> = {};
      for (const c of comps) {
        const b = await getCompanyBilling(c.id);
        bMap[c.id] = b;
      }
      setBillings(bMap);
    } catch (err) {
      console.error('Failed to load companies:', err);
      toast.error('Failed to load system companies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompaniesAndBillings();
  }, []);

  const handleOpenModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        name: company.name,
        adminEmail: company.adminEmail,
        adminPassword: company.adminPassword || ''
      });
    } else {
      setEditingCompany(null);
      setFormData({ name: '', adminEmail: '', adminPassword: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.adminEmail) {
      toast.error('Missing Fields', { description: 'Please fill in Company Name and Admin Email.' });
      return;
    }

    setLoading(true);
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, formData.name, formData.adminEmail);
        toast.success('Company Information Updated!', {
          description: `Successfully modified profile of ${formData.name}.`
        });
      } else {
        if (!formData.adminPassword) {
          toast.error('Password is required for registration.');
          setLoading(false);
          return;
        }
        await createCompany({
          name: formData.name,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword
        });
        toast.success('New SaaS Company Registered Successfully!');
      }
      await loadCompaniesAndBillings();
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error('Operation Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (company: Company) => {
    if (window.confirm(`Are you sure you want to reset the administrator password for "${company.name}" to "123456"?`)) {
      setLoading(true);
      try {
        await resetCompanyAdminPassword(company.id);
        toast.success('Password Reset Successful!', {
          description: `Admin password for ${company.name} is now set to: 123456`
        });
        await loadCompaniesAndBillings();
      } catch (err: any) {
        toast.error('Password reset failed.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVisit = (company: Company) => {
    const session = {
      userEmail: company.adminEmail,
      isSuperAdmin: false,
      companyId: company.id
    };
    setCurrentSession(session);
    // Force direct reload to trigger router change
    window.location.href = '/';
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this company? All data, employees, and billing records will be permanently deleted.')) {
      try {
        await deleteCompany(id);
        toast.success('Company deleted successfully!');
        await loadCompaniesAndBillings();
      } catch (err) {
        toast.error('Failed to delete company.');
      }
    }
  };

  // Billing customization handler
  const handleOpenBillingModal = (company: Company) => {
    const b = billings[company.id];
    setSelectedCompany(company);
    setBillingForm({
      cutoffDay: b?.cutoffDay ?? 10,
      perMonthBill: b?.perMonthBill ?? 2000,
      bkashNumber: b?.bkashNumber || globalBkash,
      manualOverride: b?.manualOverride ?? false
    });
    setIsBillingModalOpen(true);
  };

  const handleSaveBillingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    try {
      const b = billings[selectedCompany.id];
      const updatedBilling: CompanyBilling = {
        companyId: selectedCompany.id,
        cutoffDay: Number(billingForm.cutoffDay),
        perMonthBill: Number(billingForm.perMonthBill),
        bkashNumber: billingForm.bkashNumber || globalBkash,
        manualOverride: billingForm.manualOverride,
        payments: b?.payments || []
      };

      await saveCompanyBilling(updatedBilling);
      setBillings(prev => ({ ...prev, [selectedCompany.id]: updatedBilling }));
      setIsBillingModalOpen(false);
      toast.success('Subscription Settings Saved!', {
        description: `Successfully configured rate limits for ${selectedCompany.name}.`
      });
      loadCompaniesAndBillings();
    } catch (err) {
      toast.error('Failed to save billing settings.');
    }
  };

  const handleSaveGlobalBkash = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveGlobalBkashNumber(globalBkash);
      toast.success('Global bKash Number Updated!', {
        description: `Incoming payments will default to ${globalBkash} for all active portals.`
      });
      loadCompaniesAndBillings();
    } catch (err) {
      toast.error('Failed to save global bKash number.');
    }
  };

  // Approve / Reject Payments
  const handleVerifyPayment = async (companyId: string, paymentId: string, action: 'approved' | 'rejected') => {
    try {
      const b = billings[companyId];
      if (!b) return;

      const updatedPayments = b.payments.map(p => {
        if (p.id === paymentId) {
          return { ...p, status: action };
        }
        return p;
      });

      const updatedBilling: CompanyBilling = {
        ...b,
        payments: updatedPayments
      };

      await saveCompanyBilling(updatedBilling);
      setBillings(prev => ({ ...prev, [companyId]: updatedBilling }));
      toast.success(`Payment Submission ${action === 'approved' ? 'Approved' : 'Rejected'}!`);
      loadCompaniesAndBillings();
    } catch (err) {
      toast.error('Failed to process payment status change.');
    }
  };

  // Delete payment submission completely
  const handleDeletePaymentLog = async (companyId: string, paymentId: string) => {
    if (window.confirm('Are you sure you want to delete this payment record from the logs permanently?')) {
      try {
        await deleteCompanyBillingPayment(companyId, paymentId);
        toast.success('Payment log record deleted successfully.');
        loadCompaniesAndBillings();
      } catch (err) {
        toast.error('Failed to delete payment record.');
      }
    }
  };

  // Helper to get formatted month
  const getMonthName = (monthStr: string) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  };

  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    let minYear = currentYear;
    companies.forEach(c => {
      if (c.createdAt) {
        const y = new Date(c.createdAt).getFullYear();
        if (y < minYear) {
          minYear = y;
        }
      }
    });
    // Fallback if minYear is unrealistic or too high
    if (minYear > 2026) {
      minYear = 2026;
    }
    const yearsList: number[] = [];
    for (let y = minYear; y <= currentYear; y++) {
      yearsList.push(y);
    }
    // Make sure currentYear is in the list
    if (!yearsList.includes(currentYear)) {
      yearsList.push(currentYear);
    }
    return yearsList.sort((a, b) => b - a);
  };

  // Gather all payments across all companies
  const getPaymentsByStatus = (status?: 'pending' | 'approved' | 'rejected') => {
    const list: { company: Company; payment: BillingPayment }[] = [];
    companies.forEach(c => {
      const b = billings[c.id];
      if (b && b.payments) {
        b.payments.forEach(p => {
          if (!status || p.status === status) {
            list.push({ company: c, payment: p });
          }
        });
      }
    });
    // Sort by timestamp desc
    return list.sort((a, b) => new Date(b.payment.timestamp).getTime() - new Date(a.payment.timestamp).getTime());
  };

  const pendingPayments = getPaymentsByStatus('pending');
  const processedPayments = [
    ...getPaymentsByStatus('approved'),
    ...getPaymentsByStatus('rejected')
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Super Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text uppercase tracking-tight">Super Admin Workspace</h1>
          <p className="text-sm text-textMuted font-bold uppercase tracking-wider">Configure Subscriptions, Reset Passwords & Audit Dues</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="h-11 px-6 uppercase font-black text-xs tracking-widest bg-primary hover:bg-primary/95 text-white">
          <IconPlus className="w-4 h-4 mr-2" />
          Register New Portal
        </Button>
      </div>

      {/* SUB-MODULE 1: COMPANY DIRECTORY */}
      {activeTab === 'companies' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-black uppercase tracking-wider text-text flex items-center gap-2">
              <IconUsers className="w-5 h-5 text-primary" />
              Company Directory & Management
            </h2>
            <div className="relative group w-full max-w-xs">
              <input 
                type="text" 
                placeholder="SEARCH PORTALS..." 
                className="block w-full px-3 h-10 bg-surface border border-border rounded-xl text-xs uppercase font-extrabold tracking-widest placeholder-textMuted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies
              .filter(company => 
                company.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                company.adminEmail.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .length === 0 ? (
              <Card className="p-12 text-center text-textMuted italic border-dashed col-span-full">
                {searchTerm ? 'No registered portals match your query.' : 'No registered portals in the system.'}
              </Card>
            ) : (
              companies
                .filter(company => 
                  company.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  company.adminEmail.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((company) => {
                  const b = billings[company.id];
                  const status = b ? getCompanyBillingStatus(company.createdAt, b) : null;
                  
                  return (
                    <div key={company.id}>
                      <Card className="p-6 border border-border flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors h-full">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-md font-black text-text uppercase tracking-tight">{company.name}</h3>
                              <p className="text-[10px] text-textMuted uppercase font-bold tracking-wider mt-1">ID: {company.id.substring(0, 8)}...</p>
                            </div>
                            {status?.isLocked ? (
                              <span className="px-2.5 py-1 text-[9px] font-black bg-red-100 text-red-700 rounded-full border border-red-200 uppercase tracking-wider shrink-0">
                                Suspended
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-[9px] font-black bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 uppercase tracking-wider shrink-0">
                                Active
                              </span>
                            )}
                          </div>

                          <div className="p-4 bg-surfaceHighlight/50 rounded-xl space-y-2 text-xs text-textMuted font-semibold uppercase">
                            <p className="flex justify-between">
                              <span>Admin Email:</span>
                              <span className="text-text font-bold select-all">{company.adminEmail}</span>
                            </p>
                            <p className="flex justify-between">
                              <span>Monthly rate:</span>
                              <span className="text-text font-bold">{b?.perMonthBill ?? 2000} BDT</span>
                            </p>
                            <p className="flex justify-between border-t border-border/40 pt-1.5 mt-1.5">
                              <span>Due Balance:</span>
                              <span className={`font-black ${status && status.dueMonths.length > 0 ? 'text-danger' : 'text-emerald-500'}`}>
                                {status ? status.dueMonths.length * (b?.perMonthBill ?? 2000) : 0} Tk ({status?.dueMonths.length || 0} mos)
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Action Toolbar */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-4 border-t border-border">
                          <Button 
                            variant="secondary" 
                            onClick={() => handleOpenModal(company)}
                            className="flex-1 py-1.5 uppercase font-black text-[9px] tracking-wider h-8"
                          >
                            Edit Info
                          </Button>
                          <Button 
                            variant="secondary" 
                            onClick={() => handleResetPassword(company)}
                            className="flex-1 py-1.5 uppercase font-black text-[9px] tracking-wider text-amber-600 border-amber-200 hover:bg-amber-50 h-8"
                          >
                            Reset PW
                          </Button>
                          <div className="w-full flex gap-1.5 mt-1">
                            <Button 
                              variant="ghost" 
                              onClick={() => handleVisit(company)}
                              className="flex-1 text-[#1cbdb0] bg-[#1cbdb0]/5 hover:bg-[#1cbdb0]/10 uppercase font-black text-[9px] tracking-wider h-8"
                            >
                              Visit Portal
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => handleDelete(company.id)}
                              className="text-red-500 hover:bg-red-500/5 uppercase font-black text-[9px] tracking-wider h-8"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* SUB-MODULE 2: PENDING & HISTORY PAYMENTS */}
      {activeTab === 'pending-payments' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Pending Queue */}
          <Card className="p-6 md:p-8">
            <h2 className="text-md font-black uppercase tracking-wider text-text mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              bKash Transactions Awaiting Verification
            </h2>
            
            {pendingPayments.length === 0 ? (
              <div className="p-12 text-center text-textMuted italic uppercase font-bold text-xs tracking-wider border-dashed border border-border rounded-xl">
                No pending bKash submissions found. You are all caught up!
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-[#1cbdb0] text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Bill Month</th>
                      <th className="px-4 py-3">Transaction ID (TrxID)</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Submitted At</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingPayments.map(({ company, payment }) => (
                      <tr key={payment.id} className="hover:bg-surfaceHighlight/30 transition-colors">
                        <td className="px-4 py-4 font-black text-[#1cbdb0] uppercase">{company.name}</td>
                        <td className="px-4 py-4 font-bold text-text uppercase">{getMonthName(payment.month)}</td>
                        <td className="px-4 py-4 font-mono text-text text-sm tracking-wider font-extrabold select-all">{payment.trxId}</td>
                        <td className="px-4 py-4 text-text font-bold">{payment.amount} BDT</td>
                        <td className="px-4 py-4 text-textMuted text-[10px] font-semibold">
                          {new Date(payment.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleVerifyPayment(company.id, payment.id, 'approved')}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg transition-colors"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleVerifyPayment(company.id, payment.id, 'rejected')}
                              className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-black text-[10px] uppercase tracking-wider rounded-lg transition-colors border border-red-200"
                            >
                              Reject
                            </button>
                            <button 
                              onClick={() => handleDeletePaymentLog(company.id, payment.id)}
                              className="px-2 py-1.5 hover:text-red-500 transition-colors"
                              title="Delete Submission Log"
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Processed payment audit trail - grouped company-wise in accordion style */}
          <Card className="p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border/60">
              <div>
                <h2 className="text-md font-black uppercase tracking-wider text-text">
                  Processed / Archive Payments Log (Approved & Rejected)
                </h2>
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
                  {getAvailableYears().map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {companies.length === 0 ? (
              <div className="p-8 text-center text-textMuted italic uppercase font-bold text-xs tracking-wider border-dashed border border-border rounded-xl">
                No companies registered in the system.
              </div>
            ) : (
              <div className="space-y-4">
                {companies.map((company) => {
                  const companyPendingCount = pendingPayments.filter(p => p.company.id === company.id).length;
                  const companyProcessed = processedPayments.filter(p => {
                    if (p.company.id !== company.id) return false;
                    let paymentYear = new Date().getFullYear();
                    if (p.payment.month) {
                      const parts = p.payment.month.split('-');
                      if (parts[0]) {
                        paymentYear = parseInt(parts[0]);
                      }
                    } else if (p.payment.timestamp) {
                      paymentYear = new Date(p.payment.timestamp).getFullYear();
                    }
                    return paymentYear === selectedYear;
                  });
                  const isExpanded = !!expandedCompanies[company.id];
                  
                  return (
                    <div key={company.id} className="border border-border rounded-xl overflow-hidden bg-surfaceHighlight/5">
                      {/* Accordion Header */}
                      <button
                        onClick={() => setExpandedCompanies(prev => ({ ...prev, [company.id]: !prev[company.id] }))}
                        className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surfaceHighlight/20 hover:bg-surfaceHighlight/40 transition-colors text-left gap-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black text-text uppercase tracking-wide">
                            {company.name}
                          </span>
                          {companyPendingCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-black bg-amber-500 text-white rounded-full uppercase tracking-wider animate-pulse shadow-sm">
                              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                              {companyPendingCount} Pending
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className="text-[10px] text-textMuted uppercase font-bold tracking-wider">
                            {companyProcessed.length === 0 ? 'No Archives' : `${companyProcessed.length} Log${companyProcessed.length > 1 ? 's' : ''}`}
                          </span>
                          {isExpanded ? (
                            <IconChevronUp className="w-4 h-4 text-textMuted shrink-0" />
                          ) : (
                            <IconChevronDown className="w-4 h-4 text-textMuted shrink-0" />
                          )}
                        </div>
                      </button>
                      
                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="p-4 border-t border-border/60 bg-white space-y-4 animate-in slide-in-from-top-2 duration-200">
                          {companyProcessed.length === 0 ? (
                            <div className="p-6 text-center text-textMuted italic uppercase font-bold text-[10px] tracking-wider border border-dashed border-border/60 rounded-xl">
                              No archived payments found for this company.
                            </div>
                          ) : (
                            <div className="border border-border/60 rounded-xl overflow-x-auto shadow-sm">
                              <table className="w-full text-left text-xs min-w-[600px]">
                                <thead className="bg-surfaceHighlight/30 text-textMuted uppercase text-[9px] font-black tracking-wider border-b border-border/60">
                                  <tr>
                                    <th className="px-4 py-3">Bill Month</th>
                                    <th className="px-4 py-3">Transaction ID (TrxID)</th>
                                    <th className="px-4 py-3">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Submitted At</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/40">
                                  {companyProcessed.map(({ payment }) => (
                                    <tr key={payment.id} className="hover:bg-surfaceHighlight/20 transition-colors">
                                      <td className="px-4 py-3.5 text-text font-bold uppercase">{getMonthName(payment.month)}</td>
                                      <td className="px-4 py-3.5 font-mono text-textMuted tracking-wider font-extrabold select-all">{payment.trxId}</td>
                                      <td className="px-4 py-3.5 text-text font-semibold">{payment.amount} BDT</td>
                                      <td className="px-4 py-3.5">
                                        {payment.status === 'approved' ? (
                                          <span className="px-2 py-0.5 text-[8px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 rounded uppercase">
                                            Approved
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 text-[8px] font-black bg-red-100 text-red-700 border border-red-200 rounded uppercase">
                                            Rejected
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3.5 text-textMuted text-[10px] font-medium">
                                        {new Date(payment.timestamp).toLocaleString()}
                                      </td>
                                      <td className="px-4 py-3.5 text-right">
                                        <button 
                                          onClick={() => handleDeletePaymentLog(company.id, payment.id)}
                                          className="p-1 text-textMuted hover:text-red-500 transition-colors inline-flex items-center gap-1 uppercase font-bold text-[9px] tracking-wider border border-transparent hover:border-red-100 px-2 py-1 rounded-lg"
                                        >
                                          <IconTrash className="w-3.5 h-3.5" />
                                          Delete Log
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SUB-MODULE 3: SUSPENDED PORTALS */}
      {activeTab === 'locked-portals' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className="text-lg font-black uppercase tracking-wider text-text flex items-center gap-2">
            <IconXCircle className="w-5 h-5 text-red-500 animate-pulse" />
            Currently Suspended Portals (Due Bills Blocked)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.filter(c => billings[c.id] && getCompanyBillingStatus(c.createdAt, billings[c.id]).isLocked).length === 0 ? (
              <Card className="p-12 text-center text-textMuted italic border-dashed col-span-full">
                Awesome! No portals are currently suspended in the system. All companies are paid or overrides active.
              </Card>
            ) : (
              companies
                .filter(c => billings[c.id] && getCompanyBillingStatus(c.createdAt, billings[c.id]).isLocked)
                .map(company => {
                  const b = billings[company.id];
                  const status = getCompanyBillingStatus(company.createdAt, b);
                  return (
                    <div key={company.id}>
                      <Card className="p-6 border-red-200 bg-red-50/20 border flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h3 className="text-md font-black text-red-700 uppercase tracking-tight">{company.name}</h3>
                            <Badge variant="danger">Blocked</Badge>
                          </div>
                          
                          <div className="p-4 bg-white border border-red-100 rounded-xl space-y-2 text-xs text-textMuted font-semibold uppercase">
                            <p className="flex justify-between">
                              <span>Admin Login:</span>
                              <span className="text-text font-bold">{company.adminEmail}</span>
                            </p>
                            <p className="flex justify-between">
                              <span>Monthly Rate:</span>
                              <span className="text-text font-bold">{b?.perMonthBill} Tk</span>
                            </p>
                            <p className="flex justify-between text-red-600 font-extrabold border-t border-red-100 pt-1.5 mt-1.5">
                              <span>Accumulated Due:</span>
                              <span>{status.dueMonths.length * b?.perMonthBill} BDT</span>
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase text-red-600">Unpaid Months:</p>
                            <div className="flex flex-wrap gap-1">
                              {status.dueMonths.map(m => (
                                <span key={m} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-black uppercase">
                                  {getMonthName(m)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button 
                            variant="secondary" 
                            onClick={() => handleOpenBillingModal(company)}
                            className="flex-1 text-xs uppercase font-bold"
                          >
                            Unlock Plan
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={() => handleVisit(company)}
                            className="text-red-500 hover:bg-red-50/50 text-xs uppercase font-bold"
                          >
                            Visit Portal
                          </Button>
                        </div>
                      </Card>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* SUB-MODULE 4: ACTIVE PORTALS */}
      {activeTab === 'active-portals' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className="text-lg font-black uppercase tracking-wider text-text flex items-center gap-2">
            <IconCheckCircle className="w-5 h-5 text-emerald-500" />
            Currently Active Portals (Good Standing)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.filter(c => !billings[c.id] || !getCompanyBillingStatus(c.createdAt, billings[c.id]).isLocked).length === 0 ? (
              <Card className="p-12 text-center text-textMuted italic border-dashed col-span-full">
                No active portals found.
              </Card>
            ) : (
              companies
                .filter(c => !billings[c.id] || !getCompanyBillingStatus(c.createdAt, billings[c.id]).isLocked)
                .map(company => {
                  const b = billings[company.id];
                  const status = b ? getCompanyBillingStatus(company.createdAt, b) : null;
                  return (
                    <div key={company.id}>
                      <Card className="p-6 border border-emerald-100 bg-emerald-50/10 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h3 className="text-md font-black text-emerald-700 uppercase tracking-tight">{company.name}</h3>
                            <Badge variant="success" className="bg-emerald-500 text-white">Active</Badge>
                          </div>
                          
                          <div className="p-4 bg-white border border-emerald-100/50 rounded-xl space-y-2 text-xs text-textMuted font-semibold uppercase">
                            <p className="flex justify-between">
                              <span>Admin Login:</span>
                              <span className="text-text font-bold">{company.adminEmail}</span>
                            </p>
                            <p className="flex justify-between">
                              <span>Monthly Rate:</span>
                              <span className="text-text font-bold">{b?.perMonthBill ?? 2000} BDT</span>
                            </p>
                            <p className="flex justify-between border-t border-emerald-50 pt-1.5 mt-1.5">
                              <span>Manual Override:</span>
                              <span className={b?.manualOverride ? 'text-emerald-500 font-bold' : 'text-textMuted'}>
                                {b?.manualOverride ? 'ON (Always Free)' : 'OFF'}
                              </span>
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase text-emerald-600">Active Paid Months:</p>
                            <div className="flex flex-wrap gap-1">
                              {status?.paidMonths.map(m => (
                                <span key={m} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">
                                  {getMonthName(m)}
                                </span>
                              ))}
                              {(!status || status.paidMonths.length === 0) && (
                                <span className="text-[10px] text-textMuted italic">No paid records. Still active (trial or cutoff not reached).</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-border">
                          <Button 
                            variant="secondary" 
                            onClick={() => handleOpenBillingModal(company)}
                            className="flex-1 text-xs uppercase font-bold"
                          >
                            Manage Plan
                          </Button>
                          <Button 
                            variant="ghost" 
                            onClick={() => handleVisit(company)}
                            className="text-[#1cbdb0] hover:bg-[#1cbdb0]/5 text-xs uppercase font-bold"
                          >
                            Visit Portal
                          </Button>
                        </div>
                      </Card>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* SUB-MODULE 5: BILLING SETTINGS */}
      {activeTab === 'billing-settings' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* Target bKash Settings Configuration */}
          <Card className="p-6 md:p-8 space-y-4">
            <h2 className="text-md font-black uppercase tracking-wider text-[#1cbdb0] flex items-center gap-2">
              <IconSettings className="w-5 h-5 text-primary" />
              Global Target bKash Number
            </h2>
            <p className="text-xs text-textMuted leading-relaxed uppercase font-bold tracking-wide">
              * Set the default bKash number that shows up on all client billing portals. This applies automatically to portals with default configurations.
            </p>
            
            <form onSubmit={handleSaveGlobalBkash} className="flex flex-col sm:flex-row items-end gap-4 max-w-lg">
              <div className="flex-1">
                <Input 
                  label="Incoming payments bKash Merchant Number" 
                  value={globalBkash} 
                  onChange={e => setGlobalBkash(e.target.value)}
                  placeholder="e.g. 01787654321"
                  required
                  className="font-mono text-lg tracking-widest font-extrabold uppercase"
                />
              </div>
              <Button type="submit" className="h-11 shrink-0 uppercase font-black tracking-widest text-xs px-6 bg-emerald-600 hover:bg-emerald-700">
                Save Global Number
              </Button>
            </form>
          </Card>

          {/* Global Logo & Favicon Configuration */}
          <Card className="p-6 md:p-8 space-y-4">
            <h2 className="text-md font-black uppercase tracking-wider text-[#1cbdb0] flex items-center gap-2">
              <IconSettings className="w-5 h-5 text-primary" />
              Global System Branding & Logo
            </h2>
            <p className="text-xs text-textMuted leading-relaxed uppercase font-bold tracking-wide">
              * Set a custom branding name and upload a custom system logo. It will automatically update the branding logo in the sidebar, login page, and will be set as the browser's tab icon (favicon). This is stored securely in Supabase.
            </p>

            <form onSubmit={handleSaveSystemName} className="flex flex-col sm:flex-row items-end gap-4 max-w-lg border-b border-border pb-6">
              <div className="flex-1 w-full">
                <Input 
                  label="System Branding Name" 
                  value={inputSystemName} 
                  onChange={e => setInputSystemName(e.target.value)}
                  placeholder="e.g. Easy HR"
                  required
                />
              </div>
              <Button type="submit" className="h-11 shrink-0 uppercase font-black tracking-widest text-xs px-6 bg-emerald-600 hover:bg-emerald-700">
                Save System Name
              </Button>
            </form>
            
            <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-surfaceHighlight/50 rounded-xl border border-border">
              <div className="w-20 h-20 rounded-xl bg-surface border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {systemLogo ? (
                  <img src={systemLogo} alt="Current System Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-3xl font-black text-textMuted">{inputSystemName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              
              <div className="flex-1 space-y-3 w-full">
                <div className="flex flex-wrap gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-primary/90 transition-colors">
                    <span>Choose Image</span>
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/x-icon, image/svg+xml" 
                      onChange={handleLogoUpload} 
                      className="hidden" 
                      disabled={uploadingLogo}
                    />
                  </label>
                  
                  {systemLogo && (
                    <Button 
                      variant="ghost" 
                      onClick={handleLogoDelete} 
                      disabled={uploadingLogo}
                      className="border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-black uppercase tracking-widest px-4 py-2"
                    >
                      Remove Logo
                    </Button>
                  )}
                </div>
                
                <p className="text-[10px] text-textMuted uppercase font-bold">
                  Recommended size: 256x256 pixels. Format: PNG, WEBP, SVG or ICO. Max file size: 2MB.
                </p>
              </div>
            </div>
          </Card>

          {/* Pricing Config Table */}
          <Card className="p-6 md:p-8">
            <h2 className="text-md font-black uppercase tracking-wider text-text mb-4">
              Configure Subscription Rates & Parameters
            </h2>
            
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-surfaceHighlight text-textMuted uppercase text-[10px] font-black tracking-wider border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Company Name</th>
                    <th className="px-4 py-3">Cutoff Day</th>
                    <th className="px-4 py-3">Monthly Charge</th>
                    <th className="px-4 py-3">Custom bKash Receiver</th>
                    <th className="px-4 py-3">Manual Override (Free Pass)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {companies.map(company => {
                    const b = billings[company.id];
                    return (
                      <tr key={company.id} className="hover:bg-surfaceHighlight/30 transition-colors">
                        <td className="px-4 py-4 font-bold text-text uppercase">{company.name}</td>
                        <td className="px-4 py-4 font-bold text-text uppercase">{b?.cutoffDay ?? 10}th of Month</td>
                        <td className="px-4 py-4 text-primary font-black">{b?.perMonthBill ?? 2000} BDT</td>
                        <td className="px-4 py-4 font-mono font-bold text-textMuted">{b?.bkashNumber || globalBkash}</td>
                        <td className="px-4 py-4">
                          {b?.manualOverride ? (
                            <span className="text-emerald-500 font-extrabold text-[10px] uppercase">ENABLED (ALWAYS FREE)</span>
                          ) : (
                            <span className="text-textMuted font-bold text-[10px] uppercase">DISABLED (NORMAL BILLING)</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button 
                            onClick={() => handleOpenBillingModal(company)}
                            className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 font-black text-[10px] uppercase tracking-wider rounded-lg transition-colors border border-primary/20"
                          >
                            Edit Config
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      )}

      {/* Modal: New & Edit Company Info */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCompany ? `Edit Company Info - ${editingCompany.name}` : 'Register New Company Portal'}
      >
        <form onSubmit={handleSaveCompany} className="space-y-4">
          <Input 
            label="Company Name" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Nexus Bangladesh Ltd"
            required
          />
          <Input 
            label="Admin Email" 
            type="email"
            value={formData.adminEmail} 
            onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
            placeholder="admin@nexus.com"
            required
          />
          
          {!editingCompany && (
            <Input 
              label="Admin Password" 
              type="password"
              value={formData.adminPassword} 
              onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
              placeholder="••••••••"
              required
            />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" className="px-8" disabled={loading}>
              {loading ? 'Processing...' : editingCompany ? 'Save Details' : 'Register Portal'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Customize Billing/Subscription for a Company */}
      <Modal 
        isOpen={isBillingModalOpen} 
        onClose={() => setIsBillingModalOpen(false)} 
        title={`Custom Subscription - ${selectedCompany?.name || ''}`}
      >
        <form onSubmit={handleSaveBillingSettings} className="space-y-4">
          <Input 
            label="Cutoff Day of Month (Bypasses active access after this date if unpaid)" 
            type="number"
            min={1}
            max={31}
            value={billingForm.cutoffDay} 
            onChange={e => setBillingForm({ ...billingForm, cutoffDay: Number(e.target.value) })}
            required
          />
          <Input 
            label="Per Month Bill Rate (BDT)" 
            type="number"
            min={0}
            value={billingForm.perMonthBill} 
            onChange={e => setBillingForm({ ...billingForm, perMonthBill: Number(e.target.value) })}
            required
          />
          <Input 
            label="Specific bKash Number for this company (Leave blank to use global defaults)" 
            type="text"
            placeholder={globalBkash}
            value={billingForm.bkashNumber} 
            onChange={e => setBillingForm({ ...billingForm, bkashNumber: e.target.value })}
          />
          
          <div className="p-4 bg-surfaceHighlight/50 border border-border rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-black uppercase text-text">Manual Override (Always Active)</p>
              <p className="text-[10px] text-textMuted uppercase font-semibold">Bypass billing logic and activate this portal permanently without payment</p>
            </div>
            <input 
              type="checkbox" 
              checked={billingForm.manualOverride}
              onChange={e => setBillingForm({ ...billingForm, manualOverride: e.target.checked })}
              className="w-5 h-5 accent-[#1cbdb0] rounded cursor-pointer shrink-0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="ghost" type="button" onClick={() => setIsBillingModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="px-8">
              Update Subscription Settings
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default AdminPanel;
