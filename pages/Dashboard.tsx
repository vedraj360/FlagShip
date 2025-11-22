import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Application } from '../types';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [newAppName, setNewAppName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    try {
      const res = await api.get('/applications');
      setApps(res.data);
    } catch (error) {
      console.error('Failed to fetch apps', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName) return;
    try {
      await api.post('/applications', { name: newAppName });
      setNewAppName('');
      setIsCreating(false);
      fetchApps();
    } catch (error) {
      alert('Failed to create application');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Applications</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your feature flags across different projects</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors shadow-primary-500/30"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Application
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-slide-up">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Application</h3>
          <form onSubmit={handleCreate} className="flex gap-4">
            <input
              type="text"
              placeholder="Application Name (e.g., iOS App, Web Dashboard)"
              className="flex-1 appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:bg-gray-700 dark:text-white transition-colors"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              autoFocus
            />
            <button 
              type="submit" 
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Create
            </button>
            <button 
              type="button" 
              onClick={() => setIsCreating(false)} 
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <Link 
            key={app.id} 
            to={`/applications/${app.id}`} 
            className="block group"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-200 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 hover:-translate-y-1">
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-lg">
                  {app.name.charAt(0).toUpperCase()}
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  {app._count?.flags || 0} flags
                </span>
              </div>
              
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {app.name}
              </h2>
              
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">SDK Key</p>
                <code className="block w-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded px-2 py-1 text-xs font-mono text-gray-600 dark:text-gray-300 truncate">
                  {app.key}
                </code>
              </div>
              
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700">
                <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Updated {new Date(app.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {apps.length === 0 && !isCreating && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No applications</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new application.</p>
          <div className="mt-6">
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Application
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
