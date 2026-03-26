
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, Activity, Database, Search, Calendar as CalendarIcon, 
  ArrowLeft, CheckCircle2, LayoutDashboard, ChevronRight, ChevronLeft, UserPlus, X,
  Trash2, Save, AlertTriangle, Loader2, User,
  Pencil, Undo2, Edit3, RefreshCw, History, Lock, HelpCircle
} from 'lucide-react';
import { Department, Employee, LeaveRecord, LeaveType, LEAVE_COLORS, CancelledLeave } from './types';
import { INITIAL_EMPLOYEES, INITIAL_LEAVES, DEPARTMENTS, getHolidayName, DEPARTMENT_PASSWORDS } from './constants';
import CalendarView from './components/CalendarView';
import StatsChart from './components/StatsChart';
import ThaiDatePicker from './components/ThaiDatePicker';
import { supabase } from './lib/supabaseClient';

// Define interface for batch delete/edit state
interface BatchLeaveState {
  ids: string[];
  startDate: string;
  endDate: string;
  type: LeaveType;
  totalDays: number;
}

function App() {
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [leaves, setLeaves] = useState<LeaveRecord[]>(INITIAL_LEAVES);
  const [cancelledLeaves, setCancelledLeaves] = useState<CancelledLeave[]>([]);
  const [viewMode, setViewMode] = useState<'calendar' | 'history'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState<string>('');
  const [leaveEndDate, setLeaveEndDate] = useState<string>('');
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.PERSONAL);
  const [leaveDuration, setLeaveDuration] = useState<number>(1);
  
  const [isManageUserModalOpen, setIsManageUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '' });
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for Statistics Year
  const [statsYear, setStatsYear] = useState(new Date().getFullYear());
  
  const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, id: string | null, name: string}>({
    isOpen: false, id: null, name: ''
  });

  // State for Editing an existing leave (Change Type)
  const [editingLeaveBatch, setEditingLeaveBatch] = useState<BatchLeaveState | null>(null);

  // State for Deleting Confirmation
  const [leaveToDelete, setLeaveToDelete] = useState<BatchLeaveState | null>(null);
  
  // Password Protection State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingDepartment, setPendingDepartment] = useState<Department | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const fetchAndSetData = async (isShowAlert = false) => {
    setIsSyncing(true);
    try {
      // Fetch Employees
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      
      if (empError) throw empError;

      // Fetch Leaves
      const { data: leaveData, error: leaveError } = await supabase
        .from('leaves')
        .select('*');

      if (leaveError) throw leaveError;

      // Fetch Cancelled Leaves (Optional - don't let it block main data if table doesn't exist yet)
      let processedCancelled: CancelledLeave[] = [];
      try {
        const { data: cancelledData, error: cancelledError } = await supabase
          .from('cancelled_leaves')
          .select('*')
          .order('cancelled_at', { ascending: false });

        if (!cancelledError && cancelledData) {
          processedCancelled = cancelledData.map((l: any) => ({
            id: l.id,
            cancelledAt: l.cancelled_at,
            employeeId: l.employee_id,
            employeeName: l.employee_name,
            leaveDate: l.leave_date,
            leaveType: l.leave_type as LeaveType,
            duration: Number(l.duration || 1),
            department: l.department
          }));
        }
      } catch (e) {
        console.warn("Cancelled leaves table might not exist yet:", e);
      }
      
      const fetchedEmployees: Employee[] = (empData || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        department: (e.department || '').trim() as Department
      }));

      const processedLeaves: LeaveRecord[] = (leaveData || []).map((l: any) => ({
        id: l.id,
        employeeId: l.employee_id,
        date: l.date,
        type: l.type as LeaveType,
        duration: Number(l.duration || 1)
      }));
      
      setEmployees(fetchedEmployees);
      setLeaves(processedLeaves);
      setCancelledLeaves(processedCancelled);
      
      console.log(`Loaded ${fetchedEmployees.length} employees and ${processedLeaves.length} leaves`);
      
      if (isShowAlert) alert(`✅ ซิงค์ข้อมูลสำเร็จ! (พบรายชื่อ ${fetchedEmployees.length} คน)`);

    } catch (error: any) {
      console.error("Error loading data:", error);
      let msg = error.message;
      
      // Handle Schema Cache Error specifically
      if (msg.includes('schema cache') || msg.includes('Could not find the table')) {
        msg = 'ระบบ Supabase กำลังรีเฟรชโครงสร้างตาราง กรุณารันไฟล์ "supabase_fix_cache.sql" ใน SQL Editor แล้วลองใหม่อีกครั้ง';
      }

      if (isShowAlert) alert('❌ เกิดข้อผิดพลาด: ' + msg);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchAndSetData(false);
  }, []);

  const departmentEmployees = useMemo(() => {
    if (!currentDepartment) return [];
    return employees.filter(emp => emp.department === currentDepartment);
  }, [currentDepartment, employees]);

  const filteredEmployees = useMemo(() => {
    if (!currentDepartment) return [];
    return employees.filter(emp => {
      const matchDept = emp.department === currentDepartment;
      const matchSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [currentDepartment, searchQuery, employees]);

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${parseInt(y) + 543}`;
  };

  const calculatedDatesToAdd = useMemo(() => {
    if (!leaveStartDate || !leaveEndDate) return [];
    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
    const dates: string[] = [];
    const loopDate = new Date(start);
    
    while (loopDate <= end) {
        const dateStr = loopDate.toISOString().split('T')[0];
        
        // Strict Logic: Exclude Weekends and Holidays automatically
        const dayOfWeek = loopDate.getDay(); // 0 = Sunday, 6 = Saturday (Local time)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Check Holiday
        const [y, m, d] = dateStr.split('-').map(Number);
        // Create date object for checking holiday (using local time components)
        const checkDate = new Date(y, m - 1, d); 
        const isHoliday = !!getHolidayName(checkDate);

        // Only add if it's a Working Day (Not Weekend AND Not Holiday)
        if (!isWeekend && !isHoliday) {
            dates.push(dateStr);
        }
        
        loopDate.setDate(loopDate.getDate() + 1);
    }
    return dates;
  }, [leaveStartDate, leaveEndDate]);

  const handleDepartmentSelect = (dept: Department) => {
    setPendingDepartment(dept);
    setPasswordInput('');
    setPasswordError(false);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingDepartment) return;

    if (passwordInput === DEPARTMENT_PASSWORDS[pendingDepartment]) {
      setCurrentDepartment(pendingDepartment);
      setSearchQuery('');
      setSelectedEmployee(null);
      setIsPasswordModalOpen(false);
      setPendingDepartment(null);
      setPasswordInput('');
      setPasswordError(false);
    } else {
      setPasswordError(true);
      // Shake effect or just error message
    }
  };

  const handleUserSelect = (emp: Employee) => {
    setSelectedEmployee(emp);
    setSearchQuery(emp.name);
  };

  const handleDateClick = (dateStr: string) => {
    if (!selectedEmployee) return;
    
    // Prevent clicking on weekends or holidays to start a leave
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const day = dateObj.getDay();
    const isHoliday = !!getHolidayName(dateObj);
    
    if (day === 0 || day === 6 || isHoliday) {
      alert("ไม่สามารถเลือกวันหยุดเสาร์-อาทิตย์ หรือวันหยุดนักขัตฤกษ์ได้");
      return;
    }

    setLeaveStartDate(dateStr);
    setLeaveEndDate(dateStr); 
    setLeaveType(LeaveType.PERSONAL); // Reset to default when opening new
    setLeaveDuration(1); // Reset to default full day
    setIsLeaveModalOpen(true);
  };

  const handleLeaveClick = (leaveId: string, date: string, type: LeaveType) => {
      // Find the specific clicked leave
      const clickedLeave = leaves.find(l => l.id === leaveId);
      if (!clickedLeave) return;

      // Smart Grouping Logic:
      // 1. Filter leaves by same employee and same type
      const relatedLeaves = leaves.filter(l => 
          l.employeeId === clickedLeave.employeeId && 
          l.type === clickedLeave.type
      ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 2. Group consecutive leaves (allowing small gaps for weekends/holidays, e.g., <= 4 days)
      const groups: LeaveRecord[][] = [];
      let currentGroup: LeaveRecord[] = [];

      relatedLeaves.forEach((l) => {
          if (currentGroup.length === 0) {
              currentGroup.push(l);
          } else {
              const [y1, m1, d1] = currentGroup[currentGroup.length - 1].date.split('-').map(Number);
              const lastDate = new Date(y1, m1 - 1, d1);
              
              const [y2, m2, d2] = l.date.split('-').map(Number);
              const currDate = new Date(y2, m2 - 1, d2);
              
              // Check if there are any working days (not weekend/holiday) between these two leave dates
              let hasWorkingDayBetween = false;
              const tempDate = new Date(lastDate);
              tempDate.setDate(tempDate.getDate() + 1);
              
              while (tempDate < currDate) {
                const day = tempDate.getDay();
                const isWeekend = day === 0 || day === 6;
                const isHoliday = !!getHolidayName(tempDate);
                if (!isWeekend && !isHoliday) {
                  hasWorkingDayBetween = true;
                  break;
                }
                tempDate.setDate(tempDate.getDate() + 1);
              }

              if (!hasWorkingDayBetween) {
                  currentGroup.push(l);
              } else {
                  groups.push(currentGroup);
                  currentGroup = [l];
              }
          }
      });
      if (currentGroup.length > 0) groups.push(currentGroup);

      // 3. Find which group the clicked ID belongs to
      const targetGroup = groups.find(g => g.some(l => l.id === leaveId)) || [clickedLeave];

      const batchData = { 
          ids: targetGroup.map(l => l.id), 
          startDate: targetGroup[0].date,
          endDate: targetGroup[targetGroup.length - 1].date,
          type: type,
          totalDays: targetGroup.length
      };

      // Open the Edit/Manage Modal instead of immediately Deleting
      setLeaveType(type); // Set the current type to state so radio button is checked
      setEditingLeaveBatch(batchData);
  };

  const handleUpdateLeaveType = async () => {
    if (!editingLeaveBatch || !selectedEmployee) return;

    // If type hasn't changed, just close
    if (leaveType === editingLeaveBatch.type) {
        setEditingLeaveBatch(null);
        return;
    }

    setIsSaving(true);
    try {
        const { error } = await supabase
            .from('leaves')
            .update({ type: leaveType })
            .in('id', editingLeaveBatch.ids);
        
        if (error) throw error;

        // Update local state
        setLeaves(prev => prev.map(l => 
            editingLeaveBatch.ids.includes(l.id) 
            ? { ...l, type: leaveType } 
            : l
        ));

        setEditingLeaveBatch(null);
    } catch (error: any) {
        console.error('Error updating leave:', error);
        alert('เกิดข้อผิดพลาดในการแก้ไข: ' + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleInitiateDelete = () => {
      if (editingLeaveBatch) {
          setLeaveToDelete(editingLeaveBatch);
          setEditingLeaveBatch(null);
      }
  };

  const handleConfirmDeleteLeave = async () => {
      if (!leaveToDelete || !selectedEmployee) return;
      setIsSaving(true);
      try {
        // Record cancellation history (Optional - don't block deletion if table doesn't exist)
        try {
          const cancellationInserts = leaveToDelete.ids.map(id => {
            const leave = leaves.find(l => l.id === id);
            return {
              employee_id: selectedEmployee.id,
              employee_name: selectedEmployee.name,
              leave_date: leave?.date || '',
              leave_type: leave?.type || leaveToDelete.type,
              duration: leave?.duration || 1,
              department: currentDepartment || ''
            };
          });

          await supabase
            .from('cancelled_leaves')
            .insert(cancellationInserts);
        } catch (e) {
          console.warn("Could not record cancellation history:", e);
        }

        // Delete multiple IDs
        const { error } = await supabase
          .from('leaves')
          .delete()
          .in('id', leaveToDelete.ids);

        if (error) throw error;

        // Filter out all deleted IDs from local state
        setLeaves(prev => prev.filter(l => !leaveToDelete.ids.includes(l.id)));
        
        // Refresh cancelled leaves (Optional)
        try {
          const { data: newCancelledData } = await supabase
            .from('cancelled_leaves')
            .select('*')
            .order('cancelled_at', { ascending: false });
          
          if (newCancelledData) {
            setCancelledLeaves(newCancelledData.map((l: any) => ({
              id: l.id,
              cancelledAt: l.cancelled_at,
              employeeId: l.employee_id,
              employeeName: l.employee_name,
              leaveDate: l.leave_date,
              leaveType: l.leave_type as LeaveType,
              duration: Number(l.duration || 1),
              department: l.department
            })));
          }
        } catch (e) {
          console.warn("Could not refresh cancelled leaves:", e);
        }

        setLeaveToDelete(null);
      } catch (error: any) {
        console.error('Error deleting leave:', error);
        alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
      } finally {
        setIsSaving(false);
      }
  };

  const handleSaveLeave = async () => {
    if (!selectedEmployee || calculatedDatesToAdd.length === 0) return;
    
    // Check for duplicate leaves on the same day for the selected employee
    const duplicateDate = calculatedDatesToAdd.find(dateToAdd => 
      leaves.some(l => l.employeeId === selectedEmployee.id && l.date === dateToAdd)
    );

    if (duplicateDate) {
      alert(`ไม่สามารถบันทึกได้: วันที่ ${formatDateDisplay(duplicateDate)} มีข้อมูลการลาอยู่แล้ว\n(บุคลากร 1 คน สามารถเลือกประเภทการลาได้เพียง 1 ประเภทต่อวัน)`);
      return;
    }

    setIsSaving(true);
    
    try {
      const inserts = calculatedDatesToAdd.map(date => ({
        employee_id: selectedEmployee.id,
        date: date,
        type: leaveType,
        duration: leaveDuration
      }));

      const { data, error } = await supabase
        .from('leaves')
        .insert(inserts)
        .select();

      if (error) throw error;

      if (data) {
        const newLeaves: LeaveRecord[] = data.map((l: any) => ({
          id: l.id,
          employeeId: l.employee_id,
          date: l.date,
          type: l.type as LeaveType,
          duration: Number(l.duration || 1)
        }));
        
        setLeaves(prev => [...prev, ...newLeaves]);
      }

      setIsLeaveModalOpen(false);
    } catch (error: any) {
      console.error('Error saving leave:', error);
      
      // Check for Foreign Key Violation (Stale Data)
      if (error.message?.includes('foreign key constraint') || error.code === '23503') {
         alert('⚠️ ข้อมูลไม่เป็นปัจจุบัน: รายชื่อบุคลากรนี้อาจถูกลบและสร้างใหม่แล้ว\nระบบจะรีเฟรชข้อมูลล่าสุดให้ กรุณาเลือกบุคลากรและทำรายการอีกครั้ง');
         setIsLeaveModalOpen(false);
         setSelectedEmployee(null);
         fetchAndSetData(false);
         return;
      }

      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (emp: Employee) => {
    setUserForm({ name: emp.name });
    setEditingEmployeeId(emp.id);
  };

  const handleCancelEdit = () => {
    setUserForm({ name: '' });
    setEditingEmployeeId(null);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !currentDepartment) return;

    // Normalize name (remove extra spaces) to ensure "Name  Surname" == "Name Surname"
    const normalizeName = (name: string) => name.replace(/\s+/g, ' ').trim();
    const normalizedInputName = normalizeName(userForm.name);
    
    // Check for Duplicate Name (Only check exact full name match)
    // Allows: Same Firstname (diff Lastname), Same Lastname (diff Firstname)
    // Blocks: Same Firstname AND Same Lastname
    const isDuplicate = employees.some(emp => 
      normalizeName(emp.name) === normalizedInputName && 
      emp.id !== editingEmployeeId 
    );

    if (isDuplicate) {
      alert(`ไม่สามารถบันทึกได้: พบรายชื่อ "${normalizedInputName}" ซ้ำกันในระบบ`);
      return;
    }

    setIsSaving(true);

    try {
      if (editingEmployeeId) {
          // Update existing
          // We only send 'name' now, position is removed
          const { error } = await supabase
            .from('employees')
            .update({ name: normalizedInputName })
            .eq('id', editingEmployeeId);
          
          if (error) throw error;

          // Update local state
          setEmployees(prev => prev.map(emp => 
              emp.id === editingEmployeeId 
                  ? { ...emp, name: normalizedInputName }
                  : emp
          ));
          
          // Also update selectedEmployee if it's the one being edited
          if (selectedEmployee?.id === editingEmployeeId) {
            setSelectedEmployee(prev => prev ? { ...prev, name: normalizedInputName } : null);
          }

          setEditingEmployeeId(null);
      } else {
          // Create new
          const { data, error } = await supabase
            .from('employees')
            .insert([{
              name: normalizedInputName,
              department: currentDepartment
            }])
            .select()
            .single();

          if (error) throw error;

          if (data) {
            const newEmp: Employee = {
                id: data.id,
                name: data.name,
                department: data.department as Department
            };
            setEmployees(prev => [newEmp, ...prev]);
          }
      }
      setUserForm({ name: '' });
    } catch (error: any) {
      console.error('Error saving user:', error);
      let msg = error.message;
      
      // Handle Schema Cache Error
      if (msg.includes('schema cache') || msg.includes('Could not find the table')) {
        msg = 'ระบบ Supabase กำลังรีเฟรชโครงสร้างตาราง กรุณารันไฟล์ "supabase_fix_cache.sql" แล้วลองใหม่';
      }
      // Handle Position Column Error (Legacy)
      else if (msg.includes('position') && msg.includes('not-null constraint')) {
        msg = 'โครงสร้างตารางไม่ถูกต้อง (มีคอลัมน์ position) กรุณารันไฟล์ "supabase_rls_fix.sql"';
      }

      alert('เกิดข้อผิดพลาดในการบันทึกบุคลากร: ' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const executeDeleteUser = async () => {
    if (deleteConfirm.id) {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('id', deleteConfirm.id);

        if (error) throw error;

        setEmployees(prev => prev.filter(emp => emp.id !== deleteConfirm.id));
        if (selectedEmployee?.id === deleteConfirm.id) {
          setSelectedEmployee(null);
          setSearchQuery('');
        }
      } catch (error: any) {
        console.error('Error deleting user:', error);
        alert('เกิดข้อผิดพลาดในการลบบุคลากร: ' + error.message);
      } finally {
        setIsSaving(false);
        setDeleteConfirm({ isOpen: false, id: null, name: '' });
      }
    }
  };

  if (!currentDepartment) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-6">
        <div className="text-center mb-10 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
             ระบบจัด<span className="text-blue-700">วันลา</span>ออนไลน์
          </h1>
          <p className="text-slate-600 text-sm md:text-lg max-w-2xl mx-auto font-medium px-4">
            กรุณาเลือกหน่วยงานของท่านเพื่อเข้าสู่ระบบ
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl w-full px-4">
          {DEPARTMENTS.map((dept) => {
            const Icon = dept.icon === 'Users' ? Users : dept.icon === 'Activity' ? Activity : Database;
            return (
              <button key={dept.id} onClick={() => handleDepartmentSelect(dept.id as Department)} className="group relative bg-white rounded-xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 hover:border-blue-500 text-left">
                <div className={`absolute top-0 left-0 w-1 h-full ${dept.color} transition-all duration-200 group-hover:w-2 rounded-l-xl`}></div>
                <div className="flex flex-col h-full justify-between gap-4 md:gap-6">
                  <div className="bg-slate-50 p-3 w-fit rounded-lg border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    <Icon className="w-6 h-6 text-slate-700 group-hover:text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-1">{dept.label}</h3>
                    <div className="flex items-center text-slate-500 text-xs font-bold gap-1 group-hover:text-blue-700">
                      <span>คลิกเพื่อเข้าสู่แผนก</span><ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        <button 
          onClick={() => setIsHelpModalOpen(true)}
          className="mt-12 flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-slate-600 font-bold text-sm group"
        >
          <HelpCircle className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
          <span>วิธีการใช้งานระบบ</span>
        </button>
        
        {/* Password Modal for Department Selection */}
        {isPasswordModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-600" /> ยืนยันรหัสผ่าน
                </h3>
                <button 
                  onClick={() => setIsPasswordModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handlePasswordSubmit} className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100">
                    <Lock className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">{pendingDepartment}</h4>
                  <p className="text-xs text-slate-500 font-medium">กรุณาใส่รหัสผ่านเพื่อเข้าสู่ระบบแผนก</p>
                </div>
                
                <div className="mb-6">
                  <input 
                    type="password" 
                    autoFocus
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none text-center text-2xl tracking-[0.5em] font-bold transition-all ${passwordError ? 'border-red-500 bg-red-50 text-red-600 animate-shake' : 'border-slate-200 focus:border-blue-500 focus:bg-white'}`}
                    placeholder="••••"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                  />
                  {passwordError && (
                    <p className="text-center text-red-500 text-xs font-bold mt-2 flex items-center justify-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> รหัสผ่านไม่ถูกต้อง
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    type="submit"
                    className="w-full py-3.5 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                  >
                    เข้าสู่ระบบ
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="w-full py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setCurrentDepartment(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
                <h1 className="text-base md:text-xl font-bold text-slate-900 leading-tight">{currentDepartment}</h1>
                <span className="text-[10px] md:text-xs text-slate-500 font-bold mt-0.5 flex items-center gap-1">
                   HR Management
                   {(isSaving || isSyncing) && <Loader2 className="w-3 h-3 animate-spin text-blue-700" />}
                </span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
               {Object.entries(LEAVE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 mr-4 last:mr-0">
                  <div className={`w-2 h-2 rounded-full ${color}`}></div>
                  <span className="text-[11px] text-slate-600 font-bold">{type}</span>
                </div>
              ))}
             </div>
             <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <CalendarIcon className="w-4 h-4" /> ปฏิทิน
                </button>
                <button 
                  onClick={() => setViewMode('history')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'history' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <History className="w-4 h-4" /> ประวัติยกเลิก
                </button>
             </div>
             <button onClick={() => fetchAndSetData(true)} className="p-2 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-full transition-all" title="รีเฟรชข้อมูล">
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin text-blue-700' : ''}`} />
             </button>
             <button 
               onClick={() => setIsHelpModalOpen(true)} 
               className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-full transition-all" 
               title="วิธีการใช้งาน"
             >
                <HelpCircle className="w-5 h-5" />
                <span className="text-xs font-bold hidden md:inline">วิธีใช้งาน</span>
             </button>
             <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-sm">
               <Users className="w-4 h-4 md:w-5 md:h-5" />
             </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 space-y-4 md:space-y-6 lg:sticky lg:top-24">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                   <Users className="w-4 h-4 text-slate-500" />บุคลากร
                </h2>
                <button onClick={() => setIsManageUserModalOpen(true)} className="text-[10px] md:text-xs flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded-md text-slate-700 hover:border-blue-500 hover:text-blue-700 transition-all font-bold">
                    <UserPlus className="w-3 h-3" />จัดการ
                </button>
             </div>
             <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm font-medium text-slate-900 focus:border-blue-500 focus:bg-white transition-all" 
                    placeholder="ค้นหาชื่อบุคลากร..." 
                    value={searchQuery} 
                    onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        // If user starts typing something else or clears the input, 
                        // reset selection to show search results dropdown
                        if (val === '' || (selectedEmployee && val !== selectedEmployee.name)) {
                            setSelectedEmployee(null);
                        }
                    }} 
                  />
                  {searchQuery && !selectedEmployee && filteredEmployees.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto z-50">
                      {filteredEmployees.map(emp => (
                        <button key={emp.id} onClick={() => handleUserSelect(emp)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50 last:border-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                             <User className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-slate-900 text-sm font-normal truncate">{emp.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedEmployee ? (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                         <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-lg shadow-sm">
                               <User className="w-5 h-5" />
                            </div>
                            <div className="truncate">
                              <h3 className="font-normal text-slate-900 text-sm truncate">{selectedEmployee.name}</h3>
                            </div>
                         </div>
                         <CheckCircle2 className="text-blue-600 w-4 h-4" />
                      </div>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 border-2 border-dashed border-slate-100 rounded-xl">
                    <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-bold italic">เลือกบุคลากรเพื่อดูสถิติ</p>
                  </div>
                )}
             </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
               <h2 className="text-slate-900 font-bold text-xs uppercase tracking-wider">สถิติปี</h2>
               <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                  <button onClick={() => setStatsYear(y => y - 1)} className="p-1 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-700 transition-colors">
                     <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-blue-700 px-1 min-w-[36px] text-center">{statsYear + 543}</span>
                  <button onClick={() => setStatsYear(y => y + 1)} className="p-1 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-700 transition-colors">
                     <ChevronRight className="w-4 h-4" />
                  </button>
               </div>
             </div>
             <div className="p-2 md:p-4">
               <StatsChart leaves={selectedEmployee ? leaves.filter(l => l.employeeId === selectedEmployee.id) : []} currentYear={statsYear} />
             </div>
          </div>
        </aside>

        <section className="lg:col-span-9 h-full">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[580px] md:h-[780px] flex flex-col">
                {viewMode === 'calendar' ? (
                  <CalendarView 
                    leaves={leaves} 
                    employees={departmentEmployees} 
                    selectedEmployeeId={selectedEmployee?.id || null} 
                    onDateClick={handleDateClick} 
                    onLeaveClick={handleLeaveClick}
                    currentDate={currentDate}
                    onMonthChange={setCurrentDate}
                  />
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                          <History className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">ประวัติการยกเลิกการลา</h2>
                          <p className="text-xs text-slate-500 font-bold">
                            ประจำเดือน {["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"][currentDate.getMonth()]} {currentDate.getFullYear() + 543}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg p-1">
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all">
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-600 transition-all">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="space-y-4">
                        {cancelledLeaves
                          .filter(l => {
                            const d = new Date(l.leaveDate);
                            return d.getMonth() === currentDate.getMonth() && 
                                   d.getFullYear() === currentDate.getFullYear() &&
                                   l.department === currentDepartment;
                          })
                          .length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                              <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                              <p className="text-slate-400 font-bold">ไม่พบประวัติการยกเลิกในเดือนนี้</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {cancelledLeaves
                                .filter(l => {
                                  const d = new Date(l.leaveDate);
                                  return d.getMonth() === currentDate.getMonth() && 
                                         d.getFullYear() === currentDate.getFullYear() &&
                                         l.department === currentDepartment;
                                })
                                .map(l => (
                                  <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-red-200 hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                        <User className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-slate-900 text-sm">{l.employeeName}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${LEAVE_COLORS[l.leaveType]}`}>
                                            {l.leaveType} {l.duration === 0.5 && '(ครึ่งวัน)'}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-bold">
                                            วันที่ลา: {formatDateDisplay(l.leaveDate)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ยกเลิกเมื่อ</p>
                                      <p className="text-xs font-bold text-red-600 mt-0.5">
                                        {new Date(l.cancelledAt).toLocaleString('th-TH', { 
                                          day: '2-digit', 
                                          month: '2-digit', 
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}
            </div>
        </section>
      </main>

      {/* Create Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
                <h3 className="font-bold text-slate-900">บันทึกการลา</h3>
                <button onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <ThaiDatePicker label="ตั้งแต่วันที่" value={leaveStartDate} onChange={setLeaveStartDate} />
                    <ThaiDatePicker label="ถึงวันที่" value={leaveEndDate} onChange={setLeaveEndDate} />
                </div>
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">รวมระยะเวลา</span>
                    <span className="text-[10px] text-slate-400 font-normal">(เฉพาะวันทำการ)</span>
                  </div>
                  <span className="text-2xl font-black text-blue-900">{calculatedDatesToAdd.length * leaveDuration} วัน</span>
                </div>

                {/* Duration Toggle (Full Day / Half Day) - Only for Personal, Sick, Vacation */}
                {[LeaveType.PERSONAL, LeaveType.SICK, LeaveType.VACATION].includes(leaveType) && (
                  <div className="mb-6">
                    <label className="text-xs font-bold text-slate-500 mb-3 block uppercase tracking-wider">รูปแบบการลา</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => setLeaveDuration(1)} 
                        className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${leaveDuration === 1 ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                      >
                        เต็มวัน (1.0)
                      </button>
                      <button 
                        onClick={() => setLeaveDuration(0.5)} 
                        className={`py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${leaveDuration === 0.5 ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                      >
                        ครึ่งวัน (0.5)
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-2 mb-6 max-h-60 overflow-y-auto pr-1">
                {Object.values(LeaveType).map((type) => (
                    <button key={type} onClick={() => setLeaveType(type)} className={`w-full px-4 py-3 rounded-xl border-2 text-sm flex items-center justify-between transition-all ${leaveType === type ? `border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-sm` : 'border-slate-100 text-slate-600 font-medium hover:border-slate-300'}`}>
                      <span>{type}</span>
                      {leaveType === type && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>
                ))}
                </div>
                <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <button onClick={() => setIsLeaveModalOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors order-2 md:order-1">ยกเลิก</button>
                    <button onClick={handleSaveLeave} disabled={isSaving || calculatedDatesToAdd.length === 0} className="flex-1 py-3 rounded-xl bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-blue-800 shadow-lg shadow-blue-200 transition-all order-1 md:order-2">
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} บันทึกการลา
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Update Leave Modal */}
      {editingLeaveBatch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl">
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><Edit3 className="w-4 h-4 text-blue-600"/> จัดการการลา</h3>
                <button onClick={() => setEditingLeaveBatch(null)} className="text-slate-400 hover:text-slate-900 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 opacity-70 pointer-events-none grayscale">
                   {/* Reuse Date Picker but disabled for display consistency */}
                    <div className="relative w-full">
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">ตั้งแต่วันที่</label>
                      <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium bg-slate-100 text-slate-700">{formatDateDisplay(editingLeaveBatch.startDate)}</div>
                    </div>
                    <div className="relative w-full">
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">ถึงวันที่</label>
                      <div className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium bg-slate-100 text-slate-700">{formatDateDisplay(editingLeaveBatch.endDate)}</div>
                    </div>
                </div>
                <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">รวมระยะเวลา</span>
                    <span className="text-[10px] text-slate-400 font-normal">(แก้ไขประเภทการลา)</span>
                  </div>
                  <span className="text-2xl font-black text-amber-900">{editingLeaveBatch.totalDays} วัน</span>
                </div>
                <div className="grid grid-cols-1 gap-2 mb-6 max-h-60 overflow-y-auto pr-1">
                {Object.values(LeaveType).map((type) => (
                    <button key={type} onClick={() => setLeaveType(type)} className={`w-full px-4 py-3 rounded-xl border-2 text-sm flex items-center justify-between transition-all ${leaveType === type ? `border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-sm` : 'border-slate-100 text-slate-600 font-medium hover:border-slate-300'}`}>
                      <span>{type}</span>
                      {leaveType === type && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </button>
                ))}
                </div>
                <div className="flex flex-col md:flex-row gap-3 pt-2">
                    <button onClick={handleInitiateDelete} className="flex-1 py-3 rounded-xl border border-red-100 bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors order-2 md:order-1 flex items-center justify-center gap-2">
                       <Trash2 className="w-4 h-4"/> ยกเลิกการลา
                    </button>
                    <button onClick={handleUpdateLeaveType} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-blue-800 shadow-lg shadow-blue-200 transition-all order-1 md:order-2">
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} บันทึกการแก้ไข
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Leave Confirmation Modal */}
      {leaveToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการลบ?</h3>
            <p className="text-sm text-slate-500 mb-6">
              คุณต้องการลบรายการลาช่วงวันที่ <br/>
              <span className="font-bold text-slate-700">
                {formatDateDisplay(leaveToDelete.startDate)} - {formatDateDisplay(leaveToDelete.endDate)}
              </span>
              <br/>ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setEditingLeaveBatch(leaveToDelete); setLeaveToDelete(null); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
              >
                ย้อนกลับ
              </button>
              <button 
                onClick={handleConfirmDeleteLeave} 
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : null} ลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {isManageUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />จัดการรายชื่อบุคลากร
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-wider">{currentDepartment}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setIsManageUserModalOpen(false); handleCancelEdit(); }} className="text-slate-400 hover:text-slate-900 p-1.5"><X className="w-7 h-7" /></button>
                </div>
            </div>
            
            <div className="p-4 md:p-6 bg-white border-b border-slate-100">
                <form onSubmit={handleUserSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-10">
                      <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">ชื่อ - นามสกุล</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="นายสมชาย ใจดี" 
                        value={userForm.name} 
                        onChange={e => setUserForm({...userForm, name: e.target.value})} 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold bg-white text-black focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-sm" 
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                      {editingEmployeeId && (
                         <button type="button" onClick={handleCancelEdit} disabled={isSaving} className="flex-1 md:flex-none w-full md:w-auto py-3 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold text-sm hover:bg-slate-200 disabled:opacity-50 transition-all" title="ยกเลิกแก้ไข">
                           <Undo2 className="w-4 h-4" />
                         </button>
                      )}
                      <button type="submit" disabled={isSaving} className={`flex-1 w-full py-3 text-white rounded-xl flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-50 shadow-lg active:scale-95 transition-all ${editingEmployeeId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingEmployeeId ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        {editingEmployeeId ? 'บันทึก' : 'เพิ่ม'}
                      </button>
                    </div>
                </form>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-6">
                 <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse min-w-[500px]">
                          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                            <tr>
                              <th className="px-4 py-4 font-bold text-[10px] uppercase tracking-wider w-16 text-center">ลำดับ</th>
                              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider">ชื่อ - นามสกุล</th>
                              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-center w-32">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                              {departmentEmployees.length > 0 ? (
                                  departmentEmployees.map((emp, index) => (
                                      <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${editingEmployeeId === emp.id ? 'bg-amber-50' : ''}`}>
                                          <td className="px-4 py-4 text-slate-400 font-normal text-center">{index + 1}</td>
                                          <td className="px-6 py-4 font-normal text-slate-900">
                                            {emp.name}
                                            {editingEmployeeId === emp.id && <span className="ml-2 text-[10px] text-amber-600 font-bold bg-amber-100 px-1.5 py-0.5 rounded-md">กำลังแก้ไข</span>}
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditClick(emp)} className="p-2 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all" title="แก้ไขรายชื่อ">
                                                  <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteConfirm({isOpen:true, id:emp.id, name:emp.name})} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="ลบรายชื่อ">
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                          </td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr>
                                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                          {employees.length === 0 ? "ไม่พบข้อมูลในระบบ (ตรวจสอบ RLS Policy)" : "ไม่มีรายชื่อบุคลากรในแผนกนี้"}
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                    </div>
                 </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">ยืนยันการลบบุคลากร?</h3>
            <p className="text-sm text-slate-500 mb-6">
              คุณต้องการลบรายชื่อ <br/>
              <span className="font-bold text-slate-700">{deleteConfirm.name}</span>
              <br/>ออกจากระบบใช่หรือไม่?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
              >
                ยกเลิก
              </button>
              <button 
                onClick={executeDeleteUser} 
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors text-sm flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : null} ลบรายชื่อ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200 border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" /> ยืนยันรหัสผ่าน
              </h3>
              <button 
                onClick={() => setIsPasswordModalOpen(false)} 
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-bold text-slate-900 mb-1">{pendingDepartment}</h4>
                <p className="text-xs text-slate-500 font-medium">กรุณาใส่รหัสผ่านเพื่อเข้าสู่ระบบแผนก</p>
              </div>
              
              <div className="mb-6">
                <input 
                  type="password" 
                  autoFocus
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none text-center text-2xl tracking-[0.5em] font-bold transition-all ${passwordError ? 'border-red-500 bg-red-50 text-red-600 animate-shake' : 'border-slate-200 focus:border-blue-500 focus:bg-white'}`}
                  placeholder="••••"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPasswordError(false);
                  }}
                />
                {passwordError && (
                  <p className="text-center text-red-500 text-xs font-bold mt-2 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> รหัสผ่านไม่ถูกต้อง
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  type="submit"
                  className="w-full py-3.5 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                >
                  เข้าสู่ระบบ
                </button>
                <button 
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="w-full py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 border border-slate-200 overflow-hidden p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-3 rounded-2xl">
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">วิธีใช้งานระบบ</h2>
              </div>
              <button 
                onClick={() => setIsHelpModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-10">
              {[
                { icon: LayoutDashboard, color: 'text-blue-600', bg: 'bg-blue-50', title: 'เข้าสู่ระบบ', desc: 'เลือกหน่วยงานของท่านเพื่อเริ่มต้นใช้งาน' },
                { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', title: 'เลือกบุคลากร', desc: 'ค้นหาและเลือกชื่อที่ต้องการลงวันลา' },
                { icon: CalendarIcon, color: 'text-orange-600', bg: 'bg-orange-50', title: 'บันทึกวันลา', desc: 'คลิกวันที่ในปฏิทิน (เลือกเต็มวัน/ครึ่งวันได้)' },
                { icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-50', title: 'จัดการวันลา', desc: 'คลิกรายการเดิมเพื่อแก้ไขหรือยกเลิก' },
              ].map((step, idx) => (
                <div key={idx} className="flex items-center gap-5 p-4 rounded-3xl bg-slate-50/50 border border-slate-100/50">
                  <div className={`${step.bg} p-3 rounded-2xl shrink-0`}>
                    <step.icon className={`w-6 h-6 ${step.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-0.5">{step.title}</h3>
                    <p className="text-slate-500 text-sm font-medium">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setIsHelpModalOpen(false)}
              className="w-full py-5 bg-[#151921] text-white rounded-[1.5rem] font-bold text-lg hover:opacity-90 transition-all shadow-xl shadow-slate-200"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
