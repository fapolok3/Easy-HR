import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Modal, Select as UISelect } from '../components/UI';
import { getOrgSettings, saveOrgSettings, OrgSettings, LeavePolicy, LeaveCategory } from '../services/api';
import { IconTrash, IconEdit, IconCheckCircle, IconPlus } from '../components/Icons';

const Leave = () => {
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    departments: [],
    designations: [],
    employmentTypes: [],
    workplaces: [],
    shifts: [],
    leavePolicies: []
  });
  
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<LeaveCategory | null>(null);

  const [policyName, setPolicyName] = useState('');
  
  const [categoryFormData, setCategoryFormData] = useState<Partial<LeaveCategory>>({
    name: '',
    maxLeaves: 0,
    applicability: 'All',
    eligibleAfterDays: 0,
    fileRequiredAfterDays: 3,
    backtrackLimitDays: 7
  });

  useEffect(() => {
    setOrgSettings(getOrgSettings());
  }, []);

  // --- Policy Actions ---
  const handleOpenPolicyModal = (policy?: LeavePolicy) => {
    if (policy) {
      setEditingPolicy(policy);
      setPolicyName(policy.name);
    } else {
      setEditingPolicy(null);
      setPolicyName('');
    }
    setIsPolicyModalOpen(true);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyName.trim()) return;

    let updatedPolicies = [...orgSettings.leavePolicies];
    if (editingPolicy) {
      updatedPolicies = updatedPolicies.map(p => p.id === editingPolicy.id ? { ...p, name: policyName } : p);
    } else {
      updatedPolicies.push({
        id: String(Date.now()),
        name: policyName,
        categories: []
      });
    }

    const updated = { ...orgSettings, leavePolicies: updatedPolicies };
    setOrgSettings(updated);
    saveOrgSettings(updated);
    setIsPolicyModalOpen(false);
  };

  const handleRemovePolicy = (id: string) => {
    const updatedPolicies = orgSettings.leavePolicies.filter(p => p.id !== id);
    const updated = { ...orgSettings, leavePolicies: updatedPolicies };
    setOrgSettings(updated);
    saveOrgSettings(updated);
  };

  // --- Category Actions ---
  const handleOpenCategoryModal = (policyId: string, category?: LeaveCategory) => {
    setSelectedPolicyId(policyId);
    if (category) {
      setEditingCategory(category);
      setCategoryFormData(category);
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        maxLeaves: 0,
        applicability: 'All',
        eligibleAfterDays: 0,
        fileRequiredAfterDays: 3,
        backtrackLimitDays: 7
      });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId || !categoryFormData.name) return;

    const updatedPolicies = orgSettings.leavePolicies.map(p => {
      if (p.id === selectedPolicyId) {
        let updatedCategories = [...p.categories];
        if (editingCategory) {
          updatedCategories = updatedCategories.map(c => c.id === editingCategory.id ? { ...c, ...categoryFormData } as LeaveCategory : c);
        } else {
          updatedCategories.push({
            ...categoryFormData,
            id: String(Date.now()),
          } as LeaveCategory);
        }
        return { ...p, categories: updatedCategories };
      }
      return p;
    });

    const updated = { ...orgSettings, leavePolicies: updatedPolicies };
    setOrgSettings(updated);
    saveOrgSettings(updated);
    setIsCategoryModalOpen(false);
  };

  const handleRemoveCategory = (policyId: string, categoryId: string) => {
    const updatedPolicies = orgSettings.leavePolicies.map(p => {
      if (p.id === policyId) {
        return { ...p, categories: p.categories.filter(c => c.id !== categoryId) };
      }
      return p;
    });
    const updated = { ...orgSettings, leavePolicies: updatedPolicies };
    setOrgSettings(updated);
    saveOrgSettings(updated);
  };

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text uppercase tracking-tight">Leave Management</h1>
          <p className="text-sm text-textMuted">Configure leave policies and their respective categories.</p>
        </div>
        <Button onClick={() => handleOpenPolicyModal()} className="bg-slate-800 text-white hover:bg-slate-700 h-9 px-4 text-sm">
          <IconPlus className="w-4 h-4 mr-2" />
          Create New Policy
        </Button>
      </div>

      <div className="space-y-6">
        {orgSettings.leavePolicies.length === 0 ? (
          <Card className="p-8 text-center text-textMuted">
            No leave policies found. Create your first policy above.
          </Card>
        ) : (
          orgSettings.leavePolicies.map((policy) => (
            <div key={policy.id}>
              <Card className="p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#1cbdb0] uppercase">{policy.name}</h2>
                  <p className="text-xs text-textMuted">{policy.categories.length} Categories Defined</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleOpenCategoryModal(policy.id)}
                    className="border-[#1cbdb0] text-[#1cbdb0] hover:bg-[#1cbdb0] hover:text-white"
                  >
                    <IconPlus className="w-3.5 h-3.5 mr-1" />
                    Add Category
                  </Button>
                  <button 
                    onClick={() => handleOpenPolicyModal(policy)}
                    className="p-1.5 text-textMuted hover:text-primary transition-colors"
                  >
                    <IconEdit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleRemovePolicy(policy.id)}
                    className="p-1.5 text-textMuted hover:text-red-500 transition-colors"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-[11px] md:text-[12px] whitespace-nowrap">
                  <thead className="bg-surfaceHighlight text-textMuted uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-2.5 border-r border-border">Category Name</th>
                      <th className="px-4 py-2.5 border-r border-border text-center">Max Leaves</th>
                      <th className="px-4 py-2.5 border-r border-border text-center">Applicability</th>
                      <th className="px-4 py-2.5 border-r border-border text-center">Eligible After</th>
                      <th className="px-4 py-2.5 border-r border-border text-center">File Required (Days)</th>
                      <th className="px-4 py-2.5 border-r border-border text-center">Backtrack Limit</th>
                      <th className="px-4 py-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {policy.categories.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-textMuted italic text-xs">
                          No categories added to this policy.
                        </td>
                      </tr>
                    ) : (
                      policy.categories.map((cat) => (
                        <tr key={cat.id} className="hover:bg-surfaceHighlight/30 transition-colors text-textMuted">
                          <td className="px-4 py-2.5 border-r border-border font-medium text-text">{cat.name}</td>
                          <td className="px-4 py-2.5 border-r border-border text-center font-mono">{cat.maxLeaves}</td>
                          <td className="px-4 py-2.5 border-r border-border text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                              cat.applicability === 'All' ? 'bg-blue-500/10 text-blue-500' :
                              cat.applicability === 'Male' ? 'bg-indigo-500/10 text-indigo-500' :
                              'bg-pink-500/10 text-pink-500'
                            }`}>
                              {cat.applicability}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 border-r border-border text-center">{cat.eligibleAfterDays} Days</td>
                          <td className="px-4 py-2.5 border-r border-border text-center">{cat.fileRequiredAfterDays} Days</td>
                          <td className="px-4 py-2.5 border-r border-border text-center">{cat.backtrackLimitDays} Days</td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleOpenCategoryModal(policy.id, cat)}
                                className="text-primary hover:bg-primary/10 p-1 rounded"
                              >
                                <IconEdit className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleRemoveCategory(policy.id, cat.id)}
                                className="text-red-500 hover:bg-red-500/10 p-1 rounded"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ))
      )}
      </div>

      {/* Policy Modal */}
      <Modal 
        isOpen={isPolicyModalOpen} 
        onClose={() => setIsPolicyModalOpen(false)} 
        title={editingPolicy ? 'Edit Leave Policy' : 'Create Leave Policy'}
      >
        <form onSubmit={handleSavePolicy} className="space-y-4">
          <Input 
            label="Policy Name" 
            value={policyName} 
            onChange={e => setPolicyName(e.target.value)}
            placeholder="e.g. Regular Employees Policy"
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsPolicyModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingPolicy ? 'Update Policy' : 'Create Policy'}</Button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
        title={editingCategory ? 'Edit Leave Category' : 'Add Leave Category'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input 
            label="Category Name" 
            value={categoryFormData.name} 
            onChange={e => setCategoryFormData({...categoryFormData, name: e.target.value})}
            placeholder="e.g. Sick Leave"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Max Allowed Leaves" 
              type="number"
              value={categoryFormData.maxLeaves} 
              onChange={e => setCategoryFormData({...categoryFormData, maxLeaves: parseInt(e.target.value) || 0})}
            />
            <UISelect 
              label="Applicability"
              value={categoryFormData.applicability}
              onChange={e => setCategoryFormData({...categoryFormData, applicability: e.target.value as any})}
              options={[
                { label: 'All', value: 'All' },
                { label: 'Male Only', value: 'Male' },
                { label: 'Female Only', value: 'Female' }
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Eligible After (Days)" 
              type="number"
              value={categoryFormData.eligibleAfterDays} 
              onChange={e => setCategoryFormData({...categoryFormData, eligibleAfterDays: parseInt(e.target.value) || 0})}
            />
            <Input 
              label="File Required After (Days)" 
              type="number"
              value={categoryFormData.fileRequiredAfterDays} 
              onChange={e => setCategoryFormData({...categoryFormData, fileRequiredAfterDays: parseInt(e.target.value) || 0})}
            />
          </div>
          <Input 
            label="Previous Date Selection Limit (Days)" 
            type="number"
            value={categoryFormData.backtrackLimitDays} 
            onChange={e => setCategoryFormData({...categoryFormData, backtrackLimitDays: parseInt(e.target.value) || 0})}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingCategory ? 'Update Category' : 'Add Category'}</Button>
          </div>
        </form>
      </Modal>

      <Card className="p-6 bg-emerald-500/5 border-emerald-500/20 border-dashed">
        <h4 className="text-sm font-bold text-emerald-600 mb-2 tracking-tight uppercase">Admin Note</h4>
        <p className="text-xs text-emerald-700/70 leading-relaxed">
          When you assign a policy to an employee, the system automatically initializes their leave balance for each category defined within that policy. Eligibility rules and file requirements are enforced during leave application.
        </p>
      </Card>
    </div>
  );
};

export default Leave;

