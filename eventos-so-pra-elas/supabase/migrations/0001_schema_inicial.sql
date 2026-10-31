-- Aplicado no projeto Supabase "so-pra-elas-eventos" em 31/10/2026.
create extension if not exists pgcrypto with schema extensions;

create type public.registration_status as enum ('pending','paid','expired','cancelled');
create type public.staff_role as enum ('admin','sales','checkin');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  code_prefix text not null,
  event_date date not null,
  start_time text,
  venue_name text,
  venue_address text,
  price_cents integer not null check (price_cents >= 0),
  capacity integer not null check (capacity > 0),
  pix_key text,
  pix_holder text,
  sales_whatsapp text,
  menu_info text,
  ask_dietary boolean not null default true,
  pending_ttl_hours integer not null default 48,
  image_consent_version text not null default 'v1',
  image_consent_text text not null,
  registrations_open boolean not null default false,
  last_seq integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  seq integer not null,
  code text not null unique,
  name text not null,
  email text not null,
  phone text not null,
  instagram text,
  dietary text,
  image_consent boolean not null,
  image_consent_version text not null,
  marketing_consent boolean not null default false,
  privacy_accepted_at timestamptz not null,
  status public.registration_status not null default 'pending',
  ticket_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null,
  paid_at timestamptz,
  paid_by uuid references auth.users(id),
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id),
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (event_id, seq)
);
create index registrations_event_status_idx on public.registrations(event_id, status);
create index registrations_event_email_idx on public.registrations(event_id, lower(email));

create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role public.staff_role not null,
  created_at timestamptz not null default now()
);

create table public.registration_log (
  id bigint generated always as identity primary key,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  action text not null,
  actor uuid references auth.users(id),
  details jsonb,
  at timestamptz not null default now()
);
create index registration_log_reg_idx on public.registration_log(registration_id);

alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.staff enable row level security;
alter table public.registration_log enable row level security;
-- Sem policies de propósito: anon/authenticated não leem nada.
-- Todo acesso passa pelo servidor do app, com a chave secreta.

create or replace function public.seats_taken(p_event uuid)
returns integer language sql stable set search_path = public as $$
  select count(*)::int from registrations
  where event_id = p_event
    and (status = 'paid' or (status = 'pending' and expires_at > now()));
$$;

create or replace function public.create_registration(
  p_slug text, p_name text, p_email text, p_phone text, p_instagram text,
  p_dietary text, p_image_consent boolean, p_marketing_consent boolean
) returns public.registrations
language plpgsql set search_path = public as $$
declare
  ev events;
  reg registrations;
  existing registrations;
begin
  select * into ev from events where slug = p_slug for update;
  if not found then raise exception 'EVENT_NOT_FOUND'; end if;
  if not ev.registrations_open then raise exception 'REGISTRATIONS_CLOSED'; end if;

  select * into existing from registrations
   where event_id = ev.id and lower(email) = lower(p_email)
     and (status = 'paid' or (status = 'pending' and expires_at > now()))
   order by created_at desc limit 1;
  if found then return existing; end if;

  if seats_taken(ev.id) >= ev.capacity then raise exception 'SOLD_OUT'; end if;

  update events set last_seq = last_seq + 1 where id = ev.id returning * into ev;

  insert into registrations (event_id, seq, code, name, email, phone, instagram, dietary,
    image_consent, image_consent_version, marketing_consent, privacy_accepted_at, expires_at)
  values (ev.id, ev.last_seq, ev.code_prefix || '-' || lpad(ev.last_seq::text, 4, '0'),
    p_name, lower(p_email), p_phone, nullif(p_instagram,''), nullif(p_dietary,''),
    p_image_consent, ev.image_consent_version, coalesce(p_marketing_consent,false), now(),
    now() + make_interval(hours => ev.pending_ttl_hours))
  returning * into reg;

  insert into registration_log (registration_id, action, details)
  values (reg.id, 'created', jsonb_build_object('image_consent', p_image_consent,
    'consent_version', ev.image_consent_version, 'marketing_consent', coalesce(p_marketing_consent,false)));
  return reg;
end $$;

create or replace function public.confirm_payment(p_registration uuid, p_actor uuid)
returns public.registrations
language plpgsql set search_path = public as $$
declare reg registrations; ev events;
begin
  select * into reg from registrations where id = p_registration for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if reg.status = 'paid' then return reg; end if;
  if reg.status = 'cancelled' then raise exception 'CANCELLED'; end if;
  select * into ev from events where id = reg.event_id for update;
  if (reg.status = 'expired' or reg.expires_at <= now()) and seats_taken(ev.id) >= ev.capacity then
    raise exception 'SOLD_OUT';
  end if;
  update registrations set status = 'paid', paid_at = now(), paid_by = p_actor
   where id = reg.id returning * into reg;
  insert into registration_log (registration_id, action, actor) values (reg.id, 'paid', p_actor);
  return reg;
end $$;

create or replace function public.check_in(p_token text, p_actor uuid)
returns jsonb
language plpgsql set search_path = public as $$
declare reg registrations;
begin
  select * into reg from registrations where ticket_token = p_token for update;
  if not found then return jsonb_build_object('result','not_found'); end if;
  if reg.status <> 'paid' then
    return jsonb_build_object('result','not_paid','id',reg.id,'name',reg.name,'code',reg.code,'status',reg.status);
  end if;
  if reg.checked_in_at is not null then
    return jsonb_build_object('result','already','id',reg.id,'name',reg.name,'code',reg.code,
      'checked_in_at',reg.checked_in_at,'image_consent',reg.image_consent);
  end if;
  update registrations set checked_in_at = now(), checked_in_by = p_actor where id = reg.id returning * into reg;
  insert into registration_log (registration_id, action, actor) values (reg.id, 'checked_in', p_actor);
  return jsonb_build_object('result','ok','id',reg.id,'name',reg.name,'code',reg.code,
    'checked_in_at',reg.checked_in_at,'image_consent',reg.image_consent,'dietary',reg.dietary);
end $$;

create or replace function public.expire_pending()
returns integer language sql set search_path = public as $$
  with x as (
    update registrations set status = 'expired'
     where status = 'pending' and expires_at <= now() returning id
  ), l as (
    insert into registration_log (registration_id, action) select id, 'expired' from x
  )
  select count(*)::int from x;
$$;

revoke all on function public.seats_taken(uuid) from public, anon, authenticated;
revoke all on function public.create_registration(text,text,text,text,text,text,boolean,boolean) from public, anon, authenticated;
revoke all on function public.confirm_payment(uuid,uuid) from public, anon, authenticated;
revoke all on function public.check_in(text,uuid) from public, anon, authenticated;
revoke all on function public.expire_pending() from public, anon, authenticated;
grant execute on function public.seats_taken(uuid) to service_role;
grant execute on function public.create_registration(text,text,text,text,text,text,boolean,boolean) to service_role;
grant execute on function public.confirm_payment(uuid,uuid) to service_role;
grant execute on function public.check_in(text,uuid) to service_role;
grant execute on function public.expire_pending() to service_role;
