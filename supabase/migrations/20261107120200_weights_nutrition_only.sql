-- Weight is a nutrition record: only the client's nutritionists read it, not their therapist.
drop policy "weights: nutritionist read" on public.weight_logs;
create policy "weights: nutritionist read" on public.weight_logs for select using (
  public.is_linked(auth.uid(), client_id)
  and exists (select 1 from public.nutritionists n where n.id = auth.uid() and n.specialty = 'nutrition'));
