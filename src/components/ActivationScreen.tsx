import React, { useState } from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

export default function ActivationScreen({ onActivate, theme }: { onActivate: () => void, theme: 'light' | 'dark' }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/verify-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code })
      });

      if (res.ok) {
        onActivate();
      } else {
        const data = await res.json();
        setError(data.error || 'الكود غير صحيح');
      }
    } catch (err) {
      setError('فشل الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} font-sans`} dir="rtl">
      <div className={`max-w-md w-full p-8 rounded-2xl shadow-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full ${theme === 'dark' ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <ShieldCheck className="w-12 h-12" />
          </div>
        </div>
        <h2 className={`text-2xl font-bold text-center mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>تفعيل البرنامج</h2>
        <p className={`text-center mb-8 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          يرجى إدخال كود التحقق من تطبيق Google Authenticator لتفعيل البرنامج لأول مرة.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className={`w-full text-center text-3xl tracking-widest font-mono px-4 py-4 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none ${
                theme === 'dark' 
                  ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-600' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-300'
              }`}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-medium">{error}</div>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Lock className="w-4 h-4 ml-2" />
                تفعيل وفتح البرنامج
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
