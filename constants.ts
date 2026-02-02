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

// Thai Public Holidays (Fixed dates for example + 2025 variable dates)
export const PUBLIC_HOLIDAYS: Record<string, string> = {
    '01-01': 'วันขึ้นปีใหม่',
    '02-12': 'วันมาฆบูชา',
    '04-06': 'วันจักรี',
    '04-13': 'วันสงกรานต์',
    '04-14': 'วันสงกรานต์',
    '04-15': 'วันสงกรานต์',
    '05-01': 'วันแรงงาน',
    '05-04': 'วันฉัตรมงคล',
    '05-11': 'วันวิสาขบูชา',
    '06-03': 'วันเฉลิมฯ พระราชินี',
    '07-10': 'วันอาสาฬหบูชา',
    '07-11': 'วันเข้าพรรษา',
    '07-28': 'วันเฉลิมฯ ร.10',
    '08-12': 'วันแม่แห่งชาติ',
    '10-13': 'วันคล้ายวันสวรรคต ร.9',
    '10-23': 'วันปิยมหาราช',
    '12-05': 'วันพ่อแห่งชาติ',
    '12-10': 'วันรัฐธรรมนูญ',
    '12-31': 'วันสิ้นปี'
};

export const getHolidayName = (date: Date): string | null => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return PUBLIC_HOLIDAYS[`${month}-${day}`] || null;
};