export enum Department {
  OPD = 'เวชระเบียนผู้ป่วยนอก',
  IPD = 'เวชระเบียนผู้ป่วยใน',
  DATA_CENTER = 'ศูนย์ข้อมูล'
}

export enum LeaveType {
  PERSONAL = 'ลากิจส่วนตัว',
  SICK = 'ลาป่วย',
  VACATION = 'ลาพักผ่อน',
  MATERNITY = 'ลาคลอดบุตร',
  ORDINATION = 'ลาอุปสมบท'
}

export interface Employee {
  id: string;
  name: string;
  position: string; // Added position field
  department: Department;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  date: string; // ISO String YYYY-MM-DD
  type: LeaveType;
  note?: string;
}

export const LEAVE_COLORS: Record<LeaveType, string> = {
  [LeaveType.PERSONAL]: 'bg-blue-600',
  [LeaveType.SICK]: 'bg-red-600',
  [LeaveType.VACATION]: 'bg-emerald-600',
  [LeaveType.MATERNITY]: 'bg-pink-600',
  [LeaveType.ORDINATION]: 'bg-amber-500'
};

export const LEAVE_TEXT_COLORS: Record<LeaveType, string> = {
  [LeaveType.PERSONAL]: 'text-blue-700',
  [LeaveType.SICK]: 'text-red-700',
  [LeaveType.VACATION]: 'text-emerald-700',
  [LeaveType.MATERNITY]: 'text-pink-700',
  [LeaveType.ORDINATION]: 'text-amber-700'
};