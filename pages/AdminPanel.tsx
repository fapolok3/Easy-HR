import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Modal } from '../components/UI';
import { getCompanies, saveCompanies, Company } from '../services/api';
import { IconPlus, IconTrash, IconEdit, IconCheckCircle } from '../components/Icons';

const AdminPanel = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    adminEmail: '',
    adminPassword: ''
  });

  useEffect(() => {
    setCompanies(getCompanies());
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.adminEmail || !formData.adminPassword) return;

    let updated: Company[];
    if (editingCompany) {
      updated = companies.map(c => c.id === editingCompany.id ? { ...c, ...formData } as Company : c);
    } else {
      updated = [
        ...companies,
        {
          ...formData,
          id: Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString()
        } as Company
      ];
    }
    setCompanies(updated);
    saveCompanies(updated);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const updated = companies.filter(c => c.id !== id);
    setCompanies(updated);
    saveCompanies(updated);
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
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="px-8">
              {editingCompany ? 'Save Changes' : 'Register Company'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPanel;
