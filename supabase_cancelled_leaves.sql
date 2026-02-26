
-- สร้างตารางประวัติการยกเลิกการลา (cancelled_leaves)
create table if not exists cancelled_leaves (
  id uuid default gen_random_uuid() primary key,
  cancelled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  employee_id uuid references employees(id) on delete cascade not null,
  employee_name text not null,
  leave_date date not null,
  leave_type text not null,
  department text not null
);

alter table cancelled_leaves enable row level security;

drop policy if exists "Enable all access for all users" on cancelled_leaves;

create policy "Enable all access for all users" on cancelled_leaves 
  for all 
  using (true) 
  with check (true);
