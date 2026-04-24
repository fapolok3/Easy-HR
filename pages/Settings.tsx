import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Badge } from '../components/UI';
import { getApiConfig, saveApiConfig, validateToken, getOrgSettings, saveOrgSettings, resetApiToken } from '../services/api';
import { OrgSettings } from '../types';
import { IconTrash } from '../components/Icons';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('api');
  const [apiConfig, setApiConfig] = useState({ baseUrl: '', token: '', secretKey: '' });
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    departments: [],
    designations: [],
    employmentTypes: [],
    workplaces: [],
    shifts: [],
    leavePolicies: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const config = await getApiConfig();
      setApiConfig({
        baseUrl: config.baseUrl || 'https://test.api-inovace360.com/api/v1',
        token: config.token || '',
        secretKey: config.secretKey || ''
      });
      const settings = await getOrgSettings();
      setOrgSettings(settings);
    };
    loadSettings();
  }, []);

  const handleSaveApi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus('idle');

    try {
      const isValid = await validateToken(apiConfig.token, apiConfig.baseUrl);
      if (isValid) {
        await saveApiConfig(apiConfig);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToken = async () => {
    if (window.confirm('Are you sure you want to reset the API token? This will clear the current connection.')) {
      const success = await resetApiToken();
      if (success) {
        setApiConfig(prev => ({ ...prev, token: '' }));
        setStatus('idle');
      }
    }
  };

  const handleAddItem = async (e: React.FormEvent, key: keyof OrgSettings) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    
    // This now only handles non-shift simple string arrays
    if (key === 'shifts') return;

    const updated = {
      ...orgSettings,
      [key]: [...(orgSettings[key] as string[]), newItem.trim()]
    };
    setOrgSettings(updated);
    await saveOrgSettings(updated);
    setNewItem('');
  };

  const handleRemoveItem = async (key: keyof OrgSettings, index: number) => {
    const updated = {
      ...orgSettings,
      [key]: orgSettings[key].filter((_, i) => i !== index)
    };
    setOrgSettings(updated);
    await saveOrgSettings(updated);
  };

  const tabs = [
    { id: 'api', label: 'API Configuration' },
    { id: 'org', label: 'Organization Setup' },
    { id: 'notifications', label: 'Notifications' },
  ];

  const orgSections: { key: keyof OrgSettings; label: string; description: string }[] = [
    { key: 'departments', label: 'Departments', description: 'Manage company departments (e.g. Engineering, Sales)' },
    { key: 'designations', label: 'Designations', description: 'Manage job titles (e.g. Senior Developer, Manager)' },
    { key: 'employmentTypes', label: 'Employment Types', description: 'Manage types of employment (e.g. Full Time, Contract)' },
    { key: 'workplaces', label: 'Workplaces', description: 'Manage office locations (e.g. HQ, Remote)' },
  ];

  const [activeOrgSection, setActiveOrgSection] = useState<keyof OrgSettings>('departments');

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-text">Settings</h1>
        <p className="text-textMuted">Manage your system preferences and integrations.</p>
      </div>

      <div className="flex items-center gap-4 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-1 text-sm font-medium transition-all relative ${
              activeTab === tab.id ? 'text-primary' : 'text-textMuted hover:text-text'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'api' && (
        <Card className="max-w-2xl p-6">
          <form onSubmit={handleSaveApi} className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-text mb-1">TIPSOI Central Server API</h2>
              <p className="text-sm text-textMuted">Configure the connection to your Smart Attendance Solution.</p>
            </div>

            <div className="space-y-4">
              <Input
                label="API Base URL"
                placeholder="https://test.api-inovace360.com/api/v1"
                value={apiConfig.baseUrl}
                onChange={(e) => setApiConfig({ ...apiConfig, baseUrl: e.target.value })}
                required
              />
              <div className="flex items-end gap-2">
                <Input
                  label="API Token"
                  type="text"
                  placeholder="0f56-4ac8-3355-..."
                  value={apiConfig.token}
                  onChange={(e) => setApiConfig({ ...apiConfig, token: e.target.value })}
                  className="flex-1"
                  required
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={handleResetToken}
                  className="mb-0"
                >
                  Reset
                </Button>
              </div>
            </div>

            <div className="bg-surfaceHighlight p-4 rounded-lg border border-border text-sm">
              <h4 className="font-medium text-text mb-2">Connection Info</h4>
              <p className="text-textMuted mb-2">
                This integration supports the TIPSOI Central Server. 
              </p>
              <ul className="list-disc list-inside text-textMuted space-y-1">
                <li>Test API: <code className="text-accent">test.api-inovace360.com</code></li>
                <li>Live API: <code className="text-accent">api-inovace360.com</code></li>
              </ul>
            </div>

            <div className="flex items-center justify-between pt-4">
               <div className="flex items-center gap-2">
                 {status === 'success' && <Badge variant="success">Connected Successfully</Badge>}
                 {status === 'error' && <Badge variant="danger">Connection Failed</Badge>}
               </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Connecting...' : 'Save & Test Connection'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'org' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <Card className="md:col-span-1 p-2 h-fit">
              <ul className="space-y-1">
                 {orgSections.map(section => (
                    <li key={section.key}>
                       <button
                         onClick={() => setActiveOrgSection(section.key)}
                         className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                           activeOrgSection === section.key 
                            ? 'bg-primary text-white' 
                            : 'text-text hover:bg-surfaceHighlight'
                         }`}
                       >
                          {section.label}
                       </button>
                    </li>
                 ))}
              </ul>
           </Card>

           <Card className="md:col-span-3 p-6 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                   <h2 className="text-xl font-bold text-text uppercase tracking-wider">
                     {orgSections.find(s => s.key === activeOrgSection)?.label}
                   </h2>
                   <p className="text-sm text-textMuted">
                     {orgSections.find(s => s.key === activeOrgSection)?.description}
                   </p>
                </div>
              </div>

              <>
                <form onSubmit={(e) => handleAddItem(e, activeOrgSection)} className="flex gap-2 mb-6">
                   <Input
                     placeholder={`Add new ${activeOrgSection.slice(0, -1)}...`}
                     className="flex-1"
                     value={newItem}
                     onChange={(e) => setNewItem(e.target.value)}
                   />
                   <Button type="submit" className="mt-7">Add Item</Button>
                </form>

                <div className="border border-border rounded-lg overflow-hidden">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-[#1cbdb0] text-white uppercase text-xs font-semibold">
                         <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3 text-right">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                         {(orgSettings[activeOrgSection] as string[]).length === 0 ? (
                            <tr>
                               <td colSpan={2} className="px-4 py-8 text-center text-textMuted">
                                 No items found. Add one above.
                               </td>
                            </tr>
                         ) : (
                            (orgSettings[activeOrgSection] as string[]).map((item, index) => (
                               <tr key={index} className="hover:bg-surfaceHighlight/30 transition-colors">
                                  <td className="px-4 py-3 font-medium">{item}</td>
                                  <td className="px-4 py-3 text-right">
                                     <button 
                                       onClick={() => handleRemoveItem(activeOrgSection, index)}
                                       className="text-danger hover:text-dangerHover p-1 hover:bg-danger/10 rounded"
                                     >
                                        <IconTrash className="w-4 h-4" />
                                     </button>
                                  </td>
                               </tr>
                            ))
                         )}
                      </tbody>
                   </table>
                </div>
              </>
           </Card>
        </div>
      )}

      {activeTab === 'notifications' && (
        <Card className="p-12 text-center text-textMuted">
           <h3 className="text-lg font-medium text-text">Notification Settings</h3>
           <p>Configure how you receive alerts and updates.</p>
        </Card>
      )}
    </div>
  );
};

export default Settings;