import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Badge } from '../components/UI';
import { IconSearch, IconDevice, IconCheckCircle } from '../components/Icons';
import { fetchDevices } from '../services/api';
import { Device } from '../types';

const Devices = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDevices().then(data => {
      setDevices(data);
      setLoading(false);
    });
  }, []);

  const filteredDevices = devices.filter(dev => 
    dev.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dev.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold text-text">Device Management</h1>
           <p className="text-textMuted">Monitor and configure attendance terminals.</p>
        </div>
        <div className="flex gap-3">
           <Button>Sync Devices</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4 bg-gradient-to-br from-surface to-surfaceHighlight">
          <div className="p-3 bg-blue-500/20 rounded-lg text-blue-500">
            <IconDevice className="w-6 h-6" />
          </div>
          <div>
            <p className="text-textMuted text-sm">Total Devices</p>
            <p className="text-2xl font-bold text-text">{devices.length}</p>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center gap-4 bg-gradient-to-br from-surface to-surfaceHighlight">
          <div className="p-3 bg-emerald-500/20 rounded-lg text-emerald-500">
            <IconCheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-textMuted text-sm">Online</p>
            <p className="text-2xl font-bold text-text">
              {devices.filter(d => d.status === 'active' || d.status === 'online').length}
            </p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex items-center gap-4">
           <div className="relative w-full max-w-sm">
              <IconSearch className="absolute left-3 top-2.5 w-4 h-4 text-textMuted" />
              <input 
                type="text" 
                placeholder="Search by ID or location..." 
                className="w-full bg-surfaceHighlight border border-border rounded-lg py-2 pl-9 pr-4 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-textMuted">
            <thead className="bg-surfaceHighlight text-xs uppercase font-medium text-text">
              <tr>
                <th className="px-6 py-4">Identifier</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Last Seen</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                       <div className="animate-pulse flex justify-center text-primary">Loading devices...</div>
                    </td>
                 </tr>
              ) : filteredDevices.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-textMuted">
                     No devices found. Check your API configuration.
                   </td>
                 </tr>
              ) : (
                filteredDevices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-surfaceHighlight/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-text">{dev.identifier}</td>
                    <td className="px-6 py-4">{dev.location || 'Unknown'}</td>
                    <td className="px-6 py-4 capitalize">{dev.type || 'N/A'}</td>
                    <td className="px-6 py-4">{dev.last_seen || 'Never'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={dev.status === 'active' || dev.status === 'online' ? 'success' : 'danger'}>
                        {dev.status || 'Offline'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => navigate(`/devices/config/${dev.identifier}`)}
                        className="text-primary hover:text-primaryHover font-medium text-xs bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Configure
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Devices;