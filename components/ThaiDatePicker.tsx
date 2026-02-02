
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface ThaiDatePickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
}

const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) setViewDate(date);
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const year = viewDate.getFullYear();
    const month = (viewDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium bg-slate-50 text-slate-900 cursor-pointer flex items-center justify-between hover:border-blue-500 hover:bg-white transition-all shadow-sm"
      >
        <span className={!value ? "text-slate-400" : ""}>
            {value ? formatDateDisplay(value) : "เลือกวันที่..."}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="fixed md:absolute top-1/2 left-1/2 md:top-full md:left-0 -translate-x-1/2 -translate-y-1/2 md:translate-x-0 md:translate-y-0 z-[100] mt-0 md:mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 p-4 w-[280px] animate-in fade-in zoom-in-95 duration-150">
          <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"><ChevronLeft className="w-5 h-5" /></button>
            <span className="font-bold text-slate-800 text-sm">
              {thaiMonths[viewDate.getMonth()]} {viewDate.getFullYear() + 543}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] mb-2 text-slate-400 font-bold uppercase tracking-widest">
            {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const currentStr = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const isSelected = value === currentStr;
              const today = new Date();
              const isToday = today.getDate() === day && today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear();
              
              return (
                <button
                  key={day}
                  onClick={(e) => { e.stopPropagation(); handleDateSelect(day); }}
                  className={`
                    h-8 w-8 rounded-lg flex items-center justify-center text-xs transition-all
                    ${isSelected ? 'bg-blue-600 text-white font-bold shadow-md scale-105' : 'hover:bg-blue-50 text-slate-700 hover:text-blue-600'}
                    ${!isSelected && isToday ? 'border border-blue-600 text-blue-600 font-bold' : ''}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThaiDatePicker;
