-- Connect: nutrition-first schema
create extension if not exists pgcrypto;

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text check (role in ('nutritionist','client')),
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.nutritionists (
  id uuid primary key references public.profiles on delete cascade,
  handle text unique check (handle ~ '^[a-z0-9-]{3,40}$'),
  city text,
  mode text default 'Online',
  languages text[] not null default '{}',
  food_types text[] not null default '{}',
  goals text[] not null default '{}',
  about text,
  qualification text,
  experience_years int,
  meet_url text,
  session_minutes int not null default 45 check (session_minutes between 15 and 120),
  chat_start time default '10:00',
  chat_end time default '19:00',
  plan text not null default 'starter' check (plan in ('starter','growth','pro','clinic')),
  plan_renews_at timestamptz,
  razorpay_account_id text,
  razorpay_subscription_id text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  name text not null,
  type text not null check (type in ('call','package','monthly','question','group')),
  details text,
  price int not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time)
);

-- ---------- Client relationship ----------
create table public.client_links (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  client_id uuid references public.profiles on delete cascade,
  invite_name text,
  invite_email text,
  invite_code text unique default encode(gen_random_bytes(6),'hex'),
  status text not null default 'invited' check (status in ('invited','active','ended')),
  source text not null default 'own' check (source in ('own','search')),
  program text,
  goal text,
  height_cm numeric,
  start_weight numeric,
  target_weight numeric,
  food_type text,
  conditions text,
  started_at date default current_date,
  created_at timestamptz not null default now(),
  unique (nutritionist_id, client_id)
);

create or replace function public.is_linked(n uuid, c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from client_links where nutritionist_id = n and client_id = c and status = 'active');
$$;

create or replace function public.plan_client_limit(p text) returns int
language sql immutable as $$
  select case p when 'starter' then 5 when 'growth' then 30 else null end;
$$;

create or replace function public.active_client_count(n uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from client_links where nutritionist_id = n and status = 'active';
$$;

-- ---------- Bookings and payments ----------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  client_id uuid not null references public.profiles on delete cascade,
  service_id uuid references public.services on delete set null,
  service_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending_payment' check (status in ('pending_payment','confirmed','cancelled','completed')),
  amount int not null default 0,
  intake jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create unique index bookings_no_double on public.bookings (nutritionist_id, starts_at) where status in ('pending_payment','confirmed');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings on delete set null,
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  client_id uuid references public.profiles on delete set null,
  amount int not null,
  platform_fee int not null default 0,
  razorpay_order_id text unique,
  razorpay_payment_id text,
  status text not null default 'created' check (status in ('created','paid','failed','refunded')),
  created_at timestamptz not null default now()
);

-- ---------- Diet plans ----------
create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid references public.nutritionists on delete cascade, -- null = built-in template
  client_id uuid references public.profiles on delete cascade,             -- null = template
  name text not null,
  tag text,
  kcal int,
  meals jsonb not null default '[]', -- [{name, time, items: [text]}]
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Daily tracking ----------
create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles on delete cascade,
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  plan_id uuid references public.diet_plans on delete set null,
  log_date date not null default current_date,
  meal_name text not null,
  planned text,
  photo_path text,
  note text,
  status text not null default 'pending' check (status in ('pending','on_plan','off_plan')),
  reply text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.meal_logs (nutritionist_id, created_at desc);
create index on public.meal_logs (client_id, log_date);

create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles on delete cascade,
  log_date date not null default current_date,
  weight numeric not null check (weight between 20 and 300),
  waist numeric,
  created_at timestamptz not null default now(),
  unique (client_id, log_date)
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles on delete cascade,
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  energy int check (energy between 1 and 5),
  hunger int check (hunger between 1 and 5),
  note text,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  client_id uuid not null references public.profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  client_id uuid not null references public.profiles on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index on public.messages (nutritionist_id, client_id, created_at);

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.nutritionists enable row level security;
alter table public.services enable row level security;
alter table public.availability enable row level security;
alter table public.client_links enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.diet_plans enable row level security;
alter table public.meal_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.checkins enable row level security;
alter table public.notes enable row level security;
alter table public.messages enable row level security;

create policy "profiles: own" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: linked" on public.profiles for select using (public.is_linked(auth.uid(), id) or public.is_linked(id, auth.uid()));
create policy "profiles: public nutritionists" on public.profiles for select using (exists (select 1 from public.nutritionists n where n.id = profiles.id and n.published));
create policy "profiles: booked clients" on public.profiles for select using (exists (select 1 from public.bookings b where b.client_id = profiles.id and b.nutritionist_id = auth.uid()));

create policy "nutritionists: public read" on public.nutritionists for select using (published or id = auth.uid() or public.is_linked(id, auth.uid()));
create policy "nutritionists: own insert" on public.nutritionists for insert with check (id = auth.uid());
-- plan and payment fields are changed only by the server (service role)
create policy "nutritionists: own update" on public.nutritionists for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.nutritionists from authenticated, anon;
grant update (handle, city, mode, languages, food_types, goals, about, qualification, experience_years, meet_url,
  session_minutes, chat_start, chat_end, published) on public.nutritionists to authenticated;
revoke insert on public.nutritionists from authenticated, anon;
grant insert (id, handle, city, mode, languages, food_types, goals, about, qualification, experience_years, meet_url,
  session_minutes, chat_start, chat_end, published) on public.nutritionists to authenticated;

create policy "services: public read" on public.services for select using (active or nutritionist_id = auth.uid());
create policy "services: own" on public.services for all using (nutritionist_id = auth.uid()) with check (nutritionist_id = auth.uid());

create policy "availability: public read" on public.availability for select using (true);
create policy "availability: own" on public.availability for all using (nutritionist_id = auth.uid()) with check (nutritionist_id = auth.uid());

create policy "links: nutritionist" on public.client_links for all using (nutritionist_id = auth.uid()) with check (nutritionist_id = auth.uid());
create policy "links: client read" on public.client_links for select using (client_id = auth.uid());

create policy "bookings: parties read" on public.bookings for select using (client_id = auth.uid() or nutritionist_id = auth.uid());
create policy "bookings: nutritionist update" on public.bookings for update using (nutritionist_id = auth.uid());

create policy "payments: parties read" on public.payments for select using (client_id = auth.uid() or nutritionist_id = auth.uid());

create policy "plans: templates read" on public.diet_plans for select using (nutritionist_id is null and client_id is null);
create policy "plans: nutritionist" on public.diet_plans for all using (nutritionist_id = auth.uid()) with check (nutritionist_id = auth.uid() and (client_id is null or public.is_linked(auth.uid(), client_id)));
create policy "plans: client read" on public.diet_plans for select using (client_id = auth.uid());

create policy "meals: client" on public.meal_logs for select using (client_id = auth.uid());
create policy "meals: client insert" on public.meal_logs for insert with check (client_id = auth.uid() and public.is_linked(nutritionist_id, auth.uid()) and status = 'pending' and reply is null);
create policy "meals: client delete pending" on public.meal_logs for delete using (client_id = auth.uid() and status = 'pending');
create policy "meals: nutritionist" on public.meal_logs for select using (nutritionist_id = auth.uid() and public.is_linked(auth.uid(), client_id));
create policy "meals: nutritionist review" on public.meal_logs for update using (nutritionist_id = auth.uid() and public.is_linked(auth.uid(), client_id));

create policy "weights: client" on public.weight_logs for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "weights: nutritionist read" on public.weight_logs for select using (public.is_linked(auth.uid(), client_id));

create policy "checkins: client" on public.checkins for all using (client_id = auth.uid()) with check (client_id = auth.uid() and public.is_linked(nutritionist_id, auth.uid()));
create policy "checkins: nutritionist read" on public.checkins for select using (nutritionist_id = auth.uid());

create policy "notes: nutritionist only" on public.notes for all using (nutritionist_id = auth.uid()) with check (nutritionist_id = auth.uid() and public.is_linked(auth.uid(), client_id));

create policy "messages: parties read" on public.messages for select using (nutritionist_id = auth.uid() or client_id = auth.uid());
create policy "messages: parties send" on public.messages for insert with check (
  sender_id = auth.uid() and (nutritionist_id = auth.uid() or client_id = auth.uid()) and public.is_linked(nutritionist_id, client_id));

-- ---------- RPCs ----------
-- Busy times for a nutritionist (no client details exposed)
create or replace function public.busy_slots(n uuid, from_ts timestamptz, to_ts timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select starts_at, ends_at from bookings
  where nutritionist_id = n and status in ('pending_payment','confirmed') and starts_at < to_ts and ends_at > from_ts;
$$;

-- Client books a service. Creates the client link if needed and enforces plan limits.
create or replace function public.create_booking(p_service uuid, p_starts timestamptz, p_intake jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare s services; n nutritionists; link client_links; b_id uuid; lim int; mins int;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  select * into s from services where id = p_service and active;
  if not found then raise exception 'This service is not available'; end if;
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
  if exists (select 1 from bookings where nutritionist_id = n.id and status in ('pending_payment','confirmed')
             and starts_at < p_starts + make_interval(mins => mins) and ends_at > p_starts) then
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

-- Client accepts an invite link
create or replace function public.accept_invite(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare link client_links; n nutritionists; lim int;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  select * into link from client_links where invite_code = p_code;
  if not found then raise exception 'This invite link is not valid'; end if;
  if link.client_id is not null and link.client_id <> auth.uid() then raise exception 'This invite was already used'; end if;
  if link.nutritionist_id = auth.uid() then raise exception 'This is your own invite link'; end if;
  if exists (select 1 from client_links where nutritionist_id = link.nutritionist_id and client_id = auth.uid() and id <> link.id) then
    delete from client_links where id = link.id;
    update client_links set status = 'active' where nutritionist_id = link.nutritionist_id and client_id = auth.uid();
    return link.nutritionist_id;
  end if;
  if link.status <> 'active' then
    select * into n from nutritionists where id = link.nutritionist_id;
    lim := plan_client_limit(n.plan);
    if lim is not null and active_client_count(n.id) >= lim then
      raise exception 'Your nutritionist has reached their client limit. Please ask them to upgrade';
    end if;
  end if;
  update profiles set role = coalesce(role, 'client'), full_name = coalesce(full_name, link.invite_name) where id = auth.uid();
  update client_links set client_id = auth.uid(), status = 'active' where id = link.id;
  return link.nutritionist_id;
end $$;

-- Invite preview (who invited me) without logging in
create or replace function public.invite_preview(p_code text)
returns table (nutritionist_name text, invite_name text)
language sql stable security definer set search_path = public as $$
  select p.full_name, l.invite_name from client_links l join profiles p on p.id = l.nutritionist_id where l.invite_code = p_code;
$$;

-- Create a profile row for every new user
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.touch() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger diet_plans_touch before update on public.diet_plans for each row execute function public.touch();

-- Limit how a client can edit their own meal log row: never the review fields
create or replace function public.guard_meal_review() returns trigger language plpgsql as $$
begin
  if auth.uid() = new.nutritionist_id then
    -- nutritionist may only change review fields
    new.client_id := old.client_id; new.photo_path := old.photo_path; new.meal_name := old.meal_name; new.log_date := old.log_date; new.note := old.note;
    if new.status <> old.status or new.reply is distinct from old.reply then new.reviewed_at := now(); end if;
  end if;
  return new;
end $$;
create trigger meal_review_guard before update on public.meal_logs for each row execute function public.guard_meal_review();

-- ---------- Realtime for chat and photo feed ----------
alter publication supabase_realtime add table public.messages, public.meal_logs;

-- ---------- Storage: meal photos (private) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "meal photos: client upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "meal photos: client read" on storage.objects for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "meal photos: client delete" on storage.objects for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "meal photos: nutritionist read" on storage.objects for select to authenticated
  using (bucket_id = 'meal-photos' and public.is_linked(auth.uid(), ((storage.foldername(name))[1])::uuid));

-- ---------- Built-in diet plan templates ----------
insert into public.diet_plans (name, tag, kcal, meals) values
('Weight loss, Gujarati veg','Weight loss',1400,'[{"name":"Early morning","time":"06:30","items":["Warm jeera water","5 soaked almonds"]},{"name":"Breakfast","time":"08:30","items":["Moong dal chilla (2)","Mint chutney"]},{"name":"Mid-morning","time":"11:00","items":["1 apple or guava"]},{"name":"Lunch","time":"13:30","items":["2 rotli, no ghee","Dal, 1 bowl","Seasonal shaak","Cucumber salad"]},{"name":"Evening","time":"17:00","items":["Tea, less sugar","Roasted chana, 1 handful"]},{"name":"Dinner","time":"20:00","items":["Vegetable khichdi, 1 bowl","Buttermilk"]}]'),
('PCOS, Jain friendly','PCOS',1500,'[{"name":"Early morning","time":"06:30","items":["Cinnamon water","2 walnuts"]},{"name":"Breakfast","time":"08:30","items":["Rajgira porridge","Pumpkin seeds"]},{"name":"Mid-morning","time":"11:00","items":["Pear or papaya"]},{"name":"Lunch","time":"13:30","items":["Jowar rotli (2)","Moong dal","Lauki shaak","Curd"]},{"name":"Evening","time":"17:00","items":["Roasted makhana"]},{"name":"Dinner","time":"20:00","items":["Paneer bhurji","1 jowar rotli"]}]'),
('Diabetes friendly','Diabetes',1600,'[{"name":"Early morning","time":"06:30","items":["Methi seed water"]},{"name":"Breakfast","time":"08:30","items":["Besan chilla","Curd"]},{"name":"Mid-morning","time":"11:00","items":["Guava"]},{"name":"Lunch","time":"13:30","items":["Multigrain rotli (2)","Rajma","Salad"]},{"name":"Evening","time":"17:00","items":["Sprouts chaat"]},{"name":"Dinner","time":"20:00","items":["Dalia upma","Vegetable soup"]}]'),
('Pregnancy, 2nd trimester','Pregnancy',2200,'[{"name":"Early morning","time":"07:00","items":["Milk with 2 dates"]},{"name":"Breakfast","time":"09:00","items":["Vegetable poha","Boiled egg or paneer"]},{"name":"Lunch","time":"13:30","items":["3 rotli","Dal","Palak paneer","Curd"]},{"name":"Evening","time":"17:00","items":["Fruit and nuts"]},{"name":"Dinner","time":"20:00","items":["Rice, dal, shaak"]}]'),
('Muscle gain, high protein','Gym',2600,'[{"name":"Breakfast","time":"08:00","items":["Paneer paratha (2)","Curd"]},{"name":"Pre-workout","time":"11:00","items":["Banana with peanut butter"]},{"name":"Lunch","time":"13:30","items":["Rice and rajma","Chicken or soya curry"]},{"name":"Evening","time":"17:30","items":["Whey or sattu shake"]},{"name":"Dinner","time":"20:30","items":["4 rotli","Dal","Paneer sabzi"]}]');
