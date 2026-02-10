
-- 🔴 คำสั่งซ่อมแซมความสัมพันธ์ตาราง (Foreign Key)
-- ช่วยแก้ปัญหาและป้องกันข้อมูลขยะ (Orphan Data)
-- ให้ Copy โค้ดนี้ไปรันใน SQL Editor แล้วกด Run

-- 1. ลบ Constraint เก่าออกก่อน (ถ้ามี)
ALTER TABLE leaves DROP CONSTRAINT IF EXISTS leaves_employee_id_fkey;

-- 2. สร้าง Constraint ใหม่ โดยกำหนดให้ "ลบข้อมูลแบบลูกโซ่" (ON DELETE CASCADE)
-- แปลว่า: ถ้าลบรายชื่อพนักงาน ข้อมูลการลาของคนนั้นจะหายไปโดยอัตโนมัติ ไม่ค้างในระบบ
ALTER TABLE leaves
  ADD CONSTRAINT leaves_employee_id_fkey
  FOREIGN KEY (employee_id)
  REFERENCES employees(id)
  ON DELETE CASCADE;

-- 3. ตรวจสอบและลบข้อมูลขยะ (วันลาที่ไม่มีเจ้าของ) ที่อาจตกค้างอยู่
DELETE FROM leaves
WHERE employee_id NOT IN (SELECT id FROM employees);
