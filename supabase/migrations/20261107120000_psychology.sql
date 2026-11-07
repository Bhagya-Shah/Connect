-- Psychologists, therapists and counsellors as a second specialty.
-- They share bookings, payments, calls, chat and private notes with nutritionists,
-- and add mood check-ins, a journal, homework, PHQ-9 / GAD-7 check-ups and consent.

alter table public.nutritionists
  add column specialty text not null default 'nutrition' check (specialty in ('nutrition', 'psychology')),
  add column approaches text[] not null default '{}',
  add column consent_text text;
-- specialty is chosen once at sign-up; approaches and consent text can be edited
grant insert (specialty, approaches, consent_text) on public.nutritionists to authenticated;
grant update (approaches, consent_text) on public.nutritionists to authenticated;

alter table public.client_links add column consent_at timestamptz;

-- Linked to this client AND a psychology practice. Mental-health data is only shared with these.
create or replace function public.is_linked_psy(n uuid, c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from client_links l join nutritionists p on p.id = l.nutritionist_id
    where l.nutritionist_id = n and l.client_id = c and l.status = 'active' and p.specialty = 'psychology');
$$;

-- ---------- Mood check-ins (one per day) ----------
create table public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles on delete cascade,
  log_date date not null default current_date,
  mood int not null check (mood between 1 and 5),
  feelings text[] not null default '{}',
  note text check (length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (client_id, log_date)
);
alter table public.mood_logs enable row level security;
create policy "mood: own" on public.mood_logs for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "mood: therapist read" on public.mood_logs for select using (public.is_linked_psy(auth.uid(), client_id));

-- ---------- Journal (private unless shared) ----------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles on delete cascade,
  body text not null check (length(body) between 1 and 8000),
  shared boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.journal_entries enable row level security;
create policy "journal: own" on public.journal_entries for all using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "journal: therapist reads shared" on public.journal_entries for select using (shared and public.is_linked_psy(auth.uid(), client_id));

-- ---------- Homework / exercises ----------
create table public.homework (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  client_id uuid not null references public.profiles on delete cascade,
  title text not null check (length(title) between 1 and 200),
  details text check (length(details) <= 4000),
  due_date date,
  done_at timestamptz,
  client_reply text check (length(client_reply) <= 4000),
  created_at timestamptz not null default now()
);
alter table public.homework enable row level security;
create policy "homework: therapist" on public.homework for all using (nutritionist_id = auth.uid())
  with check (nutritionist_id = auth.uid() and public.is_linked(auth.uid(), client_id));
create policy "homework: client read" on public.homework for select using (client_id = auth.uid());

create or replace function public.complete_homework(p_id uuid, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update homework set done_at = coalesce(done_at, now()), client_reply = nullif(left(trim(p_reply), 4000), '')
  where id = p_id and client_id = auth.uid();
  if not found then raise exception 'Homework not found'; end if;
end $$;

-- ---------- PHQ-9 / GAD-7 check-ups ----------
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references public.nutritionists on delete cascade,
  client_id uuid not null references public.profiles on delete cascade,
  kind text not null check (kind in ('phq9', 'gad7')),
  status text not null default 'requested' check (status in ('requested', 'done')),
  answers int[],
  score int,
  risk boolean not null default false, -- PHQ-9 question 9 answered above 0
  created_at timestamptz not null default now(),
  done_at timestamptz
);
alter table public.assessments enable row level security;
create policy "assessments: therapist read" on public.assessments for select using (nutritionist_id = auth.uid());
create policy "assessments: therapist request" on public.assessments for insert
  with check (nutritionist_id = auth.uid() and status = 'requested' and answers is null and score is null and not risk
              and public.is_linked_psy(auth.uid(), client_id));
create policy "assessments: therapist cancel" on public.assessments for delete using (nutritionist_id = auth.uid() and status = 'requested');
create policy "assessments: client read" on public.assessments for select using (client_id = auth.uid());

-- The client answers; the score and risk flag are worked out here, so they can't be faked.
create or replace function public.submit_assessment(p_id uuid, p_answers int[])
returns table (score int, risk boolean) language plpgsql security definer set search_path = public as $$
declare a assessments; n int; s int := 0; v int;
begin
  select * into a from assessments where id = p_id and client_id = auth.uid() and status = 'requested';
  if not found then raise exception 'This check-up is not open'; end if;
  n := case a.kind when 'phq9' then 9 else 7 end;
  if coalesce(array_length(p_answers, 1), 0) <> n then raise exception 'Please answer every question'; end if;
  foreach v in array p_answers loop
    if v is null or v < 0 or v > 3 then raise exception 'Answers must be 0 to 3'; end if;
    s := s + v;
  end loop;
  update assessments set answers = p_answers, score = s, status = 'done', done_at = now(),
    risk = (a.kind = 'phq9' and p_answers[9] > 0)
  where id = p_id;
  return query select s, (a.kind = 'phq9' and p_answers[9] > 0);
end $$;

-- ---------- Consent ----------
create or replace function public.give_consent(p_nutritionist uuid)
returns void language sql security definer set search_path = public as $$
  update client_links set consent_at = coalesce(consent_at, now())
  where nutritionist_id = p_nutritionist and client_id = auth.uid() and status = 'active';
$$;
