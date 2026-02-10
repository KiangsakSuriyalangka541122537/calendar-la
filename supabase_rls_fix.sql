
-- รวมคำสั่งแก้ไขปัญหาทั้งหมด (โครงสร้างตาราง + สิทธิ์การเข้าถึง)
-- 🔴 สำคัญ: ให้ Copy โค้ดนี้ไปรันใน Supabase > SQL Editor แล้วกด Run

-- 1. แก้ไข Error "null value in column position"
-- ลบคอลัมน์ position ที่ไม่จำเป็นออก
ALTER TABLE employees DROP COLUMN IF EXISTS position;

-- 2. เปิดใช้งาน RLS (Row Level Security)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- 3. ลบ Policy เก่าออก (เพื่อป้องกัน error ว่าซ้ำ)
DROP POLICY IF EXISTS "Enable all access for all users" ON employees;
DROP POLICY IF EXISTS "Enable all access for all users" ON leaves;
DROP POLICY IF EXISTS "Enable read access for all users" ON employees;
DROP POLICY IF EXISTS "Enable insert access for all users" ON employees;
DROP POLICY IF EXISTS "Enable update access for all users" ON employees;
DROP POLICY IF EXISTS "Enable delete access for all users" ON employees;

-- 4. สร้าง Policy ใหม่ อนุญาตให้ทำได้ทุกอย่าง (Select, Insert, Update, Delete)
-- นโยบายนี้อนุญาตให้ทุกคน (public) เข้าถึงข้อมูลได้
CREATE POLICY "Enable all access for all users" ON employees
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for all users" ON leaves
FOR ALL USING (true) WITH CHECK (true);
