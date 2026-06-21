create extension if not exists pgcrypto;

create unique index if not exists contacts_clinic_phone_idx
  on public.contacts (clinic_id, phone)
  where clinic_id is not null and phone is not null;

create index if not exists contacts_clinic_last_seen_idx
  on public.contacts (clinic_id, last_seen_at desc);

create table if not exists public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null check (length(btrim(note)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists contact_notes_contact_created_idx
  on public.contact_notes (contact_id, created_at desc);

alter table public.contact_notes enable row level security;

drop policy if exists "Clinic members can read contact notes" on public.contact_notes;
create policy "Clinic members can read contact notes"
  on public.contact_notes
  for select
  using (
    exists (
      select 1
      from public.contacts c
      join public.clinic_users cu on cu.clinic_id = c.clinic_id
      where c.id = contact_notes.contact_id
        and cu.user_id = auth.uid()
    )
  );

drop policy if exists "Clinic members can insert contact notes" on public.contact_notes;
create policy "Clinic members can insert contact notes"
  on public.contact_notes
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.contacts c
      join public.clinic_users cu on cu.clinic_id = c.clinic_id
      where c.id = contact_notes.contact_id
        and cu.user_id = auth.uid()
    )
  );

drop policy if exists "Clinic members can delete contact notes" on public.contact_notes;
create policy "Clinic members can delete contact notes"
  on public.contact_notes
  for delete
  using (
    exists (
      select 1
      from public.contacts c
      join public.clinic_users cu on cu.clinic_id = c.clinic_id
      where c.id = contact_notes.contact_id
        and cu.user_id = auth.uid()
    )
  );

create or replace function public.find_or_create_contact_for_conversation(
  p_clinic_id uuid,
  p_phone text,
  p_name text default null,
  p_meta_contact_id text default null,
  p_image_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
begin
  select id
    into v_contact_id
    from public.contacts
   where clinic_id = p_clinic_id
     and phone = p_phone
   limit 1;

  if v_contact_id is not null then
    update public.contacts
       set last_seen_at = now(),
           updated_at = now(),
           name = coalesce(nullif(p_name, ''), name),
           meta_contact_id = coalesce(p_meta_contact_id, meta_contact_id),
           image_url = coalesce(p_image_url, image_url)
     where id = v_contact_id;

    return v_contact_id;
  end if;

  insert into public.contacts (
    clinic_id,
    name,
    phone,
    meta_contact_id,
    image_url,
    first_seen_at,
    last_seen_at
  )
  values (
    p_clinic_id,
    coalesce(nullif(p_name, ''), p_phone),
    p_phone,
    p_meta_contact_id,
    p_image_url,
    now(),
    now()
  )
  returning id into v_contact_id;

  return v_contact_id;
end;
$$;

