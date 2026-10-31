-- Vendedoras com link próprio e comissão percentual sobre vendas pagas.
create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9-]{2,30}$'),
  name text not null,
  whatsapp text,
  commission_percent numeric(5,2) not null default 0 check (commission_percent >= 0 and commission_percent <= 100),
  staff_user_id uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (event_id, code)
);
alter table public.sellers enable row level security;

alter table public.registrations
  add column seller_id uuid references public.sellers(id) on delete set null,
  add column amount_cents integer,
  add column commission_cents integer not null default 0,
  add column commission_paid_at timestamptz;
update public.registrations r set amount_cents = e.price_cents from public.events e where e.id = r.event_id;
alter table public.registrations alter column amount_cents set not null;
create index registrations_seller_idx on public.registrations(seller_id);

drop function public.create_registration(text,text,text,text,text,text,boolean,boolean);

create function public.create_registration(
  p_slug text, p_name text, p_email text, p_phone text, p_instagram text,
  p_dietary text, p_image_consent boolean, p_marketing_consent boolean, p_seller_code text default null
) returns public.registrations
language plpgsql set search_path = public as $$
declare
  ev events;
  reg registrations;
  existing registrations;
  v_seller uuid;
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

  if coalesce(p_seller_code, '') <> '' then
    select id into v_seller from sellers where event_id = ev.id and code = lower(p_seller_code) and active;
  end if;

  update events set last_seq = last_seq + 1 where id = ev.id returning * into ev;

  insert into registrations (event_id, seq, code, name, email, phone, instagram, dietary,
    image_consent, image_consent_version, marketing_consent, privacy_accepted_at, expires_at,
    seller_id, amount_cents)
  values (ev.id, ev.last_seq, ev.code_prefix || '-' || lpad(ev.last_seq::text, 4, '0'),
    p_name, lower(p_email), p_phone, nullif(p_instagram,''), nullif(p_dietary,''),
    p_image_consent, ev.image_consent_version, coalesce(p_marketing_consent,false), now(),
    now() + make_interval(hours => ev.pending_ttl_hours), v_seller, ev.price_cents)
  returning * into reg;

  insert into registration_log (registration_id, action, details)
  values (reg.id, 'created', jsonb_build_object('image_consent', p_image_consent,
    'consent_version', ev.image_consent_version, 'marketing_consent', coalesce(p_marketing_consent,false),
    'seller_id', v_seller));
  return reg;
end $$;

-- Comissão calculada no momento em que o pagamento é confirmado (fica registrada mesmo se o % mudar depois).
create or replace function public.commission_for(p_seller uuid, p_amount integer)
returns integer language sql stable set search_path = public as $$
  select coalesce((select round(p_amount * commission_percent / 100)::int from sellers where id = p_seller), 0);
$$;

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
  update registrations set status = 'paid', paid_at = now(), paid_by = p_actor,
         commission_cents = commission_for(seller_id, amount_cents)
   where id = reg.id returning * into reg;
  insert into registration_log (registration_id, action, actor, details)
  values (reg.id, 'paid', p_actor, jsonb_build_object('commission_cents', reg.commission_cents));
  return reg;
end $$;

-- Troca a vendedora de uma inscrição (null = organização). Recalcula a comissão se ainda não foi paga.
create or replace function public.set_seller(p_registration uuid, p_seller uuid, p_actor uuid)
returns public.registrations
language plpgsql set search_path = public as $$
declare reg registrations;
begin
  select * into reg from registrations where id = p_registration for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if reg.commission_paid_at is not null then raise exception 'COMMISSION_ALREADY_PAID'; end if;
  if p_seller is not null and not exists (select 1 from sellers where id = p_seller and event_id = reg.event_id) then
    raise exception 'SELLER_NOT_FOUND';
  end if;
  update registrations set seller_id = p_seller,
         commission_cents = case when status = 'paid' then commission_for(p_seller, amount_cents) else 0 end
   where id = reg.id returning * into reg;
  insert into registration_log (registration_id, action, actor, details)
  values (reg.id, 'seller_changed', p_actor, jsonb_build_object('seller_id', p_seller, 'commission_cents', reg.commission_cents));
  return reg;
end $$;

revoke all on function public.create_registration(text,text,text,text,text,text,boolean,boolean,text) from public, anon, authenticated;
revoke all on function public.commission_for(uuid,integer) from public, anon, authenticated;
revoke all on function public.set_seller(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_registration(text,text,text,text,text,text,boolean,boolean,text) to service_role;
grant execute on function public.commission_for(uuid,integer) to service_role;
grant execute on function public.set_seller(uuid,uuid,uuid) to service_role;
