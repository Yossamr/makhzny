import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Sun, Moon } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Settings({ theme, toggleTheme }: { theme: 'light' | 'dark', toggleTheme: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const [recordsFile, setRecordsFile] = useState<File | null>(null);
  const [isUploadingRecords, setIsUploadingRecords] = useState(false);
  const [recordsStatus, setRecordsStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const [clinicName, setClinicName] = useState(localStorage.getItem('clinicName') || '');
  const [clinicAddress, setClinicAddress] = useState(localStorage.getItem('clinicAddress') || '');

  const saveClinicSettings = () => {
    localStorage.setItem('clinicName', clinicName);
    localStorage.setItem('clinicAddress', clinicAddress);
    setStatus({ type: 'success', message: 'تم حفظ بيانات العيادة بنجاح!' });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setStatus({ type: null, message: '' });

      // Read headers
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (jsonData.length > 0) {
        setHeaders(jsonData[0] as string[]);
        setSelectedColumn(0);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus({ type: 'error', message: 'يرجى اختيار ملف أولاً.' });
      return;
    }

    setIsUploading(true);
    setStatus({ type: null, message: '' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('columnIndex', selectedColumn.toString());

    try {
      const res = await fetch('/api/drugs/import', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setStatus({ type: 'success', message: data.message || 'تم رفع البيانات بنجاح!' });
        setFile(null);
        setHeaders([]);
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        const errorData = await res.json();
        setStatus({ type: 'error', message: errorData.error || 'حدث خطأ أثناء الرفع.' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'فشل الاتصال بالخادم.' });
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRecordsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setRecordsFile(e.target.files[0]);
      setRecordsStatus({ type: null, message: '' });
    }
  };

  const handleUploadRecords = async () => {
    if (!recordsFile) {
      setRecordsStatus({ type: 'error', message: 'يرجى اختيار ملف أولاً.' });
      return;
    }

    setIsUploadingRecords(true);
    setRecordsStatus({ type: null, message: '' });

    const formData = new FormData();
    formData.append('file', recordsFile);

    try {
      const res = await fetch('/api/records/import', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setRecordsStatus({ type: 'success', message: data.message || 'تم استيراد البيانات بنجاح!' });
        setRecordsFile(null);
        const fileInput = document.getElementById('records-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        const errorData = await res.json();
        setRecordsStatus({ type: 'error', message: errorData.error || 'حدث خطأ أثناء الاستيراد.' });
      }
    } catch (error) {
      setRecordsStatus({ type: 'error', message: 'فشل الاتصال بالخادم.' });
    } finally {
      setIsUploadingRecords(false);
    }
  };

  return (
    <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl shadow-sm border p-8 max-w-2xl mx-auto`}>
      <div className="mb-8 border-b border-slate-100 pb-4 flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>إعدادات النظام</h2>
          <p className="text-slate-500 mt-1 text-sm">إدارة بيانات العيادة وقاعدة بيانات الأدوية.</p>
        </div>
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>
      </div>

      <div className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-xl p-6 border mb-8`}>
        <h3 className={`text-lg font-medium mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>بيانات العيادة</h3>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>اسم العيادة</label>
            <input
              type="text"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>عنوان العيادة</label>
            <input
              type="text"
              value={clinicAddress}
              onChange={(e) => setClinicAddress(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300'}`}
            />
          </div>
          <button
            onClick={saveClinicSettings}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            حفظ بيانات العيادة
          </button>
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-xl p-6 border mb-8`}>
        <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>استيراد بيانات سابقة (نسخة احتياطية)</h3>
        <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} text-sm mb-6`}>
          قم برفع ملف Excel (.xlsx) الذي تم تصديره من البرنامج سابقاً لاستعادة جميع البيانات (الفواتير، الأصناف، التواريخ) كما كانت تماماً.
        </p>

        {recordsStatus.type && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${recordsStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {recordsStatus.type === 'success' ? <CheckCircle2 className="h-5 w-5 ml-2" /> : <AlertCircle className="h-5 w-5 ml-2" />}
            {recordsStatus.message}
          </div>
        )}

        <div className="flex flex-col items-center justify-center w-full">
          <label
            htmlFor="records-file-upload"
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              recordsFile 
                ? (theme === 'dark' ? 'border-indigo-500 bg-indigo-900/30' : 'border-indigo-400 bg-indigo-50') 
                : (theme === 'dark' ? 'border-slate-600 bg-slate-800 hover:bg-slate-700' : 'border-slate-300 bg-white hover:bg-slate-50')
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className={`w-10 h-10 mb-3 ${recordsFile ? 'text-indigo-500' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}`} />
              <p className={`mb-2 text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                {recordsFile ? recordsFile.name : 'اضغط لاختيار ملف أو اسحب الملف هنا'}
              </p>
              {!recordsFile && <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>XLSX (ملف التصدير من البرنامج)</p>}
            </div>
            <input
              id="records-file-upload"
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleRecordsFileChange}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleUploadRecords}
            disabled={!recordsFile || isUploadingRecords}
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${theme === 'dark' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'} disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {isUploadingRecords ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
            ) : (
              <UploadCloud className="w-5 h-5 ml-2" />
            )}
            استعادة البيانات
          </button>
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-xl p-6 border mb-8`}>
        <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>وضع تطبيق سطح المكتب (Desktop App)</h3>
        <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} text-sm mb-4`}>
          هذا البرنامج مصمم ليعمل كتطبيق سطح مكتب متكامل. يمكنك استخدام اختصارات لوحة المفاتيح التالية لتسريع العمل:
        </p>
        <ul className={`list-disc list-inside space-y-2 text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} mb-6`}>
          <li><kbd className={`px-2 py-1 rounded-md text-xs font-mono ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-800'}`}>Enter</kbd> : الانتقال للحقل التالي (مثل زر Tab).</li>
          <li><kbd className={`px-2 py-1 rounded-md text-xs font-mono ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-800'}`}>Ctrl + Enter</kbd> : إضافة صنف جديد للفاتورة.</li>
          <li><kbd className={`px-2 py-1 rounded-md text-xs font-mono ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-800'}`}>Ctrl + S</kbd> : حفظ الفاتورة بالكامل.</li>
        </ul>

        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800 border border-slate-600' : 'bg-white border border-slate-200'}`}>
          <h4 className={`font-medium text-sm mb-2 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>كيفية تشغيل البرنامج كملف EXE (تطبيق مستقل):</h4>
          <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            لتحويل هذا البرنامج إلى تطبيق يعمل مباشرة من سطح المكتب (Desktop App) بدون متصفح:
          </p>
          <ol className={`list-decimal list-inside space-y-1 text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            <li>افتح هذا الرابط في متصفح <strong>Google Chrome</strong> أو <strong>Microsoft Edge</strong>.</li>
            <li>من القائمة العلوية للمتصفح (الثلاث نقاط)، اختر <strong>التطبيقات (Apps)</strong>.</li>
            <li>اختر <strong>تثبيت هذا الموقع كتطبيق (Install this site as an app)</strong>.</li>
            <li>سيظهر لك أيقونة على سطح المكتب، ويمكنك تشغيله كأي برنامج عادي (EXE) في نافذة مستقلة.</li>
          </ol>
        </div>
      </div>

      <div className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-xl p-6 border`}>
        <h3 className={`text-lg font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>استيراد قائمة الأدوية</h3>
        {/* ... rest of existing code ... */}

        <p className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} text-sm mb-6`}>
          قم برفع ملف Excel (.xlsx) أو CSV يحتوي على قائمة بأسماء الأدوية في العمود الأول. سيتم إضافة الأسماء الجديدة تلقائياً وتجاهل المكررة.
        </p>

        {status.type && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {status.type === 'success' ? <CheckCircle2 className="h-5 w-5 ml-2" /> : <AlertCircle className="h-5 w-5 ml-2" />}
            {status.message}
          </div>
        )}

        <div className="flex flex-col items-center justify-center w-full">
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              file 
                ? (theme === 'dark' ? 'border-indigo-500 bg-indigo-900/30' : 'border-indigo-400 bg-indigo-50') 
                : (theme === 'dark' ? 'border-slate-600 bg-slate-800 hover:bg-slate-700' : 'border-slate-300 bg-white hover:bg-slate-50')
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className={`w-10 h-10 mb-3 ${file ? 'text-indigo-500' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-400')}`} />
              <p className={`mb-2 text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                {file ? file.name : 'اضغط لاختيار ملف أو اسحب الملف هنا'}
              </p>
              {!file && <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>XLSX, CSV (العمود الأول لأسماء الأدوية)</p>}
            </div>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
          
          {file && headers.length > 0 && (
            <div className="mt-4 w-full">
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>اختر عمود أسماء الأدوية:</label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(parseInt(e.target.value))}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none ${
                  theme === 'dark' 
                    ? 'bg-slate-800 border-slate-700 text-slate-100' 
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                {headers.map((header, index) => (
                  <option key={index} value={index} className={theme === 'dark' ? 'bg-slate-800' : ''}>
                    {header || `العمود ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${theme === 'dark' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'} disabled:opacity-70 disabled:cursor-not-allowed`}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
            ) : (
              <UploadCloud className="w-5 h-5 ml-2" />
            )}
            رفع وتحديث البيانات
          </button>
        </div>
      </div>
    </div>
  );
}
