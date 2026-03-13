import React, { useState, useEffect, useRef } from 'react';
import { Save, CheckCircle2, AlertCircle, Trash2, Plus, Search } from 'lucide-react';

export default function DataEntryForm({ theme }: { theme: 'light' | 'dark' }) {
  const [formData, setFormData] = useState({
    branch: '',
    clinic_name: '',
    ticket_date: new Date().toISOString().split('T')[0],
    items: [{ drug_name: '', unit: '', unit_price: '', quantity: '' }],
  });

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const showSuggestionsRef = useRef<number | null>(null);

  useEffect(() => {
    showSuggestionsRef.current = showSuggestions;
  }, [showSuggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const currentIndex = showSuggestionsRef.current;
      if (currentIndex !== null && wrapperRefs.current[currentIndex] && !wrapperRefs.current[currentIndex]?.contains(event.target as Node)) {
        setShowSuggestions(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/drugs/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  };

  const handleDrugNameChange = (index: number, value: string) => {
    const newItems = [...formData.items];
    newItems[index].drug_name = value;
    setFormData({ ...formData, items: newItems });
    setShowSuggestions(index);
    fetchSuggestions(value);
  };

  const handleSuggestionClick = (index: number, suggestion: string) => {
    const newItems = [...formData.items];
    newItems[index].drug_name = suggestion;
    setFormData({ ...formData, items: newItems });
    setShowSuggestions(null);
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [name]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleCommonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { drug_name: '', unit: '', unit_price: '', quantity: '' }]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });

    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        if (e) {
          setStatus({ type: 'success', message: 'تم حفظ البيانات بنجاح!' });
          setFormData({
            ...formData,
            items: [{ drug_name: '', unit: '', unit_price: '', quantity: '' }],
          });
        }
      } else {
        const errorData = await res.json();
        if (e) setStatus({ type: 'error', message: errorData.error || 'حدث خطأ أثناء الحفظ.' });
      }
    } catch (error) {
      if (e) setStatus({ type: 'error', message: 'فشل الاتصال بالخادم.' });
    } finally {
      setIsSubmitting(false);
      if (e) setTimeout(() => setStatus({ type: null, message: '' }), 5000);
    }
  };

  // Auto-save every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Only auto-save if there's actual data to save
      if (formData.branch && formData.clinic_name && formData.items[0].drug_name) {
        handleSubmit();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [formData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        addItem();
        setTimeout(() => {
          const nextInput = document.getElementById(`drug_name_${formData.items.length}`);
          if (nextInput) nextInput.focus();
        }, 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, nextFieldId?: string, isLastInRow?: boolean, currentIndex?: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // If suggestions are open and we are on drug_name, don't jump yet, let the suggestion click handle it
      if (showSuggestions !== null && e.currentTarget.name === 'drug_name') {
        return;
      }

      if (nextFieldId) {
        const nextElement = document.getElementById(nextFieldId);
        if (nextElement) {
          nextElement.focus();
        }
      } else if (isLastInRow && currentIndex !== undefined) {
        // If it's the last field in the row, add a new item and focus it
        if (currentIndex === formData.items.length - 1) {
          addItem();
          setTimeout(() => {
            const nextInput = document.getElementById(`drug_name_${currentIndex + 1}`);
            if (nextInput) nextInput.focus();
          }, 50);
        } else {
          const nextInput = document.getElementById(`drug_name_${currentIndex + 1}`);
          if (nextInput) nextInput.focus();
        }
      }
    }
  };

  const inputClass = `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none ${
    theme === 'dark' 
      ? 'bg-slate-800 border-slate-700 text-slate-100' 
      : 'bg-slate-50 border-slate-300 text-slate-900'
  }`;

  return (
    <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl shadow-sm border p-8 max-w-4xl mx-auto`}>
      <div className="mb-8 border-b border-slate-100 pb-4">
        <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>إدخال بيانات تذكرة جديدة</h2>
        <p className="text-slate-500 mt-1 text-sm">قم بتعبئة الحقول التالية لإضافة سجل جديد.</p>
      </div>

      {status.type && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${status.type === 'success' ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800' : 'bg-red-900/20 text-red-400 border border-red-800'}`}>
          {status.type === 'success' ? <CheckCircle2 className="h-5 w-5 ml-2" /> : <AlertCircle className="h-5 w-5 ml-2" />}
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>الفرع</label>
            <input id="branch" type="text" name="branch" required value={formData.branch} onChange={handleCommonChange} onKeyDown={(e) => handleInputKeyDown(e, 'clinic_name')} className={inputClass} placeholder="مثال: فرع القاهرة" autoFocus />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>اسم العيادة</label>
            <input id="clinic_name" type="text" name="clinic_name" required value={formData.clinic_name} onChange={handleCommonChange} onKeyDown={(e) => handleInputKeyDown(e, 'ticket_date')} className={inputClass} placeholder="مثال: عيادة الباطنة" />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>تاريخ التذكرة</label>
            <input id="ticket_date" type="date" name="ticket_date" required value={formData.ticket_date} onChange={handleCommonChange} onKeyDown={(e) => handleInputKeyDown(e, 'drug_name_0')} className={inputClass} />
          </div>
        </div>

        <div className="space-y-4">
          {formData.items.map((item, index) => {
            const total = (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0);
            return (
              <div key={index} className={`p-5 rounded-xl border relative transition-all ${theme === 'dark' ? 'bg-slate-700/30 border-slate-600 hover:border-slate-500' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="relative md:col-span-2" ref={(el) => wrapperRefs.current[index] = el}>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>اسم الصنف</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        id={`drug_name_${index}`}
                        type="text" 
                        name="drug_name" 
                        required 
                        value={item.drug_name} 
                        onChange={(e) => handleDrugNameChange(index, e.target.value)} 
                        onKeyDown={(e) => handleInputKeyDown(e, `unit_${index}`)}
                        onFocus={() => {
                          if (item.drug_name.trim()) {
                            setShowSuggestions(index);
                            fetchSuggestions(item.drug_name);
                          }
                        }}
                        className={`${inputClass} pr-10`} 
                        placeholder="ابحث عن اسم الدواء..." 
                        autoComplete="off" 
                      />
                    </div>
                    {showSuggestions === index && suggestions.length > 0 && (
                      <ul className={`absolute z-20 w-full mt-1 border rounded-xl shadow-xl max-h-60 overflow-auto ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        {suggestions.map((suggestion, sIndex) => (
                          <li 
                            key={sIndex} 
                            onClick={() => {
                              handleSuggestionClick(index, suggestion);
                              setTimeout(() => {
                                const nextInput = document.getElementById(`unit_${index}`);
                                if (nextInput) nextInput.focus();
                              }, 10);
                            }} 
                            className={`px-4 py-3 cursor-pointer transition-colors flex items-center gap-2 border-b last:border-0 ${theme === 'dark' ? 'hover:bg-slate-700 border-slate-700 text-slate-200' : 'hover:bg-slate-50 border-slate-100 text-slate-700'}`}
                          >
                            <Search className="h-3 w-3 text-slate-400" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>الوحدة</label>
                    <select id={`unit_${index}`} name="unit" required value={item.unit} onChange={(e) => handleChange(index, e)} onKeyDown={(e) => handleInputKeyDown(e, `unit_price_${index}`)} className={inputClass}>
                      <option value="" disabled>اختر</option>
                      <option value="علبة">علبة</option>
                      <option value="شريط">شريط</option>
                      <option value="قرص">قرص</option>
                      <option value="زجاجة">زجاجة</option>
                      <option value="حقنة">حقنة</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>السعر</label>
                    <input id={`unit_price_${index}`} type="number" step="0.01" min="0" name="unit_price" required value={item.unit_price} onChange={(e) => handleChange(index, e)} onKeyDown={(e) => handleInputKeyDown(e, `quantity_${index}`)} className={inputClass} placeholder="0.00" />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>الكمية</label>
                    <input id={`quantity_${index}`} type="number" step="0.01" min="0" name="quantity" required value={item.quantity} onChange={(e) => handleChange(index, e)} onKeyDown={(e) => handleInputKeyDown(e, undefined, true, index)} className={inputClass} placeholder="0" />
                  </div>
                </div>
                <div className="mt-4 flex justify-between items-center">
                  {formData.items.length > 1 ? (
                    <button 
                      type="button" 
                      onClick={() => removeItem(index)} 
                      className="flex items-center text-red-500 hover:text-red-700 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-sm font-medium"
                      title="حذف الصنف"
                    >
                      <Trash2 className="w-4 h-4 ml-1.5" />
                      حذف الصنف
                    </button>
                  ) : (
                    <div></div>
                  )}
                  <span className={`text-sm font-bold px-4 py-2 rounded-lg ${theme === 'dark' ? 'bg-slate-800 text-emerald-400' : 'bg-white text-emerald-600 border border-slate-200'}`}>
                    الإجمالي: {total.toFixed(2)} ج.م
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-4">
          <button type="button" onClick={addItem} className={`flex items-center px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm ${theme === 'dark' ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}`}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة صنف آخر
          </button>
          <button type="submit" disabled={isSubmitting} className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20 disabled:opacity-70">
            {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div> : <Save className="w-5 h-5 ml-2" />}
            حفظ البيانات
          </button>
        </div>
      </form>
    </div>
  );
}
