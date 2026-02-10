
-- คำสั่งแก้ไขสิทธิ์การเข้าถึงข้อมูล (RLS Policy)
-- 🔴 สำคัญ: ให้ Copy โค้ดนี้ไปรันใน Supabase > SQL Editor แล้วกด Run เพื่อให้หน้าเว็บดึงข้อมูลได้

-- 1. เปิดใช้งาน RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- 2. ลบ Policy เก่าออก (เพื่อป้องกัน error ว่าซ้ำ)
DROP POLICY IF EXISTS "Enable all access for all users" ON employees;
DROP POLICY IF EXISTS "Enable all access for all users" ON leaves;
DROP POLICY IF EXISTS "Enable read access for all users" ON employees;
DROP POLICY IF EXISTS "Enable insert access for all users" ON employees;
DROP POLICY IF EXISTS "Enable update access for all users" ON employees;
DROP POLICY IF EXISTS "Enable delete access for all users" ON employees;

-- 3. สร้าง Policy ใหม่ อนุญาตให้ทำได้ทุกอย่าง (Select, Insert, Update, Delete)
-- นโยบายนี้อนุญาตให้ทุกคน (public) เข้าถึงข้อมูลได้ (เหมาะสำหรับแอปภายใน)
CREATE POLICY "Enable all access for all users" ON employees
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for all users" ON leaves
FOR ALL USING (true) WITH CHECK (true);
