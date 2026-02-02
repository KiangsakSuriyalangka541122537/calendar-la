
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, Activity, Database, Search, Calendar as CalendarIcon, 
  ArrowLeft, CheckCircle2, LayoutDashboard, ChevronRight, ChevronLeft, UserPlus, X, Briefcase,
  Trash2, Save, AlertTriangle, RefreshCw, FileSpreadsheet, Loader2, User, Eraser,
  Pencil, Undo2, Edit3
} from 'lucide-react';
import { Department, Employee, LeaveRecord, LeaveType, LEAVE_COLORS } from './types';
import { INITIAL_EMPLOYEES, INITIAL_LEAVES, DEPARTMENTS, getHolidayName } from './constants';
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
  
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState<string>('');
  const [leaveEndDate, setLeaveEndDate] = useState<string>('');
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.PERSONAL);
  
  const [isManageUserModalOpen, setIsManageUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', position: '' });
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
      
      const fetchedEmployees: Employee[] = (empData || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        position: e.position,
        department: e.department as Department
      }));

      const processedLeaves: LeaveRecord[] = (leaveData || []).map((l: any) => ({
        id: l.id,
        employeeId: l.employee_id, // Map database column snake_case to camelCase
        date: l.date,
        type: l.type as LeaveType
      }));
      
      setEmployees(fetchedEmployees);
      setLeaves(processedLeaves);
      
      if (isShowAlert) alert('✅ ซิงค์ข้อมูลสำเร็จ!');

    } catch (error: any) {
      console.error("Error loading data:", error);
      if (isShowAlert) alert('❌ เกิดข้อผิดพลาด: ' + error.message);
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
    setCurrentDepartment(dept);
    setSearchQuery('');
    setSelectedEmployee(null);
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
              const lastDate = new Date(currentGroup[currentGroup.length - 1].date);
              const currDate = new Date(l.date);
              const diffTime = Math.abs(currDate.getTime() - lastDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              // If gap is <= 4 days (e.g., Fri -> Mon is 3 days gap), group them
              if (diffDays <= 4) {
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
        // Delete multiple IDs
        const { error } = await supabase
          .from('leaves')
          .delete()
          .in('id', leaveToDelete.ids);

        if (error) throw error;

        // Filter out all deleted IDs from local state
        setLeaves(prev => prev.filter(l => !leaveToDelete.ids.includes(l.id)));
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
        type: leaveType
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
          type: l.type as LeaveType
        }));
        
        setLeaves(prev => [...prev, ...newLeaves]);
      }

      setIsLeaveModalOpen(false);
    } catch (error: any) {
      console.error('Error saving leave:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (emp: Employee) => {
    setUserForm({ name: emp.name, position: emp.position });
    setEditingEmployeeId(emp.id);
  };

  const handleCancelEdit = () => {
    setUserForm({ name: '', position: '' });
    setEditingEmployeeId(null);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.position || !currentDepartment) return;

    // Normalize name (remove extra spaces) to ensure "Name  Surname" == "Name Surname"
    const normalizeName = (name: string) => name.replace(/\s+/g, ' ').trim();
    const normalizedInputName = normalizeName(userForm.name);
    const trimmedPosition = userForm.position.trim();
    
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
          const { error } = await supabase
            .from('employees')
            .update({ name: normalizedInputName, position: trimmedPosition })
            .eq('id', editingEmployeeId);
          
          if (error) throw error;

          // Update local state
          setEmployees(prev => prev.map(emp => 
              emp.id === editingEmployeeId 
                  ? { ...emp, name: normalizedInputName, position: trimmedPosition }
                  : emp
          ));
          
          // Also update selectedEmployee if it's the one being edited
          if (selectedEmployee?.id === editingEmployeeId) {
            setSelectedEmployee(prev => prev ? { ...prev, name: normalizedInputName, position: trimmedPosition } : null);
          }

          setEditingEmployeeId(null);
      } else {
          // Create new
          const { data, error } = await supabase
            .from('employees')
            .insert([{
              name: normalizedInputName,
              position: trimmedPosition,
              department: currentDepartment
            }])
            .select()
            .single();

          if (error) throw error;

          if (data) {
            const newEmp: Employee = {
                id: data.id,
                name: data.name,
                position: data.position,
                department: data.department as Department
            };
            setEmployees(prev => [newEmp, ...prev]);
          }
      }
      setUserForm({ name: '', position: '' });
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกบุคลากร: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncFromSheets = async () => {
    fetchAndSetData(true);
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

  // New function to clear all data
  const handleClearAllData = async () => {
    if (!window.confirm('⚠️ คำเตือน: คุณต้องการลบข้อมูล "บุคลากร" และ "ประวัติการลา" ทั้งหมดในระบบใช่หรือไม่?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้!')) {
      return;
    }

    if (!window.confirm('ยืนยันครั้งสุดท้าย: ลบข้อมูลทั้งหมดจริงหรือไม่?')) {
      return;
    }

    setIsSaving(true);
    try {
      // Delete all leaves first (to avoid foreign key constraints if any, though cascade handles it usually)
      const { error: leaveError } = await supabase
        .from('leaves')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete where ID is not empty UUID (basically all)

      if (leaveError) throw leaveError;

      // Delete all employees
      const { error: empError } = await supabase
        .from('employees')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (empError) throw empError;

      // Clear local state
      setEmployees([]);
      setLeaves([]);
      setSelectedEmployee(null);
      setSearchQuery('');
      
      alert('✅ ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว');
    } catch (error: any) {
      console.error('Error clearing data:', error);
      alert('❌ เกิดข้อผิดพลาดในการล้างข้อมูล: ' + error.message);
    } finally {
      setIsSaving(false);
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
                        setSearchQuery(e.target.value);
                        if (e.target.value === '') setSelectedEmployee(null);
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
                            <p className="text-[10px] text-slate-500 font-medium truncate">{emp.position}</p>
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
                              <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1 mt-0.5"><Briefcase className="w-3 h-3" />{selectedEmployee.position}</p>
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
                <CalendarView 
                  leaves={leaves} 
                  employees={departmentEmployees} 
                  selectedEmployeeId={selectedEmployee?.id || null} 
                  onDateClick={handleDateClick} 
                  onLeaveClick={handleLeaveClick}
                />
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
                  <span className="text-2xl font-black text-blue-900">{calculatedDatesToAdd.length} วัน</span>
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

      {/* Delete Confirmation Modal (Triggered from Edit Modal) */}
      {leaveToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 border border-slate-100 text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100"><Trash2 className="w-8 h-8" /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">ยืนยันยกเลิก?</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed px-2">
                  ต้องการยกเลิกการลา <span className="font-bold text-slate-800">"{leaveToDelete.type}"</span><br/>
                  <div className="mt-2 text-slate-600 font-medium">
                    {leaveToDelete.startDate === leaveToDelete.endDate ? (
                       <span>วันที่ {formatDateDisplay(leaveToDelete.startDate)}</span>
                    ) : (
                       <span>{formatDateDisplay(leaveToDelete.startDate)} - {formatDateDisplay(leaveToDelete.endDate)}</span>
                    )}
                    <div className="text-xs text-slate-400 font-bold mt-1">
                      (รวม {leaveToDelete.totalDays} วัน)
                    </div>
                  </div>
                </p>
                <div className="flex gap-3 w-full">
                    <button onClick={() => setLeaveToDelete(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-all">กลับ</button>
                    <button onClick={handleConfirmDeleteLeave} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2">
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} ยืนยัน
                    </button>
                </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {isManageUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />จัดการรายชื่อบุคลากร
                  </h3>
                  <p className="text-[11px] text-slate-500 font-bold mt-1 uppercase tracking-wider">{currentDepartment}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleClearAllData} disabled={isSaving} className="flex text-xs items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 disabled:opacity-50 font-bold shadow-sm transition-all mr-2">
                        <Eraser className="w-3.5 h-3.5" /> 
                        ล้างข้อมูลทั้งหมด
                    </button>
                    <button onClick={handleSyncFromSheets} disabled={isSyncing} className="flex text-xs items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-50 font-bold shadow-sm transition-all text-black">
                        {isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} 
                        {isSyncing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูล'}
                    </button>
                    <button onClick={() => { setIsManageUserModalOpen(false); handleCancelEdit(); }} className="text-slate-400 hover:text-slate-900 p-1.5"><X className="w-7 h-7" /></button>
                </div>
            </div>
            
            <div className="p-4 md:p-6 bg-white border-b border-slate-100">
                <form onSubmit={handleUserSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-5">
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
                    <div className="md:col-span-5">
                      <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">ตำแหน่ง</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="เจ้าหน้าที่ฯ" 
                        value={userForm.position} 
                        onChange={e => setUserForm({...userForm, position: e.target.value})} 
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
                              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider">ตำแหน่ง</th>
                              <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-wider text-center">จัดการ</th>
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
                                          <td className="px-6 py-4 text-slate-600 font-medium">{emp.position}</td>
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
                                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                          ไม่มีรายชื่อบุคลากรในแผนกนี้
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
    </div>
  );
}

export default App;
