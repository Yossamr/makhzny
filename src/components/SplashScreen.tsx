import React, { useEffect, useState } from 'react';
import { PackageSearch } from 'lucide-react';

export default function SplashScreen({ theme, onComplete }: { theme: 'light' | 'dark', onComplete: () => void }) {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start progress bar animation
    const progressTimer = setTimeout(() => {
      setProgress(100);
    }, 100);

    // Start fade out
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2000);

    // Complete and unmount
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      } ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}
      dir="rtl"
    >
      <div className={`flex flex-col items-center transition-transform duration-700 ${isFadingOut ? 'scale-110' : 'scale-100'}`}>
        <div className={`p-6 rounded-3xl shadow-2xl mb-6 ${theme === 'dark' ? 'bg-indigo-600' : 'bg-indigo-500'} animate-bounce`}>
          <PackageSearch className="w-16 h-16 text-white" />
        </div>
        <h1 className={`text-5xl font-extrabold tracking-tight mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
          مخزني
        </h1>
        <p className={`text-xl font-medium ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
          لإدارة المخزون والمبيعات
        </p>
        <div className="mt-12 w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
          <div
            className="absolute top-0 right-0 h-full bg-indigo-500 rounded-full transition-all duration-[2000ms] ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
