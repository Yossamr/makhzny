import React, { useState, useEffect } from 'react';
import DataEntryForm from './components/DataEntryForm';
import Reports from './components/Reports';
import Settings from './components/Settings';
import ActivationScreen from './components/ActivationScreen';
import SplashScreen from './components/SplashScreen';
import { PackageSearch, PlusCircle, FileText, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'entry' | 'reports' | 'settings'>('entry');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    const activated = localStorage.getItem('app_activated') === 'true';
    setIsActivated(activated);
  }, []);

  const handleActivate = () => {
    localStorage.setItem('app_activated', 'true');
    setIsActivated(true);
  };

  return (
    <>
      {showSplash && <SplashScreen theme={theme} onComplete={() => setShowSplash(false)} />}

      {!isActivated ? (
        <ActivationScreen onActivate={handleActivate} theme={theme} />
      ) : (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
          {/* Header */}
          <header className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm border-b sticky top-0 z-10`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16 items-center">
                <div className="flex items-center">
                  <PackageSearch className="h-8 w-8 text-indigo-500 mr-3" />
                  <h1 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>مخزني</h1>
                </div>
                <nav className="flex space-x-4 space-x-reverse">
                  <button
                    onClick={() => setActiveTab('entry')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'entry' 
                        ? (theme === 'dark' ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-700') 
                        : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')
                    }`}
                  >
                    <div className="flex items-center">
                      <PlusCircle className="h-4 w-4 ml-2" />
                      إدخال البيانات
                    </div>
                  </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'reports' 
                    ? (theme === 'dark' ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-700') 
                    : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')
                }`}
              >
                <div className="flex items-center">
                  <FileText className="h-4 w-4 ml-2" />
                  التقارير
                </div>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'settings' 
                    ? (theme === 'dark' ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-100 text-indigo-700') 
                    : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100')
                }`}
              >
                <div className="flex items-center">
                  <SettingsIcon className="h-4 w-4 ml-2" />
                  الإعدادات
                </div>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" dir="rtl">
        {activeTab === 'entry' && <DataEntryForm theme={theme} />}
        {activeTab === 'reports' && <Reports theme={theme} />}
        {activeTab === 'settings' && <Settings theme={theme} toggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} />}
      </main>
        </div>
      )}
    </>
  );
}
