-- Connect for nutritionists: one practice app.
-- Nutritionists sign in with Google, create logins for their clients, share files and meet on Google Meet.
-- Additive: older marketplace tables stay in place but the app no longer uses them.

-- ---------- Practice details ----------
alter table public.nutritionists add column if not exists practice_name text check (length(practice_name) <= 80);
grant insert (practice_name) on public.nutritionists to authenticated;
grant update (practice_name) on public.nutritionists to authenticated;

-- No client limits in the single-practice app.
create or replace function public.plan_client_limit(p text) returns int
language sql immutable as $$ select null::int $$;

-- ---------- Client logins made by the nutritionist ----------
-- login_owner: this nutritionist created the login, so they may reset its password.
alter table public.client_links add column if not exists login_owner boolean not null default false;
alter table public.client_links add column if not exists phone text;

-- ---------- Sessions with a Google Meet link ----------
alter table public.bookings add column if not exists meet_url text check (meet_url is null or meet_url ~ '^https://');
alter table public.bookings add column if not exists notes text check (length(notes) <= 2000);

drop policy if exists "bookings: nutritionist insert" on public.bookings;
create policy "bookings: nutritionist insert" on public.bookings for insert
  with check (nutritionist_id = auth.uid() and public.is_linked(auth.uid(), client_id));
drop policy if exists "bookings: nutritionist delete" on public.bookings;
create policy "bookings: nutritionist delete" on public.bookings for delete using (nutritionist_id = auth.uid());

-- ---------- Files: diet plans, reports, prescriptions ----------
create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  client_id uuid not null references public.profiles on delete cascade,
  uploaded_by uuid not null references public.profiles on delete cascade,
  name text not null check (length(name) between 1 and 200),
  path text not null unique,
  size int not null default 0,
  mime text,
  kind text not null default 'other' check (kind in ('diet_plan', 'report', 'prescription', 'other')),
  note text check (length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists client_files_by_client on public.client_files (nutritionist_id, client_id, created_at desc);
alter table public.client_files enable row level security;

drop policy if exists "files: parties read" on public.client_files;
create policy "files: parties read" on public.client_files for select using (
  (nutritionist_id = auth.uid() or client_id = auth.uid()) and public.is_linked(nutritionist_id, client_id));
drop policy if exists "files: parties add" on public.client_files;
create policy "files: parties add" on public.client_files for insert with check (
  uploaded_by = auth.uid() and (nutritionist_id = auth.uid() or client_id = auth.uid())
  and public.is_linked(nutritionist_id, client_id)
  and path like nutritionist_id::text || '/' || client_id::text || '/%');
drop policy if exists "files: remove" on public.client_files;
create policy "files: remove" on public.client_files for delete using (nutritionist_id = auth.uid() or uploaded_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-files', 'client-files', false, 20971520, array[
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Paths are <nutritionist id>/<client id>/<file>. Both sides of an active link can read and add.
drop policy if exists "client files: read" on storage.objects;
create policy "client files: read" on storage.objects for select to authenticated using (
  bucket_id = 'client-files' and (
    ((storage.foldername(name))[1] = auth.uid()::text and public.is_linked(auth.uid(), ((storage.foldername(name))[2])::uuid))
    or ((storage.foldername(name))[2] = auth.uid()::text and public.is_linked(((storage.foldername(name))[1])::uuid, auth.uid()))));
drop policy if exists "client files: add" on storage.objects;
create policy "client files: add" on storage.objects for insert to authenticated with check (
  bucket_id = 'client-files' and (
    ((storage.foldername(name))[1] = auth.uid()::text and public.is_linked(auth.uid(), ((storage.foldername(name))[2])::uuid))
    or ((storage.foldername(name))[2] = auth.uid()::text and public.is_linked(((storage.foldername(name))[1])::uuid, auth.uid()))));
drop policy if exists "client files: remove" on storage.objects;
create policy "client files: remove" on storage.objects for delete to authenticated using (
  bucket_id = 'client-files' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or ((storage.foldername(name))[2] = auth.uid()::text and owner = auth.uid())));
