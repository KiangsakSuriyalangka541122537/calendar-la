
import { Department, Employee, LeaveType, LeaveRecord } from './types';

// Cleared for production usage - No mock employees
export const INITIAL_EMPLOYEES: Employee[] = [];

// Cleared for production usage - No mock leaves
export const INITIAL_LEAVES: LeaveRecord[] = [];

export const DEPARTMENTS = [
  { id: Department.OPD, label: Department.OPD, icon: 'Users', color: 'bg-blue-700' },
  { id: Department.IPD, label: Department.IPD, icon: 'Activity', color: 'bg-emerald-700' },
  { id: Department.DATA_CENTER, label: Department.DATA_CENTER, icon: 'Database', color: 'bg-indigo-700' },
];

export const DEPARTMENT_PASSWORDS: Record<string, string> = {
  [Department.OPD]: '1048',
  [Department.IPD]: '1033',
  [Department.DATA_CENTER]: '1187'
};

// Fixed Holidays (Date doesn't change)
// EXCLUDED: Labor Day (May 1), Teachers' Day (Jan 16) as they are working days for Gov/MOPH.
const FIXED_HOLIDAYS: Record<string, string> = {
    '01-01': 'วันขึ้นปีใหม่',
    '04-06': 'วันจักรี',
    '04-13': 'วันสงกรานต์',
    '04-14': 'วันสงกรานต์',
    '04-15': 'วันสงกรานต์',
    '05-04': 'วันฉัตรมงคล',
    '06-03': 'วันเฉลิมฯ พระราชินี',
    '07-28': 'วันเฉลิมฯ ร.10',
    '08-12': 'วันแม่แห่งชาติ',
    '10-13': 'วันคล้ายวันสวรรคต ร.9',
    '10-23': 'วันปิยมหาราช',
    '12-05': 'วันพ่อแห่งชาติ',
    '12-10': 'วันรัฐธรรมนูญ',
    '12-31': 'วันสิ้นปี'
};

// Year 2025 (2568)
const HOLIDAYS_2025: Record<string, string> = {
    ...FIXED_HOLIDAYS,
    '02-12': 'วันมาฆบูชา',
    '04-07': 'ชดเชยวันจักรี',
    '05-05': 'ชดเชยวันฉัตรมงคล',
    '05-11': 'วันวิสาขบูชา',
    '05-12': 'ชดเชยวันวิสาขบูชา',
    '06-02': 'วันหยุดพิเศษ (ราชการ)',
    '07-10': 'วันอาสาฬหบูชา',
    '07-11': 'วันเข้าพรรษา',
    '08-11': 'วันหยุดพิเศษ (ราชการ)',
};

// Year 2026 (2569)
const HOLIDAYS_2026: Record<string, string> = {
    ...FIXED_HOLIDAYS,
    '03-03': 'วันมาฆบูชา',
    '05-31': 'วันวิสาขบูชา',
    '06-01': 'ชดเชยวันวิสาขบูชา', 
    '07-29': 'วันอาสาฬหบูชา',
    '07-30': 'วันเข้าพรรษา',
    '12-07': 'ชดเชยวันพ่อแห่งชาติ',
};

// Year 2027 (2570)
const HOLIDAYS_2027: Record<string, string> = {
    ...FIXED_HOLIDAYS,
    '02-21': 'วันมาฆบูชา',
    '02-22': 'ชดเชยวันมาฆบูชา',
    '05-20': 'วันวิสาขบูชา',
    '07-17': 'วันอาสาฬหบูชา',
    '07-18': 'วันเข้าพรรษา',
    '07-19': 'ชดเชยวันเข้าพรรษา',
    '10-25': 'ชดเชยวันปิยมหาราช',
    '12-06': 'ชดเชยวันพ่อแห่งชาติ',
};

export const getHolidayName = (date: Date): string | null => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const dateKey = `${month}-${day}`;

    // Select the correct year configuration
    if (year === 2025) return HOLIDAYS_2025[dateKey] || null;
    if (year === 2026) return HOLIDAYS_2026[dateKey] || null;
    if (year === 2027) return HOLIDAYS_2027[dateKey] || null;
    
    // Fallback for other years (Uses Fixed only, might miss Lunar holidays)
    return FIXED_HOLIDAYS[dateKey] || null;
};
