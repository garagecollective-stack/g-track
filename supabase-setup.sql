-- =================================================================
-- G-TRACK SUPABASE SETUP
-- Run this entire file in Supabase → SQL Editor → New Query
-- =================================================================


-- =================================================================
-- STEP 1: TABLES
-- =================================================================

create table departments (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  color text not null default '#6366F1',
  icon text default 'briefcase',
  created_at timestamptz default now()
);

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text not null unique,
  role text check (role in ('director', 'teamLead', 'member')) not null default 'member',
  department text,
  department_id uuid references departments(id) on delete set null,
  avatar_url text,
  user_status text check (user_status in ('active', 'away', 'offline')) default 'active',
  is_active boolean default true,
  tasks_completed int default 0,
  last_seen timestamptz,
  invited_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  key text unique not null,
  description text,
  department text not null,
  department_id uuid references departments(id) on delete set null,
  owner_id uuid references profiles(id) on delete set null,
  status text check (status in ('backlog', 'inProgress', 'completed', 'onHold')) default 'backlog',
  priority text check (priority in ('critical', 'high', 'medium', 'low')) default 'medium',
  progress int default 0 check (progress >= 0 and progress <= 100),
  issue_date date,
  due_date date,
  sop text,
  reference_link text,
  client text,
  is_archived boolean default false,
  created_at timestamptz default now()
);

create table project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (project_id, user_id)
);

create table tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  project_id uuid references projects(id) on delete cascade,
  project_name text,
  department text not null,
  priority text check (priority in ('critical', 'high', 'medium', 'low')) default 'medium',
  status text check (status in ('backlog', 'inProgress', 'done', 'onHold')) default 'backlog',
  assignee_id uuid references profiles(id) on delete set null,
  assignee_name text,
  due_date date,
  created_by_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

create table project_files (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_size bigint,
  file_type text,
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz default now()
);

create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  message text not null,
  type text check (type in ('assignment','completion','update','role_change','department_change','invite')),
  read boolean default false,
  related_id uuid,
  related_type text,
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  performed_by uuid references profiles(id) on delete set null,
  action text not null,
  target_type text check (target_type in ('user','project','task','department')),
  target_id uuid,
  target_name text,
  details jsonb,
  created_at timestamptz default now()
);


-- =================================================================
-- STEP 2: TRIGGERS
-- =================================================================

-- Auto-create profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'department'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-recalculate project progress when tasks change
create or replace function update_project_progress()
returns trigger as $$
declare
  total int;
  done_count int;
  proj_id uuid;
begin
  proj_id := coalesce(new.project_id, old.project_id);
  select count(*) into total from tasks where project_id = proj_id;
  select count(*) into done_count from tasks where project_id = proj_id and status = 'done';
  if total > 0 then
    update projects
    set progress = round((done_count::numeric / total::numeric) * 100)
    where id = proj_id;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger on_task_change
  after insert or update of status or delete on tasks
  for each row execute procedure update_project_progress();


-- =================================================================
-- STEP 3: ROW LEVEL SECURITY
-- =================================================================

alter table profiles        enable row level security;
alter table departments     enable row level security;
alter table projects        enable row level security;
alter table project_members enable row level security;
alter table tasks           enable row level security;
alter table project_files   enable row level security;
alter table notifications   enable row level security;
alter table audit_logs      enable row level security;

-- Helper: current user's role
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper: current user's department
create or replace function get_my_dept()
returns text as $$
  select department from profiles where id = auth.uid();
$$ language sql security definer stable;

-- PROFILES policies
create policy "profiles_read"
  on profiles for select to authenticated using (true);

create policy "profiles_update_own"
  on profiles for update to authenticated using (id = auth.uid());

create policy "profiles_update_director"
  on profiles for update to authenticated using (get_my_role() = 'director');

-- DEPARTMENTS policies
create policy "dept_read"
  on departments for select to authenticated using (true);

create policy "dept_write_director"
  on departments for all to authenticated
  using (get_my_role() = 'director')
  with check (get_my_role() = 'director');

-- PROJECTS policies
create policy "proj_select_director"
  on projects for select to authenticated using (get_my_role() = 'director');

create policy "proj_select_lead"
  on projects for select to authenticated
  using (get_my_role() = 'teamLead' and department = get_my_dept());

create policy "proj_select_member"
  on projects for select to authenticated
  using (get_my_role() = 'member' and id in (
    select project_id from project_members where user_id = auth.uid()
  ));

create policy "proj_insert_director"
  on projects for insert to authenticated
  with check (get_my_role() = 'director');

create policy "proj_insert_lead"
  on projects for insert to authenticated
  with check (get_my_role() = 'teamLead' and department = get_my_dept());

create policy "proj_update_director"
  on projects for update to authenticated using (get_my_role() = 'director');

create policy "proj_update_lead"
  on projects for update to authenticated
  using (get_my_role() = 'teamLead' and department = get_my_dept());

create policy "proj_delete_director"
  on projects for delete to authenticated using (get_my_role() = 'director');

create policy "proj_delete_lead"
  on projects for delete to authenticated
  using (get_my_role() = 'teamLead' and department = get_my_dept());

-- PROJECT MEMBERS policies
create policy "pm_read"
  on project_members for select to authenticated using (true);

create policy "pm_write"
  on project_members for all to authenticated
  using (get_my_role() in ('director', 'teamLead'))
  with check (get_my_role() in ('director', 'teamLead'));

-- TASKS policies
create policy "tasks_select_director"
  on tasks for select to authenticated using (get_my_role() = 'director');

create policy "tasks_select_lead"
  on tasks for select to authenticated
  using (get_my_role() = 'teamLead' and department = get_my_dept());

create policy "tasks_select_member"
  on tasks for select to authenticated
  using (get_my_role() = 'member' and assignee_id = auth.uid());

create policy "tasks_insert_lead_dir"
  on tasks for insert to authenticated
  with check (get_my_role() in ('director', 'teamLead'));

create policy "tasks_update_lead_dir"
  on tasks for update to authenticated
  using (get_my_role() in ('director', 'teamLead'));

create policy "tasks_update_member"
  on tasks for update to authenticated
  using (get_my_role() = 'member' and assignee_id = auth.uid());

create policy "tasks_delete_lead_dir"
  on tasks for delete to authenticated
  using (get_my_role() in ('director', 'teamLead'));

-- PROJECT FILES policies
create policy "files_read"
  on project_files for select to authenticated using (true);

create policy "files_write"
  on project_files for all to authenticated
  using (get_my_role() in ('director', 'teamLead'))
  with check (get_my_role() in ('director', 'teamLead'));

-- NOTIFICATIONS policies
create policy "notif_own"
  on notifications for all to authenticated using (user_id = auth.uid());

-- AUDIT LOGS policies
create policy "audit_read_director"
  on audit_logs for select to authenticated using (get_my_role() = 'director');

create policy "audit_insert"
  on audit_logs for insert to authenticated with check (true);


-- =================================================================
-- STEP 4: SEED DATA — Departments
-- =================================================================

insert into departments (name, color, icon) values
  ('Developer',             '#6366F1', 'code-2'),
  ('Design',                '#EC4899', 'palette'),
  ('Social Media',          '#F97316', 'share-2'),
  ('Business Development',  '#14B8A6', 'briefcase'),
  ('SEO',                   '#F59E0B', 'search');


-- =================================================================
-- STEP 5: ASSIGN ROLES
-- Run this AFTER creating all 12 users in:
-- Supabase → Authentication → Users → Add user
-- Email / Password: see below
--
-- rajan@garagecollective.io    Password123!
-- priya@garagecollective.io    Password123!
-- pooja@garagecollective.io    Password123!
-- kavita@garagecollective.io   Password123!
-- arjun@garagecollective.io    Password123!
-- shreya@garagecollective.io   Password123!
-- rohit@garagecollective.io    Password123!
-- anjali@garagecollective.io   Password123!
-- suresh@garagecollective.io   Password123!
-- neha@garagecollective.io     Password123!
-- vivek@garagecollective.io    Password123!
-- divya@garagecollective.io    Password123!
-- =================================================================

update profiles set role = 'director',  department = 'Company'              where email = 'rajan@garagecollective.io';
update profiles set role = 'teamLead',  department = 'Developer'            where email = 'priya@garagecollective.io';
update profiles set role = 'teamLead',  department = 'Design'               where email = 'pooja@garagecollective.io';
update profiles set role = 'teamLead',  department = 'Social Media'         where email = 'kavita@garagecollective.io';
update profiles set role = 'teamLead',  department = 'Business Development' where email = 'arjun@garagecollective.io';
update profiles set role = 'teamLead',  department = 'SEO'                  where email = 'shreya@garagecollective.io';
update profiles set role = 'member',    department = 'Developer'            where email = 'rohit@garagecollective.io';
update profiles set role = 'member',    department = 'Design'               where email = 'anjali@garagecollective.io';
update profiles set role = 'member',    department = 'Social Media'         where email = 'suresh@garagecollective.io';
update profiles set role = 'member',    department = 'Developer'            where email = 'neha@garagecollective.io';
update profiles set role = 'member',    department = 'Business Development' where email = 'vivek@garagecollective.io';
update profiles set role = 'member',    department = 'SEO'                  where email = 'divya@garagecollective.io';
