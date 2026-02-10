
-- 🔴 คำสั่งแก้ปัญหา "Could not find the table ... in the schema cache"
-- ปัญหานี้เกิดจาก Supabase ยังจำโครงสร้างตารางเก่าอยู่ (ตอนที่มีคอลัมน์ position)
-- ให้ Copy โค้ดนี้ไปรันใน SQL Editor แล้วกด Run

-- 1. สั่งให้ Supabase รีเฟรช Cache ของฐานข้อมูลทันที
NOTIFY pgrst, 'reload config';

-- 2. ยืนยันสิทธิ์การเข้าถึงข้อมูลให้ทุกคน (แก้ปัญหาข้อมูลไม่ขึ้น)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. ตรวจสอบว่าตาราง employees มีอยู่จริง (สร้างใหม่ถ้าหายไป แต่ปกติจะไม่หาย)
CREATE TABLE IF NOT EXISTS public.employees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    name text NOT NULL,
    department text NOT NULL
);
