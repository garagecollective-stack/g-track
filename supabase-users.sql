-- =================================================================
-- G-TRACK: CREATE TEST USERS
-- Run this in Supabase → SQL Editor → New Query
-- This creates auth users + profiles in one go
-- =================================================================

-- Step 1: Enable pgcrypto (needed for password hashing)
create extension if not exists pgcrypto;

-- Step 2: Insert auth users + trigger auto-creates profiles
do $$
declare
  uid       uuid;
  rec       record;
begin
  for rec in (
    select *
    from (values
      ('rajan@garagecollective.io',  'Rajan Kapoor'),
      ('priya@garagecollective.io',  'Priya Shah'),
      ('pooja@garagecollective.io',  'Pooja Nair'),
      ('kavita@garagecollective.io', 'Kavita Joshi'),
      ('arjun@garagecollective.io',  'Arjun Mehta'),
      ('shreya@garagecollective.io', 'Shreya Iyer'),
      ('rohit@garagecollective.io',  'Rohit Verma'),
      ('anjali@garagecollective.io', 'Anjali Singh'),
      ('suresh@garagecollective.io', 'Suresh Kumar'),
      ('neha@garagecollective.io',   'Neha Gupta'),
      ('vivek@garagecollective.io',  'Vivek Sharma'),
      ('divya@garagecollective.io',  'Divya Rao')
    ) as t(email, name)
    where not exists (
      select 1 from auth.users where auth.users.email = t.email
    )
  )
  loop
    uid := gen_random_uuid();

    -- Insert into auth.users
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      raw_app_meta_data,
      is_super_admin,
      created_at,
      updated_at
    ) values (
      uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      rec.email,
      crypt('Password123!', gen_salt('bf')),
      now(),
      jsonb_build_object('name', rec.name),
      '{"provider":"email","providers":["email"]}',
      false,
      now(),
      now()
    );

    -- Insert into auth.identities (required for login to work)
    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      uid,
      rec.email,
      jsonb_build_object('sub', uid::text, 'email', rec.email, 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );

    -- The handle_new_user trigger should auto-insert the profile.
    -- But if it doesn't fire (e.g. trigger was added after users), insert manually:
    insert into public.profiles (id, name, email)
    values (uid, rec.name, rec.email)
    on conflict (id) do nothing;

  end loop;
end;
$$;

-- =================================================================
-- Step 3: Assign roles and departments
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

-- =================================================================
-- Step 4: Verify — should show 12 rows with roles filled in
-- =================================================================

select name, email, role, department from profiles order by role, department;
