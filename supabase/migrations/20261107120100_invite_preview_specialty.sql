-- Invite page says "therapist" or "nutritionist" depending on who invited.
drop function if exists public.invite_preview(text);
create function public.invite_preview(p_code text)
returns table (nutritionist_name text, invite_name text, specialty text)
language sql stable security definer set search_path = public as $$
  select p.full_name, l.invite_name, n.specialty from client_links l
  join profiles p on p.id = l.nutritionist_id join nutritionists n on n.id = l.nutritionist_id
  where l.invite_code = p_code;
$$;
grant execute on function public.invite_preview(text) to anon, authenticated;
