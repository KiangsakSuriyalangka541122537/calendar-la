
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Info, Calendar as CalendarIcon } from 'lucide-react';
import { LeaveRecord, LeaveType, LEAVE_COLORS, Employee } from '../types';
import { getHolidayName } from '../constants';

interface CalendarViewProps {
  leaves: LeaveRecord[];
  onDateClick: (dateStr: string) => void;
  onLeaveClick: (leaveId: string, date: string, type: LeaveType) => void;
  selectedEmployeeId: string | null;
  employees: Employee[];
  currentDate: Date;
  onMonthChange: (date: Date) => void;
}

interface DailyLeave {
    id: string;
    employeeId: string;
    name: string;
    type: LeaveType;
    isSelected: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  leaves, 
  onDateClick, 
  onLeaveClick, 
  selectedEmployeeId, 
  employees,
  currentDate,
  onMonthChange
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => onMonthChange(new Date(year, month - 1, 1));
  const nextMonth = () => onMonthChange(new Date(year, month + 1, 1));

  const leavesMap = useMemo(() => {
    const map: Record<string, DailyLeave[]> = {};
    leaves.forEach(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      if (!emp) return;

      if (!map[l.date]) map[l.date] = [];
      map[l.date].push({
          id: l.id,
          employeeId: l.employeeId,
          name: emp.name.split(' ')[0],
          type: l.type,
          isSelected: selectedEmployeeId === l.employeeId
      });
    });
    return map;
  }, [leaves, selectedEmployeeId, employees]);

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[80px] md:min-h-0 h-full bg-slate-50/50 border-r border-b border-slate-100"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayStr = i.toString().padStart(2, '0');
      const monthStr = (month + 1).toString().padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      
      const currentDayDate = new Date(year, month, i);
      const dailyLeaves = leavesMap[dateStr] || [];
      
      const isToday = new Date().toDateString() === currentDayDate.toDateString();
      const isWeekend = currentDayDate.getDay() === 0 || currentDayDate.getDay() === 6;
      const holidayName = getHolidayName(currentDayDate);
      const isHoliday = !!holidayName;
      const isNonWorkingDay = isWeekend || isHoliday;

      // Check if selected employee has a leave on this day
      const userExistingLeave = selectedEmployeeId 
        ? dailyLeaves.find(l => l.employeeId === selectedEmployeeId) 
        : null;

      days.push(
        <div 
          key={i} 
          onClick={() => { 
              if (isNonWorkingDay || !selectedEmployeeId) return;
              
              if (userExistingLeave) {
                  // If user has leave, open Edit/Delete modal
                  onLeaveClick(userExistingLeave.id, dateStr, userExistingLeave.type);
              } else {
                  // If no leave, open Create modal
                  onDateClick(dateStr); 
              }
          }}
          className={`min-h-[80px] md:min-h-0 h-full border-r border-b border-slate-100 p-1 md:p-2 relative transition-all duration-150 group flex flex-col
            ${isHoliday ? 'bg-red-50/30' : isWeekend ? 'bg-slate-50/50' : 'bg-white'}
            ${selectedEmployeeId && !isNonWorkingDay ? 'cursor-pointer hover:bg-white hover:shadow-md hover:z-10' : ''}
            ${isToday ? '!bg-blue-50/50 ring-1 ring-inset ring-blue-100' : ''}
          `}
        >
          <div className="flex justify-between items-start mb-0.5 md:mb-1 shrink-0">
            <span className={`
                text-[11px] md:text-sm font-bold h-6 w-6 md:h-7 md:w-7 flex items-center justify-center rounded-full
                ${isToday ? 'bg-blue-600 text-white shadow-sm' : isHoliday ? 'text-red-500' : isNonWorkingDay ? 'text-slate-400' : 'text-slate-700'}
            `}>
              {i}
            </span>
          </div>
          
          {holidayName && (
             <div className="mb-0.5 md:mb-1 shrink-0">
                <span className="text-[9px] md:text-[10px] leading-tight text-red-600 font-bold px-1 py-0.5 rounded bg-red-50 border border-red-100 block w-fit max-w-full truncate">
                    {holidayName}
                </span>
             </div>
          )}
          
          <div className="flex flex-col gap-0.5 md:gap-1 overflow-y-auto custom-scrollbar relative z-10 flex-1 min-h-0">
            {dailyLeaves.map((leave, idx) => {
                const isSelectionActive = !!selectedEmployeeId;
                const isSelf = leave.isSelected;
                let colorClass = LEAVE_COLORS[leave.type];
                let styleClass = '';

                if (isSelectionActive) {
                    if (isSelf) {
                        colorClass = colorClass.replace('600', '700').replace('500', '600');
                        styleClass = 'font-bold z-20 cursor-pointer scale-[1.02] shadow-sm ring-1 ring-white';
                    } else {
                        styleClass = 'opacity-20 grayscale z-0 pointer-events-none';
                    }
                } else {
                    styleClass = 'opacity-90';
                }

                return (
                    <div 
                        key={idx}
                        // Stop propagation is still useful if clicking specific pill, 
                        // though parent handler now covers it for isSelf.
                        onClick={(e) => { 
                            if (isSelf) { 
                                e.stopPropagation(); 
                                onLeaveClick(leave.id, dateStr, leave.type); 
                            } 
                        }}
                        className={`px-1 py-0.5 rounded text-[9px] md:text-[10px] text-white truncate transition-all ${colorClass} ${styleClass}`}
                    >
                        {leave.name}
                    </div>
                );
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

  return (
    <div className="bg-white h-full flex flex-col">
      <div className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-between border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2 md:gap-3">
             <div className="hidden md:block bg-slate-50 border border-slate-100 p-2 rounded-lg">
                 <CalendarIcon className="w-5 h-5 text-slate-500" />
             </div>
             <div>
                <h2 className="text-base md:text-xl font-bold text-slate-900 flex items-baseline gap-1.5">
                {thaiMonths[month]} <span className="text-slate-300 font-light text-sm">|</span> {year + 543}
                </h2>
                <p className="hidden md:block text-[10px] text-slate-400 font-bold mt-0.5">เลือกบุคลากรเพื่อบันทึกการลาในปฏิทิน</p>
             </div>
        </div>
        
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg p-1">
            <button onClick={prevMonth} className="p-2 md:p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all">
            <ChevronLeft className="w-5 h-5 md:w-5 md:h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 md:p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all">
            <ChevronRight className="w-5 h-5 md:w-5 md:h-5" />
            </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
        {['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'].map((d, i) => (
          <div key={i} className={`py-2 md:py-3 text-center text-[10px] md:text-xs font-bold border-r border-slate-100 last:border-r-0 ${i === 0 || i === 6 ? 'text-red-500' : 'text-slate-500'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-100 gap-px border-b border-slate-100">
        {renderDays()}
      </div>
      
      {!selectedEmployeeId && (
        <div className="p-2 md:p-3 bg-slate-50 border-t border-slate-100 text-slate-400 text-[10px] md:text-xs flex items-center justify-center gap-2 font-bold italic">
            <Info className="w-3.5 h-3.5"/> 
            <span>แสดงข้อมูลวันลาของบุคลากรทั้งแผนก</span>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
