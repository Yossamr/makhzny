import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Download, RefreshCw, FileText, Calendar } from 'lucide-react';
import * as xlsx from 'xlsx';
import { jsPDF } from 'jspdf';

interface Record {
  id: number;
  branch: string;
  clinic_name: string;
  drug_name: string;
  unit: string;
  unit_price: number;
  quantity: number;
  total: number;
  ticket_date: string;
  created_at: string;
}

export default function Reports({ theme }: { theme: 'light' | 'dark' }) {
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    setClinicName(localStorage.getItem('clinicName') || '');
    setClinicAddress(localStorage.getItem('clinicAddress') || '');
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/records');
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (!startDate && !endDate) return true;
      
      const recordDate = new Date(record.ticket_date);
      recordDate.setHours(0, 0, 0, 0);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (recordDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        if (recordDate > end) return false;
      }
      
      return true;
    });
  }, [records, startDate, endDate]);

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) return;

    const worksheet = xlsx.utils.json_to_sheet(
      filteredRecords.map((r) => ({
        'التسلسل': r.id,
        'الفرع': r.branch,
        'اسم العيادة': r.clinic_name,
        'تاريخ التذكرة': r.ticket_date,
        'اسم الصنف': r.drug_name,
        'الوحدة': r.unit,
        'سعر الوحدة': r.unit_price,
        'الكمية المنصرفة': r.quantity,
        'الإجمالي': r.total,
        'تاريخ الإدخال': new Date(r.created_at).toLocaleString('ar-EG'),
      }))
    );

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'التقارير');
    xlsx.writeFile(workbook, `reports_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (!tableRef.current || filteredRecords.length === 0) return;
    
    setIsExportingPDF(true);
    // Wait for React to apply the class
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 10,
        filename: `reports_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };
      
      await html2pdf().set(opt).from(tableRef.current).save();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl shadow-sm border p-8`}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
        <div>
          <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} mb-2`}>تقارير العمليات</h2>
          <p className="text-slate-500 text-sm">عرض وتصدير البيانات التي تم إدخالها في النظام.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className={`flex items-center gap-3 p-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`text-sm bg-transparent border-none focus:ring-0 outline-none ${theme === 'dark' ? 'text-white color-scheme-dark' : 'text-slate-700'}`}
                placeholder="من تاريخ"
              />
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`text-sm bg-transparent border-none focus:ring-0 outline-none ${theme === 'dark' ? 'text-white color-scheme-dark' : 'text-slate-700'}`}
                placeholder="إلى تاريخ"
              />
            </div>
          </div>

          <div className="flex space-x-3 space-x-reverse">
            <button
              onClick={fetchRecords}
              className={`flex items-center px-4 py-2.5 rounded-xl font-medium transition-all shadow-sm ${theme === 'dark' ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'}`}
            >
              <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filteredRecords.length === 0 || isExportingPDF}
              className="flex items-center px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all shadow-sm shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExportingPDF ? (
                <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 ml-2" />
              )}
              تصدير PDF
            </button>
            <button
              onClick={handleExportExcel}
              disabled={filteredRecords.length === 0}
              className="flex items-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 ml-2" />
              تصدير Excel
            </button>
          </div>
        </div>
      </div>

      <div ref={tableRef} className={`overflow-x-auto rounded-xl border p-4 ${isExportingPDF ? 'pdf-export-override' : ''} ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
            div, table, th, td, h3, p { 
              font-family: 'Cairo', sans-serif !important; 
              line-height: 1.6 !important;
            }
            
            .pdf-export-override, .pdf-export-override * {
              background-color: #ffffff !important;
              color: #000000 !important;
              border-color: #000000 !important;
            }
            .pdf-export-override h3, .pdf-export-override p {
              padding-bottom: 8px !important;
            }
            .pdf-export-override thead tr {
              background-color: #f0f0f0 !important;
            }
            .pdf-export-override table {
              width: 100% !important;
              table-layout: fixed !important;
              border-collapse: collapse !important;
            }
            .pdf-export-override td, .pdf-export-override th {
              padding: 8px !important;
              font-size: 12px !important;
              border: 1px solid #000000 !important;
              text-align: center !important;
              vertical-align: middle !important;
              word-wrap: break-word;
              white-space: nowrap !important;
            }
            .pdf-export-override td:nth-child(5), .pdf-export-override th:nth-child(5) {
              white-space: normal !important;
              word-break: break-word !important;
              line-height: 1.4 !important;
            }
            .pdf-export-override th:nth-child(1) { width: 9%; }
            .pdf-export-override th:nth-child(2) { width: 6%; }
            .pdf-export-override th:nth-child(3) { width: 8%; }
            .pdf-export-override th:nth-child(4) { width: 7%; }
            .pdf-export-override th:nth-child(5) { width: 34%; }
            .pdf-export-override th:nth-child(6) { width: 11%; }
            .pdf-export-override th:nth-child(7) { width: 9%; }
            .pdf-export-override th:nth-child(8) { width: 9%; }
            .pdf-export-override th:nth-child(9) { width: 7%; }
          `}
        </style>
        <div className="mb-6 text-center" style={{ display: isExportingPDF ? 'block' : 'none' }} dir="rtl">
          <h3 className={`text-xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-950'}`}>{clinicName || 'تقرير العمليات'}</h3>
          <p className="text-base text-slate-800 mb-3 font-semibold inline-block px-8">{clinicAddress}</p>
        </div>
        <table className="w-full text-center border-collapse border border-slate-300 table-fixed mb-8" dir="ltr">
          <thead>
            <tr className={`${theme === 'dark' ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-50 text-slate-600 border-slate-200'} border-b text-sm`}>
              <th className="p-2 font-bold border border-slate-300">الإجمالي</th>
              <th className="p-2 font-bold border border-slate-300">الكمية</th>
              <th className="p-2 font-bold border border-slate-300">السعر</th>
              <th className="p-2 font-bold border border-slate-300">الوحدة</th>
              <th className="p-2 font-bold border border-slate-300 item-col">الصنف</th>
              <th className="p-2 font-bold border border-slate-300">التاريخ</th>
              <th className="p-2 font-bold border border-slate-300">العيادة</th>
              <th className="p-2 font-bold border border-slate-300">الفرع</th>
              <th className="p-2 font-bold border border-slate-300">تسلسل</th>
            </tr>
          </thead>
          <tbody className={`text-md ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>
            {isLoading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-500">
                  جاري تحميل البيانات...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-500">
                  لا توجد بيانات لعرضها في هذه الفترة.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id} className={`${theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-100 hover:bg-slate-50'} border-b transition-colors`}>
                  <td className={`p-3 font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-950'} border border-slate-300`}>{record.total.toFixed(2)}</td>
                  <td className="p-3 border border-slate-300">{record.quantity}</td>
                  <td className="p-3 border border-slate-300">{record.unit_price.toFixed(2)}</td>
                  <td className="p-3 border border-slate-300">{record.unit}</td>
                  <td className="p-3 font-bold border border-slate-300">{record.drug_name}</td>
                  <td className="p-3 border border-slate-300">{new Date(record.ticket_date).toLocaleDateString('en-GB')}</td>
                  <td className="p-3 border border-slate-300">{record.clinic_name}</td>
                  <td className="p-3 border border-slate-300">{record.branch}</td>
                  <td className="p-3 font-mono text-slate-600 border border-slate-300">#{record.id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* PDF Footer */}
        <div 
          className="mt-12 pt-4 border-t border-slate-300 flex justify-between items-center text-xs text-slate-500" 
          style={{ display: isExportingPDF ? 'flex' : 'none' }} 
          dir="rtl"
        >
          <div>
            <span className="font-bold">{clinicName || 'النظام الطبي'}</span>
            <span className="mx-2">|</span>
            <span>تاريخ الإصدار: {new Date().toLocaleDateString('en-GB')}</span>
          </div>
          <div className="text-[10px] text-slate-400">
            مستخرج بواسطة برنامج مخزني بواسطة خليك رقمي
          </div>
        </div>
      </div>
    </div>
  );
}
