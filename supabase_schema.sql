
-- คำสั่ง SQL สำหรับสร้างตารางใน Supabase (Run in SQL Editor)

-- 1. สร้างตารางพนักงาน (employees)
create table if not exists employees (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  department text not null
);

-- 🔥 แก้ไขปัญหา Error "null value in column position"
-- คำสั่งนี้จะลบคอลัมน์ position ออกจากตาราง หากยังค้างอยู่
alter table employees drop column if exists position;

-- 2. สร้างตารางการลา (leaves)
create table if not exists leaves (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  employee_id uuid references employees(id) on delete cascade not null,
  date date not null,
  type text not null
);

-- 3. เปิดใช้งาน Row Level Security (RLS) และสร้าง Policy ให้เข้าถึงได้ทุกคน
-- หมายเหตุ: นโยบายนี้อนุญาตให้ใครก็ได้ (Public/Anon) อ่านและแก้ไขข้อมูลได้ เหมาะสำหรับระบบภายในหรือการทดสอบ
-- หากต้องการความปลอดภัยสูงขึ้น ควรปรับปรุง Policy ให้ตรวจสอบ User ID

alter table employees enable row level security;
alter table leaves enable row level security;

-- ลบ policy เดิมก่อนถ้ามีเพื่อป้องกัน error เมื่อรันซ้ำ
drop policy if exists "Enable all access for all users" on employees;
drop policy if exists "Enable all access for all users" on leaves;

-- สร้าง Policy ใหม่ที่อนุญาตทั้งการอ่าน (USING) และการเขียน (WITH CHECK)
create policy "Enable all access for all users" on employees 
  for all 
  using (true) 
  with check (true);

create policy "Enable all access for all users" on leaves 
  for all 
  using (true) 
  with check (true);
