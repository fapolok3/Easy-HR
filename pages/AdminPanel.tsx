import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Modal } from '../components/UI';
import { getCompanies, createCompany, deleteCompany } from '../services/api';
import { Company } from '../types';
import { IconPlus, IconTrash, IconEdit, IconCheckCircle } from '../components/Icons';

const AdminPanel = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    adminEmail: '',
    adminPassword: ''
  });

  const loadCompanies = async () => {
    setLoading(true);
    const data = await getCompanies();
    setCompanies(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleOpenModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setFormData(company);
    } else {
      setEditingCompany(null);
      setFormData({ name: '', adminEmail: '', adminPassword: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.adminEmail || !formData.adminPassword) return;

    setLoading(true);
    try {
      if (editingCompany) {
         // Update logic if needed
      } else {
        await createCompany({
          name: formData.name!,
          adminEmail: formData.adminEmail!,
          adminPassword: formData.adminPassword!
        });
        alert('Company created successfully!');
      }
      
      await loadCompanies();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const handleVisit = (company: Company) => {
    // Log in as this company admin (for super admins convenience)
    const session = {
      userEmail: company.adminEmail,
      isSuperAdmin: false,
      companyId: company.id
    };
    localStorage.setItem('nexushrm_auth_session', JSON.stringify(session));
    window.location.href = '/';
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      await deleteCompany(id);
      await loadCompanies();
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight">Super Admin Panel</h1>
          <p className="text-sm text-textMuted font-medium uppercase">Manage HRM Companies & Subscriptions</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="h-10 px-6">
          <IconPlus className="w-5 h-5 mr-2" />
          Create Company
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {companies.length === 0 ? (
          <Card className="p-12 text-center text-textMuted italic border-dashed">
            No companies registered yet. Create one to get started.
          </Card>
        ) : (
          companies.map((company) => (
            <div key={company.id}>
              <Card className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-[#1cbdb0] uppercase">{company.name}</h2>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Active</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-textMuted font-bold uppercase flex items-center gap-2">
                       <span className="w-1.5 h-1.5 bg-border rounded-full"></span>
                       Admin: <span className="text-text">{company.adminEmail}</span>
                    </p>
                    <p className="text-[10px] text-textMuted uppercase font-semibold">Created: {new Date(company.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                   <Button variant="ghost" onClick={() => handleVisit(company)} className="text-[#1cbdb0] hover:bg-[#1cbdb0]/10">
                     <IconCheckCircle className="w-4 h-4 mr-2" />
                     Visit Portal
                   </Button>
                   <Button variant="ghost" onClick={() => handleOpenModal(company)} className="text-primary hover:bg-primary/10">
                     <IconEdit className="w-4 h-4 mr-2" />
                     Edit
                   </Button>
                   <Button variant="ghost" onClick={() => handleDelete(company.id)} className="text-red-500 hover:bg-red-500/10">
                     <IconTrash className="w-4 h-4 mr-2" />
                     Delete
                   </Button>
                </div>
              </div>
            </Card>
          </div>
        ))
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCompany ? 'Edit Company' : 'Register New Company'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input 
            label="Company Name" 
            value={formData.name} 
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Inovace Technologies"
            required
          />
          <Input 
            label="Admin Email" 
            type="email"
            value={formData.adminEmail} 
            onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
            placeholder="admin@company.com"
            required
          />
          <Input 
            label="Admin Password" 
            type="password"
            value={formData.adminPassword} 
            onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
            placeholder="••••••••"
            required
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" className="px-8" disabled={loading}>
              {loading ? 'Processing...' : (editingCompany ? 'Save Changes' : 'Register Company')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPanel;
