-- Paid-plan features: GST invoices, group sessions, clinic teams and branding.

-- ---------- GST invoices ----------
alter table public.nutritionists
  add column business_name text,
  add column gstin text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z0-9]{13}$'),
  add column business_address text,
  add column gst_rate int not null default 0 check (gst_rate in (0, 5, 18));
grant update (business_name, gstin, business_address, gst_rate) on public.nutritionists to authenticated;

alter table public.payments add column invoice_no int;
create unique index payments_invoice_no on public.payments (nutritionist_id, invoice_no);

-- Each practice numbers its own invoices 1, 2, 3… in the order payments land.
create or replace function public.assign_invoice_no() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' and new.invoice_no is null then
    perform pg_advisory_xact_lock(hashtext(new.nutritionist_id::text));
    select coalesce(max(invoice_no), 0) + 1 into new.invoice_no from payments where nutritionist_id = new.nutritionist_id;
  end if;
  return new;
end $$;
create trigger payments_invoice_no before insert or update of status on public.payments
  for each row execute function public.assign_invoice_no();
-- number the payments that already exist
with numbered as (
  select id, row_number() over (partition by nutritionist_id order by created_at) as rn from payments where status = 'paid'
) update payments p set invoice_no = numbered.rn from numbered where numbered.id = p.id;

-- ---------- Group classes / support groups ----------
alter table public.services add column capacity int check (capacity between 2 and 100);

create table public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  service_id uuid not null references public.services on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null check (capacity between 2 and 100),
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
alter table public.group_sessions enable row level security;
create policy "groups: public read" on public.group_sessions for select using (
  nutritionist_id = auth.uid() or exists (select 1 from nutritionists n where n.id = nutritionist_id and n.published));
create policy "groups: own" on public.group_sessions for all using (nutritionist_id = auth.uid()) with check (nutritionist_id = auth.uid());

alter table public.bookings add column group_session_id uuid references public.group_sessions on delete cascade;
drop index public.bookings_no_double;
create unique index bookings_no_double on public.bookings (nutritionist_id, starts_at)
  where status in ('pending_payment','confirmed') and group_session_id is null;
create unique index bookings_one_seat on public.bookings (group_session_id, client_id)
  where status in ('pending_payment','confirmed') and group_session_id is not null;

-- Seats taken: confirmed, plus unpaid ones started in the last 30 minutes.
create or replace function public.group_seats_taken(g uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from bookings where group_session_id = g
    and (status = 'confirmed' or (status = 'pending_payment' and created_at > now() - interval '30 minutes'));
$$;

-- Busy times now include group sessions, so 1-to-1 slots aren't offered then.
create or replace function public.busy_slots(n uuid, from_ts timestamptz, to_ts timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select starts_at, ends_at from bookings
  where nutritionist_id = n and group_session_id is null and status in ('pending_payment','confirmed') and starts_at < to_ts and ends_at > from_ts
  union all
  select starts_at, ends_at from group_sessions
  where nutritionist_id = n and not cancelled and starts_at < to_ts and ends_at > from_ts;
$$;

create or replace function public.create_booking(p_service uuid, p_starts timestamptz, p_intake jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare s services; n nutritionists; link client_links; b_id uuid; lim int; mins int;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  select * into s from services where id = p_service and active;
  if not found then raise exception 'This service is not available'; end if;
  if s.type = 'group' then raise exception 'Pick one of the group dates instead'; end if;
  select * into n from nutritionists where id = s.nutritionist_id and published;
  if not found then raise exception 'This nutritionist is not taking bookings'; end if;
  if n.id = auth.uid() then raise exception 'You cannot book yourself'; end if;
  if p_starts < now() then raise exception 'Pick a time in the future'; end if;
  mins := n.session_minutes;
  -- must fall inside an availability window (times in India)
  if not exists (
    select 1 from availability a where a.nutritionist_id = n.id
      and a.weekday = extract(dow from p_starts at time zone 'Asia/Kolkata')
      and (p_starts at time zone 'Asia/Kolkata')::time >= a.start_time
      and ((p_starts + make_interval(mins => mins)) at time zone 'Asia/Kolkata')::time <= a.end_time
  ) then raise exception 'That time is outside the nutritionist''s hours'; end if;
  if exists (select 1 from busy_slots(n.id, p_starts, p_starts + make_interval(mins => mins))) then
    raise exception 'That slot was just taken. Please pick another time';
  end if;

  update profiles set role = coalesce(role, 'client') where id = auth.uid();
  select * into link from client_links where nutritionist_id = n.id and client_id = auth.uid();
  if not found or link.status <> 'active' then
    lim := plan_client_limit(n.plan);
    if lim is not null and active_client_count(n.id) >= lim then
      raise exception 'This nutritionist is fully booked right now';
    end if;
    if not found then
      insert into client_links (nutritionist_id, client_id, status, source, goal, food_type, conditions, height_cm, start_weight, program)
      values (n.id, auth.uid(), 'active', 'search', p_intake->>'goal', p_intake->>'food_type', p_intake->>'conditions',
              nullif(p_intake->>'height_cm','')::numeric, nullif(p_intake->>'weight','')::numeric, s.name);
    else
      update client_links set status = 'active' where id = link.id;
    end if;
  end if;

  insert into bookings (nutritionist_id, client_id, service_id, service_name, starts_at, ends_at, status, amount, intake)
  values (n.id, auth.uid(), s.id, s.name, p_starts, p_starts + make_interval(mins => mins),
          case when s.price = 0 then 'confirmed' else 'pending_payment' end, s.price, coalesce(p_intake,'{}'))
  returning id into b_id;
  return b_id;
end $$;


create or replace function public.book_group(p_session uuid, p_intake jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare g group_sessions; s services; n nutritionists; link client_links; b_id uuid; lim int;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  select * into g from group_sessions where id = p_session and not cancelled for update;
  if not found then raise exception 'This group session is not available'; end if;
  if g.starts_at < now() then raise exception 'This session has already started'; end if;
  select * into s from services where id = g.service_id;
  select * into n from nutritionists where id = g.nutritionist_id and published;
  if not found then raise exception 'This expert is not taking bookings'; end if;
  if n.id = auth.uid() then raise exception 'You cannot book yourself'; end if;
  if exists (select 1 from bookings where group_session_id = g.id and client_id = auth.uid() and status in ('pending_payment','confirmed')) then
    raise exception 'You already have a seat in this session';
  end if;
  if group_seats_taken(g.id) >= g.capacity then raise exception 'This session is full'; end if;

  update profiles set role = coalesce(role, 'client') where id = auth.uid();
  select * into link from client_links where nutritionist_id = n.id and client_id = auth.uid();
  if not found or link.status <> 'active' then
    lim := plan_client_limit(n.plan);
    if lim is not null and active_client_count(n.id) >= lim then raise exception 'This expert is fully booked right now'; end if;
    if not found then
      insert into client_links (nutritionist_id, client_id, status, source, goal, program)
      values (n.id, auth.uid(), 'active', 'search', p_intake->>'goal', s.name);
    else
      update client_links set status = 'active' where id = link.id;
    end if;
  end if;

  insert into bookings (nutritionist_id, client_id, service_id, service_name, starts_at, ends_at, status, amount, intake, group_session_id)
  values (n.id, auth.uid(), s.id, g.title, g.starts_at, g.ends_at,
          case when s.price = 0 then 'confirmed' else 'pending_payment' end, s.price, coalesce(p_intake,'{}'), g.id)
  returning id into b_id;
  return b_id;
end $$;

-- ---------- Clinics: teams and branding ----------
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.nutritionists on delete cascade,
  name text not null check (length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  tagline text,
  logo_url text,
  brand_color text not null default '#1F5BD8' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  custom_domain text unique,
  created_at timestamptz not null default now()
);
alter table public.clinics enable row level security;
create policy "clinics: public read" on public.clinics for select using (true);
create policy "clinics: owner" on public.clinics for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table public.clinic_members (
  clinic_id uuid not null references public.clinics on delete cascade,
  nutritionist_id uuid not null unique references public.nutritionists on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (clinic_id, nutritionist_id)
);
alter table public.clinic_members enable row level security;
create policy "clinic members: public read" on public.clinic_members for select using (true);
-- writes go through the functions below or the owner's server actions (service role)

create table public.clinic_invites (
  code text primary key default encode(gen_random_bytes(6), 'hex'),
  clinic_id uuid not null references public.clinics on delete cascade,
  created_at timestamptz not null default now(),
  used_by uuid references public.nutritionists on delete set null
);
alter table public.clinic_invites enable row level security;
create policy "clinic invites: owner" on public.clinic_invites for all
  using (exists (select 1 from clinics c where c.id = clinic_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from clinics c where c.id = clinic_id and c.owner_id = auth.uid()));

-- Logos are public images.
insert into storage.buckets (id, name, public) values ('clinic-logos', 'clinic-logos', true) on conflict do nothing;
create policy "clinic logos: owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'clinic-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "clinic logos: owner replace" on storage.objects for update to authenticated
  using (bucket_id = 'clinic-logos' and (storage.foldername(name))[1] = auth.uid()::text);
