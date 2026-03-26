
-- คำสั่ง SQL สำหรับเพิ่มคอลัมน์ duration ในตารางเดิม (Run in SQL Editor)

-- 1. เพิ่มคอลัมน์ duration ในตาราง leaves
alter table leaves add column if exists duration numeric default 1 not null;

-- 2. เพิ่มคอลัมน์ duration ในตาราง cancelled_leaves
alter table cancelled_leaves add column if exists duration numeric default 1 not null;
