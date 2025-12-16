import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Application, FeatureFlag, Tag } from '../types';
import { API_BASE_URL } from '../constants';

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', 
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
];

const ApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Filter state
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  
  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [formData, setFormData] = useState({ key: '', displayName: '', description: '', enabled: false, type: 'BOOLEAN', value: '', tagIds: [] as string[] });

  // Tags modal state
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  // Tag assignment modal
  const [isTagAssignModalOpen, setIsTagAssignModalOpen] = useState(false);
  const [tagAssignFlagId, setTagAssignFlagId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // Tag editing state
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [editingTagColor, setEditingTagColor] = useState('');

  // Bulk selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedFlagIds, setSelectedFlagIds] = useState<string[]>([]);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [bulkTagIds, setBulkTagIds] = useState<string[]>([]);

  const fetchData = async () => {
    try {
      const [appRes, flagsRes, tagsRes] = await Promise.all([
        api.get(`/applications/${id}`),
        api.get(`/applications/${id}/flags`),
        api.get(`/applications/${id}/tags`)
      ]);
      setApp(appRes.data);
      setFlags(flagsRes.data);
      setTags(tagsRes.data);
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

  // Filtered and paginated flags
  const filteredFlags = useMemo(() => {
    if (selectedTagFilter === 'all') return flags;
    if (selectedTagFilter === 'untagged') return flags.filter(f => !f.tags || f.tags.length === 0);
    return flags.filter(f => f.tags?.some(t => t.id === selectedTagFilter));
  }, [flags, selectedTagFilter]);

  const totalPages = Math.ceil(filteredFlags.length / pageSize);
  const paginatedFlags = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFlags.slice(start, start + pageSize);
  }, [filteredFlags, currentPage, pageSize]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTagFilter, pageSize]);

  const handleDeleteApp = async () => {
    if (!confirm('Are you sure you want to delete this application? This cannot be undone.')) return;
    try {
      await api.delete(`/applications/${id}`);
      navigate('/');
    } catch (e) { alert('Error deleting app'); }
  };

  const handleSaveFlag = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict Validation
    if (!formData.key.trim()) {
      alert('Key is required');
      return;
    }
    
    // Value is mandatory for all types
    if (formData.value === null || formData.value === undefined || String(formData.value).trim() === '') {
      alert('Value is required');
      return;
    }

    // Validate JSON
    if (formData.type === 'JSON') {
      try {
        JSON.parse(formData.value);
      } catch (e) {
        alert('Invalid JSON value. Please ensure it is valid JSON.');
        return;
      }
    }

    try {
      if (editingFlag) {
        const updated = await api.put(`/applications/${id}/flags/${editingFlag.id}`, formData);
        setFlags(flags.map(f => f.id === editingFlag.id ? updated.data : f));
      } else {
        const created = await api.post(`/applications/${id}/flags`, formData);
        setFlags([...flags, created.data]);
      }
      setIsModalOpen(false);
      setEditingFlag(null);
      setFormData({ key: '', displayName: '', description: '', enabled: false, type: 'BOOLEAN', value: '', tagIds: [] });
    } catch (e) { 
      alert('Error saving flag: ' + (e as any).response?.data?.message || 'Unknown error');
      fetchData(); // Refetch only on error
    }
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

  const handleDuplicateFlag = (flag: FeatureFlag) => {
    setEditingFlag(null); // Ensure it's treated as a new flag
    setFormData({
      key: `${flag.key}_copy`,
      displayName: `${flag.displayName} (Copy)`,
      description: flag.description || '',
      enabled: flag.enabled,
      type: flag.type || 'BOOLEAN',
      value: flag.value || '',
      tagIds: flag.tags?.map(t => t.id) || []
    });
    setIsModalOpen(true);
  };

  const openModal = (flag?: FeatureFlag) => {
    if (flag) {
      setEditingFlag(flag);
      setFormData({ key: flag.key, displayName: flag.displayName, description: flag.description || '', enabled: flag.enabled, type: flag.type || 'BOOLEAN', value: flag.value || '', tagIds: flag.tags?.map(t => t.id) || [] });
    } else {
      setEditingFlag(null);
      setFormData({ key: '', displayName: '', description: '', enabled: false, type: 'BOOLEAN', value: '', tagIds: [] });
    }
    setIsModalOpen(true);
  };

  // Tag management
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await api.post(`/applications/${id}/tags`, { name: newTagName.trim(), color: newTagColor });
      setTags([...tags, res.data]);
      setNewTagName('');
      setNewTagColor(TAG_COLORS[0]);
    } catch (e) {
      alert('Error creating tag: ' + ((e as any).response?.data?.message || 'Unknown error'));
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag? It will be removed from all flags.')) return;
    try {
      await api.delete(`/applications/${id}/tags/${tagId}`);
      setTags(tags.filter(t => t.id !== tagId));
      // Update flags to remove this tag
      setFlags(flags.map(f => ({
        ...f,
        tags: f.tags?.filter(t => t.id !== tagId)
      })));
    } catch (e) { alert('Error deleting tag'); }
  };

  const startEditingTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagColor(tag.color);
  };

  const cancelEditingTag = () => {
    setEditingTagId(null);
    setEditingTagName('');
    setEditingTagColor('');
  };

  const handleUpdateTag = async () => {
    if (!editingTagId || !editingTagName.trim()) return;
    try {
      const res = await api.put(`/applications/${id}/tags/${editingTagId}`, { 
        name: editingTagName.trim(), 
        color: editingTagColor 
      });
      setTags(tags.map(t => t.id === editingTagId ? res.data : t));
      // Update tag in flags as well
      setFlags(flags.map(f => ({
        ...f,
        tags: f.tags?.map(t => t.id === editingTagId ? res.data : t)
      })));
      cancelEditingTag();
    } catch (e) {
      alert('Error updating tag: ' + ((e as any).response?.data?.message || 'Unknown error'));
    }
  };

  const openTagAssignModal = (flag: FeatureFlag) => {
    setTagAssignFlagId(flag.id);
    setSelectedTagIds(flag.tags?.map(t => t.id) || []);
    setIsTagAssignModalOpen(true);
  };

  const handleSaveFlagTags = async () => {
    if (!tagAssignFlagId) return;
    try {
      const res = await api.post(`/applications/${id}/flags/${tagAssignFlagId}/tags`, { tagIds: selectedTagIds });
      setFlags(flags.map(f => f.id === tagAssignFlagId ? res.data : f));
      setIsTagAssignModalOpen(false);
      setTagAssignFlagId(null);
    } catch (e) {
      alert('Error updating tags');
    }
  };

  // Bulk selection helpers
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedFlagIds([]);
  };

  const toggleFlagSelection = (flagId: string) => {
    setSelectedFlagIds(prev => 
      prev.includes(flagId) 
        ? prev.filter(id => id !== flagId)
        : [...prev, flagId]
    );
  };

  const selectAllVisible = () => {
    setSelectedFlagIds(paginatedFlags.map(f => f.id));
  };

  const clearSelection = () => {
    setSelectedFlagIds([]);
  };

  const openBulkTagModal = () => {
    if (selectedFlagIds.length === 0) {
      alert('Please select at least one flag');
      return;
    }
    setBulkTagIds([]);
    setIsBulkTagModalOpen(true);
  };

  const handleBulkAddTags = async () => {
    if (selectedFlagIds.length === 0 || bulkTagIds.length === 0) return;
    try {
      const res = await api.post(`/applications/${id}/flags/bulk-tags`, {
        flagIds: selectedFlagIds,
        tagIds: bulkTagIds,
        action: 'add'
      });
      // Update local state
      const updatedMap = new Map(res.data.flags.map((f: FeatureFlag) => [f.id, f]));
      setFlags(flags.map(f => updatedMap.get(f.id) || f));
      setIsBulkTagModalOpen(false);
      setSelectedFlagIds([]);
      setIsSelectMode(false);
    } catch (e) {
      alert('Error updating tags');
    }
  };

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const validateJson = (input: string) => {
    try {
      if (!input.trim()) {
        setJsonError(null);
        return null;
      }
      const parsed = JSON.parse(input);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (!item.key || typeof item.key !== 'string') {
          setJsonError('Missing or invalid "key"');
          return null;
        }
        if (!item.type || !['BOOLEAN', 'STRING', 'NUMBER', 'JSON'].includes(item.type)) {
          setJsonError('Missing or invalid "type"');
          return null;
        }
        if (item.value === undefined || item.value === null || String(item.value).trim() === '') {
          setJsonError(`Value is required for key "${item.key}"`);
          return null;
        }
      }
      
      setJsonError(null);
      return items;
    } catch (e) {
      setJsonError('Invalid JSON format');
      return null;
    }
  };

  const handleJsonInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    setJsonInput(input);
    validateJson(input);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
      validateJson(content);
    };
    reader.readAsText(file);
  };

  const handleImportJson = async () => {
    const items = validateJson(jsonInput);
    if (!items) return;

    try {
      const promises = items.map(item => api.post(`/applications/${id}/flags`, item));
      const results = await Promise.all(promises);
      setFlags([...flags, ...results.map(r => r.data)]);
      setIsImportModalOpen(false);
      setJsonInput('');
      setJsonError(null);
    } catch (e) {
      const msg = (e as any).response?.data?.message || 'Error importing flag(s)';
      alert(msg);
      fetchData(); // Refetch only on error
    }
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
              onClick={() => setIsTagsModalOpen(true)} 
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Manage Tags
            </button>
            <button 
              onClick={() => setIsImportModalOpen(true)} 
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import JSON
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
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Feature Flags</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                {filteredFlags.length} flags
              </span>
              {/* Select Mode Toggle */}
              <button
                onClick={toggleSelectMode}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  isSelectMode 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {isSelectMode ? 'Cancel Select' : 'Select'}
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Tag Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 dark:text-gray-400">Filter:</label>
                <select
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  className="appearance-none px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Tags</option>
                  <option value="untagged">Untagged</option>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Page Size */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 dark:text-gray-400">Show:</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="appearance-none px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {isSelectMode && (
            <div className="mt-4 flex items-center gap-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <button onClick={selectAllVisible} className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button onClick={clearSelection} className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
                  Clear
                </button>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedFlagIds.length} selected
              </span>
              <button
                onClick={openBulkTagModal}
                disabled={selectedFlagIds.length === 0}
                className="ml-auto px-4 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Tags to Selected
              </button>
            </div>
          )}
        </div>
        
        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
          {paginatedFlags.map((flag) => (
            <li key={flag.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="px-6 py-4 flex items-center justify-between">
                {/* Checkbox for select mode */}
                {isSelectMode && (
                  <div className="mr-4">
                    <input
                      type="checkbox"
                      checked={selectedFlagIds.includes(flag.id)}
                      onChange={() => toggleFlagSelection(flag.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
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
                    {/* Tag pills */}
                    {flag.tags?.map(tag => (
                      <span 
                        key={tag.id} 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
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
                      onClick={() => openTagAssignModal(flag)} 
                      className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      title="Manage Tags"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </button>
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
                      onClick={() => handleDuplicateFlag(flag)} 
                      className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      title="Duplicate"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
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
          
          {paginatedFlags.length === 0 && (
            <li className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No feature flags</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selectedTagFilter !== 'all' ? 'No flags match the selected filter.' : 'Get started by creating a new flag.'}
              </p>
            </li>
          )}
        </ul>

        {/* Pagination Controls */}
        {filteredFlags.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredFlags.length)} of {filteredFlags.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tags Management Modal */}
      {isTagsModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsTagsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Manage Tags
                </h3>
                
                {/* Create Tag Form */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="New tag name..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Color:</span>
                    {TAG_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-6 h-6 rounded-full border-2 flex-shrink-0 ${newTagColor === color ? 'border-gray-900 dark:border-white ring-2 ring-offset-1 ring-primary-500' : 'border-transparent'}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Tags List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tags.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No tags created yet</p>
                  ) : (
                    tags.map(tag => (
                      <div key={tag.id} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {editingTagId === tag.id ? (
                          // Edit mode
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingTagName}
                                onChange={(e) => setEditingTagName(e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                              <button
                                onClick={handleUpdateTag}
                                className="p-1 text-green-600 hover:text-green-700 transition-colors"
                                title="Save"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button 
                                onClick={cancelEditingTag}
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Cancel"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {TAG_COLORS.map(color => (
                                <button
                                  key={color}
                                  onClick={() => setEditingTagColor(color)}
                                  className={`w-5 h-5 rounded-full border-2 ${editingTagColor === color ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }}></span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{tag.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditingTag(tag)}
                                className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                title="Edit"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteTag(tag.id)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  onClick={() => setIsTagsModalOpen(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Assignment Modal */}
      {isTagAssignModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsTagAssignModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full border border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Assign Tags
                </h3>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tags.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No tags available. Create tags first.</p>
                  ) : (
                    tags.map(tag => (
                      <label key={tag.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedTagIds.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTagIds([...selectedTagIds, tag.id]);
                            } else {
                              setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }}></span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{tag.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  onClick={handleSaveFlagTags}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsTagAssignModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {isBulkTagModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsBulkTagModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md w-full border border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-2">
                  Add Tags to {selectedFlagIds.length} Flags
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Select tags to add to the selected flags.
                </p>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tags.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No tags available. Create tags first.</p>
                  ) : (
                    tags.map(tag => (
                      <label key={tag.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <input
                          type="checkbox"
                          checked={bulkTagIds.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkTagIds([...bulkTagIds, tag.id]);
                            } else {
                              setBulkTagIds(bulkTagIds.filter(id => id !== tag.id));
                            }
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: tag.color }}></span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{tag.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  onClick={handleBulkAddTags}
                  disabled={bulkTagIds.length === 0}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Tags
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsBulkTagModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsImportModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full border border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Import Flag from JSON
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Upload JSON File
                    </label>
                    <input 
                      type="file" 
                      accept=".json"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary-50 file:text-primary-700
                        dark:file:bg-primary-900/20 dark:file:text-primary-400
                        hover:file:bg-primary-100 dark:hover:file:bg-primary-900/30"
                    />
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
                        Or paste JSON
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">JSON Content</label>
                    <textarea 
                      value={jsonInput} 
                      onChange={handleJsonInputChange} 
                      className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors font-mono text-xs ${
                        jsonError ? 'border-red-300 dark:border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      rows={10}
                      placeholder='{"key": "my_flag", "type": "BOOLEAN", "enabled": true}'
                    />
                    {jsonError && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{jsonError}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  onClick={handleImportJson}
                  disabled={!!jsonError || !jsonInput.trim()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsImportModalOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      {formData.type === 'BOOLEAN' ? (
                        <select
                          value={formData.value}
                          onChange={e => setFormData({...formData, value: e.target.value})}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors"
                        >
                          <option value="">Select value</option>
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : formData.type === 'NUMBER' ? (
                        <input
                          type="number"
                          step="any"
                          value={formData.value}
                          onChange={e => setFormData({...formData, value: e.target.value})}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors"
                          placeholder="0.00"
                        />
                      ) : formData.type === 'JSON' ? (
                        <textarea
                          value={formData.value}
                          onChange={e => setFormData({...formData, value: e.target.value})}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors font-mono text-xs resize-y"
                          rows={4}
                          placeholder='{"foo": "bar"}'
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData.value}
                          onChange={e => setFormData({...formData, value: e.target.value})}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors"
                          placeholder="Optional value"
                        />
                      )}
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
