
import React, { useMemo } from 'react';
import { LeaveRecord, LeaveType } from '../types';
import { getHolidayName } from '../constants';

interface StatsChartProps {
  leaves: LeaveRecord[];
  currentYear: number;
}

const StatsChart: React.FC<StatsChartProps> = ({ leaves, currentYear }) => {
  const data = useMemo(() => {
    const yearLeaves = leaves.filter(l => new Date(l.date).getFullYear() === currentYear);
    const counts = {
      [LeaveType.PERSONAL]: { p1: 0, p2: 0 },
      [LeaveType.MATERNITY]: { p1: 0, p2: 0 },
      [LeaveType.SICK]: { p1: 0, p2: 0 },
      [LeaveType.VACATION]: { p1: 0, p2: 0 },
      [LeaveType.ORDINATION]: { p1: 0, p2: 0 }
    };

    yearLeaves.forEach(leave => {
      const dateObj = new Date(leave.date);
      // STRICT FILTER: Only count Working Days
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = !!getHolidayName(dateObj);

      if (!isWeekend && !isHoliday) {
          const month = dateObj.getMonth();
          const duration = leave.duration || 1;
          if (month <= 4) counts[leave.type].p1 += duration;
          else counts[leave.type].p2 += duration;
      }
    });

    const order = [LeaveType.PERSONAL, LeaveType.MATERNITY, LeaveType.SICK, LeaveType.VACATION, LeaveType.ORDINATION];
    return order.map(type => ({ name: type, p1: counts[type].p1, p2: counts[type].p2 }));
  }, [leaves, currentYear]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-100 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[280px]">
          <thead className="bg-slate-50 text-slate-400 border-b border-slate-100">
            <tr>
              <th scope="col" className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider w-[40%]">ประเภทลา</th>
              <th scope="col" className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider border-l border-slate-100">ม.ค.-พ.ค.</th>
              <th scope="col" className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-wider border-l border-slate-100">มิ.ย.-ธ.ค.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-3 py-2.5 text-xs font-bold text-slate-700">{row.name}</td>
                <td className="px-2 py-2.5 text-center text-xs font-bold text-blue-600 border-l border-slate-50">{row.p1}</td>
                <td className="px-2 py-2.5 text-center text-xs font-bold text-blue-600 border-l border-slate-50">{row.p2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StatsChart;
