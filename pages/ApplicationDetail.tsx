import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Application, FeatureFlag } from '../types';
import { API_BASE_URL } from '../constants';

const ApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [formData, setFormData] = useState({ key: '', displayName: '', description: '', enabled: false, type: 'BOOLEAN', value: '' });

  const fetchData = async () => {
    try {
      const [appRes, flagsRes] = await Promise.all([
        api.get(`/applications/${id}`),
        api.get(`/applications/${id}/flags`)
      ]);
      setApp(appRes.data);
      setFlags(flagsRes.data);
    } catch (error) {
      console.error(error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const handleDeleteApp = async () => {
    if (!confirm('Are you sure you want to delete this application? This cannot be undone.')) return;
    try {
      await api.delete(`/applications/${id}`);
      navigate('/');
    } catch (e) { alert('Error deleting app'); }
  };

  const handleSaveFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFlag) {
        await api.put(`/applications/${id}/flags/${editingFlag.id}`, formData);
      } else {
        await api.post(`/applications/${id}/flags`, formData);
      }
      setIsModalOpen(false);
      setEditingFlag(null);
      setFormData({ key: '', displayName: '', description: '', enabled: false, type: 'BOOLEAN', value: '' });
      fetchData();
    } catch (e) { alert('Error saving flag'); }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      setFlags(flags.map(f => f.id === flag.id ? { ...f, enabled: !f.enabled } : f));
      await api.put(`/applications/${id}/flags/${flag.id}`, { ...flag, enabled: !flag.enabled });
    } catch (e) { 
      alert('Error toggling flag');
      fetchData();
    }
  };

  const handleDeleteFlag = async (flagId: string) => {
    if (!confirm('Delete this flag?')) return;
    try {
      await api.delete(`/applications/${id}/flags/${flagId}`);
      setFlags(flags.filter(f => f.id !== flagId));
    } catch (e) { alert('Error deleting flag'); }
  };

  const openModal = (flag?: FeatureFlag) => {
    if (flag) {
      setEditingFlag(flag);
      setFormData({ key: flag.key, displayName: flag.displayName, description: flag.description || '', enabled: flag.enabled, type: flag.type || 'BOOLEAN', value: flag.value || '' });
    } else {
      setEditingFlag(null);
      setFormData({ key: '', displayName: '', description: '', enabled: false, type: 'BOOLEAN', value: '' });
    }
    setIsModalOpen(true);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  if (!app) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Application not found</div>;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <button onClick={() => navigate('/')} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">Applications</button>
              <span>/</span>
              <span>{app.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{app.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleDeleteApp} 
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Delete App
            </button>
            <button 
              onClick={() => openModal()} 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-primary-500/30"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Flag
            </button>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">SDK Configuration</p>
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700">
            <code className="text-sm font-mono text-gray-600 dark:text-gray-300 break-all">
              {API_BASE_URL}/sdk/{app.key}/flags
            </code>
            <button 
              onClick={() => navigator.clipboard.writeText(`${API_BASE_URL}/sdk/${app.key}/flags`)}
              className="ml-4 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              title="Copy to clipboard"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Flags List */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Feature Flags</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            {flags.length} flags
          </span>
        </div>
        
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {flags.map((flag) => (
            <li key={flag.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{flag.displayName}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      flag.enabled 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {flag.type}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-mono mb-2">
                    <span>{flag.key}</span>
                  </div>
                  
                  {flag.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{flag.description}</p>
                  )}
                  
                  {flag.value && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Value:</span>
                      <code className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 font-mono text-gray-800 dark:text-gray-200">
                        {flag.value}
                      </code>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggle(flag)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                      flag.enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    role="switch"
                    aria-checked={flag.enabled}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        flag.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openModal(flag)} 
                      className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      title="Edit"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteFlag(flag.id)} 
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
          
          {flags.length === 0 && (
            <li className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No feature flags</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new flag.</p>
            </li>
          )}
        </ul>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4" id="modal-title">
                  {editingFlag ? 'Edit Flag' : 'Create Flag'}
                </h3>
                <form onSubmit={handleSaveFlag} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Key (snake_case)</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.key} 
                      onChange={e => setFormData({...formData, key: e.target.value})} 
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors"
                      placeholder="my_feature_flag"
                      disabled={!!editingFlag}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.displayName} 
                      onChange={e => setFormData({...formData, displayName: e.target.value})} 
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors"
                      placeholder="My Feature Flag"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})} 
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors"
                      rows={3}
                      placeholder="Describe what this flag controls..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                      <select 
                        value={formData.type} 
                        onChange={e => setFormData({...formData, type: e.target.value})} 
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors"
                      >
                        <option value="BOOLEAN">Boolean</option>
                        <option value="STRING">String</option>
                        <option value="NUMBER">Number</option>
                        <option value="JSON">JSON</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
                      <input 
                        type="text" 
                        value={formData.value} 
                        onChange={e => setFormData({...formData, value: e.target.value})} 
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors"
                        placeholder="Optional value"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="enabled" 
                      checked={formData.enabled} 
                      onChange={e => setFormData({...formData, enabled: e.target.checked})} 
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Enabled by default</label>
                  </div>
                </form>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  onClick={handleSaveFlag}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {editingFlag ? 'Update' : 'Create'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetail;
