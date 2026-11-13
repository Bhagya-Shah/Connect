-- Remember a member's own plan so leaving the clinic gives it back.
alter table public.clinic_members add column prev_plan text not null default 'starter';
