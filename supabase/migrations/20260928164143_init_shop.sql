-- ═══════════════════════════════════════════════════════════════════════════
-- JewelryBox — initial shop schema
--
-- Ported from BGI's init_shop.sql, with the gold-rate pricing, Paystack, and
-- grams/karat layers left behind: JewelryBox is fixed-price and takes bank
-- transfer or cash on delivery only.
--
-- Three rules this file exists to enforce, because the UI cannot:
--
--   1. The client never sets a price, a delivery fee, or a delivery method.
--      `place_order()` reprices every line from the catalogue and derives the
--      method from the address. A tampered cart cannot change what is charged.
--   2. An order's financial columns are immutable once placed. RLS has no
--      column granularity, so this is done with column GRANTs plus a trigger —
--      an admin client cannot rewrite `items` or skip `advance_order_status()`.
--   3. Status moves follow ORDER_FLOW exactly, per payment method. The flow is
--      stored as data (`order_flow`) so the Phase G test can diff it against
--      app/utils/constants/orderStatus.ts rather than trust two copies.
--
-- Conventions:
--   · Money is whole naira in `bigint`. No kobo, no floats, anywhere.
--   · Every function sets `search_path = ''` and schema-qualifies everything.
--     pg_catalog is always implicitly searched, so built-ins need no prefix.
--   · Every policy wraps `auth.uid()` AND `is_admin()` as `(select …)`, which
--     hoists them into an InitPlan evaluated once per query rather than once
--     per row.
--   · Every `raise exception` carries a stable machine code in `hint`, which
--     surfaces as a structured field on supabase-js's PostgrestError. The
--     repository maps it to `codedError()`; the UI never matches on prose.
--     Codes are the values in app/utils/constants/errorCodes.ts.
-- ═══════════════════════════════════════════════════════════════════════════

-- Trigram search on the catalogue. Lives in `extensions` on Supabase, so the
-- opclass must be written `extensions.gin_trgm_ops` in the index DDL below —
-- an unqualified opclass is a migration that passes locally and fails hosted.
create extension if not exists pg_trgm with schema extensions;


-- ───────────────────────────────────────────────────────────────────────────
-- Reference data
-- ───────────────────────────────────────────────────────────────────────────

-- Mirrors NIGERIAN_STATES in app/utils/constants/states.ts (36 + FCT).
-- IMMUTABLE so it can be used inside CHECK constraints, which cannot contain
-- subqueries — this is the only clean way to constrain a state column.
create function public.nigerian_states()
returns text[]
language sql immutable parallel safe
set search_path = ''
as $$
  select array[
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
    'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT (Abuja)','Gombe',
    'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
    'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
    'Taraba','Yobe','Zamfara'
  ]::text[];
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- profiles
-- ───────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  phone      text,
  role       text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER so the profiles SELECT policy can call it without
-- recursing into itself. STABLE + parameterless so `(select public.is_admin())`
-- is hoisted into an InitPlan.
create function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Fires on the auth.users INSERT, which happens at signup — BEFORE email
-- verification — so the profile and its role exist by the time the first
-- session appears.
--
-- Deliberately a bare insert: no table reads, no email branching. A raise in
-- here fails the signup itself, and there is no auto-promotion path to abuse.
-- The first admin is promoted out of band (seed.sql locally, one statement in
-- the SQL editor at launch), which keeps no privileged email in git.
create function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role changes require an admin. Without this, `Update own profile` would let
-- anyone make themselves an admin.
create function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- `auth.uid() is null` means this is not a client request — a superuser in
  -- psql, or the service role. That exemption is what makes the documented
  -- bootstrap possible at all: promoting the first admin has to work when no
  -- admin exists yet, and requiring is_admin() makes the role column a
  -- permanent deadlock. RLS is what protects the client paths: `Update own
  -- profile` only ever matches the caller's own row, so a signed-in customer
  -- reaches this check with a non-null uid and is refused.
  if new.role is distinct from old.role
     and (select auth.uid()) is not null
     and not (select public.is_admin()) then
    raise exception 'Changing roles requires an admin.'
      using hint = 'not_admin', errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Locking yourself out is a one-statement mistake with no recovery through the
-- app. Statement-level so it sees the table after a multi-row update.
-- Only fires when the statement actually touched an admin row. A plain
-- statement-level check would refuse a customer renaming themselves in a
-- database that has no admin yet — and worse, would make the very first
-- promotion depend on an admin already existing. `old_rows` is the transition
-- table, present for both UPDATE and DELETE.
-- SECURITY DEFINER, and it has to be. GoTrue runs as `supabase_auth_admin`,
-- which holds no privileges on `public.profiles` — so when deleting an
-- auth.users row cascades into profiles and fires this statement trigger, an
-- INVOKER body reading `select 1 from public.profiles` is refused with
-- `permission denied for table profiles`, and `auth.admin.deleteUser` returns an
-- opaque 500 for EVERY user. The FK cascade itself is fine (referential actions
-- do not use the deleting role's privileges); it is only the trigger body that
-- needs them. `handle_new_user()` is definer for the same reason, which is why
-- signup worked and only deletion broke.
create function public.profiles_require_admin()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (select 1 from old_rows where role = 'admin')
     and not exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Cannot remove the last admin.' using hint = 'not_admin';
  end if;
  return null;
end;
$$;

create trigger profiles_require_admin_update
  after update on public.profiles
  referencing old table as old_rows
  for each statement execute function public.profiles_require_admin();

create trigger profiles_require_admin_delete
  after delete on public.profiles
  referencing old table as old_rows
  for each statement execute function public.profiles_require_admin();


-- ───────────────────────────────────────────────────────────────────────────
-- products
-- ───────────────────────────────────────────────────────────────────────────

-- No `grams`, no `karat`, no `pricing_mode` — pieces are fixed-price.
-- No `is_moissanite` either: COLLECTIONS in catalog.ts is tag-driven, so
-- moissanite and gifts are `tags` containment rather than columns.
create table public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name           text not null check (length(btrim(name)) > 0),
  brand          text not null default '',
  description    text not null default '',
  category       text not null check (category in
                   ('watches','rings','necklaces','earrings','bracelets')),
  price_ngn      bigint not null check (price_ngn >= 0),
  -- A was-price below the asking price renders a negative saving on the PDP.
  compare_at_ngn bigint check (compare_at_ngn is null or compare_at_ngn > price_ngn),
  images         text[] not null default '{}',
  -- Ordered label/value pairs, not columns: a watch declares Movement / Case /
  -- Crystal, a ring declares Stone / Metal / Setting. Admin controls both the
  -- labels and their order. `is json array` (PG16+) is the only shape check
  -- available inside a CHECK, which cannot contain subqueries.
  specs          jsonb not null default '[]' check (specs is json array),
  tags           text[] not null default '{}' check (
                   tags <@ array['new','moissanite','gift','statement','everyday','limited']::text[]),
  in_stock       boolean not null default true,
  -- Drives the prototype's "2 left". null hides the count entirely.
  stock_count    int check (stock_count is null or stock_count >= 0),
  made_to_order  boolean not null default false,
  featured       boolean not null default false,
  -- Soft delete. Order history reads `orders.items` (a snapshot) so it survives
  -- either way; this is for wishlists, recently-viewed and inbound links.
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  -- Required by ProductsRepository.allSlugs(), which feeds sitemap lastmod.
  updated_at     timestamptz not null default now(),

  -- productAvailability() ignores stock_count when made_to_order, so storing
  -- one would be data that means nothing.
  constraint products_mto_no_count check (not made_to_order or stock_count is null),
  -- Stops "0 left" rendering as available.
  constraint products_zero_stock_sold check (
    stock_count is null or stock_count > 0 or not in_stock)
);

-- Partial, so a slug can be reused after the original is archived.
create unique index products_slug_key on public.products (slug) where archived_at is null;

alter table public.products enable row level security;

create table public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label      text not null check (length(btrim(label)) > 0),
  options    jsonb not null default '{}' check (options is json object),
  price_ngn  bigint not null check (price_ngn >= 0),
  in_stock   boolean not null default true,
  position   int not null default 0
);

alter table public.product_variants enable row level security;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- delivery_rates
-- ───────────────────────────────────────────────────────────────────────────

-- One row per priced destination. A `dispatch` row is a Lagos area (the rider
-- fee depends on how far across the city the piece goes); a `flight` row is a
-- state with one air-freight fee. BGI's zone groupings are gone.
--
-- A destination with no active row is NOT an error — it is one she has not
-- priced yet, and the order still goes through with a null fee.
create table public.delivery_rates (
  id       uuid primary key default gen_random_uuid(),
  mode     text not null check (mode in ('dispatch','flight')),
  name     text not null check (length(btrim(name)) > 0),
  state    text not null,
  fee_ngn  bigint not null check (fee_ngn >= 0),
  active   boolean not null default true,
  position int not null default 0,

  constraint rates_mode_state check (
    (mode = 'dispatch' and state = 'Lagos') or
    (mode = 'flight'   and state <> 'Lagos')),
  -- Without this a flight row's name and state can disagree and the lookup in
  -- place_order() becomes ambiguous.
  constraint rates_flight_name_is_state check (mode <> 'flight' or name = state),
  constraint rates_state_known check (state = any (public.nigerian_states()))
);

-- lower() alone will not collapse 'Lekki Phase 1 ', so normalise on write.
create function public.rates_normalize()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.name  := regexp_replace(btrim(new.name), '\s+', ' ', 'g');
  new.state := btrim(new.state);
  return new;
end;
$$;

create trigger delivery_rates_normalize
  before insert or update on public.delivery_rates
  for each row execute function public.rates_normalize();

-- Case-insensitive, because the mock repository matches destinations with
-- `name.toLowerCase()` and the two lanes must agree — otherwise 'Ikeja' and
-- 'ikeja' become two separately priced rows.
--
-- Deliberately NOT partial on `active`: two rows for one destination (one off)
-- would make resolve() ambiguous and updateFees-by-id a coin flip. One row per
-- destination with an `active` toggle is the model the admin UI assumes.
create unique index delivery_rates_dest_key
  on public.delivery_rates (mode, lower(name));

alter table public.delivery_rates enable row level security;


-- ───────────────────────────────────────────────────────────────────────────
-- addresses
-- ───────────────────────────────────────────────────────────────────────────

-- Not in CHECKLIST.md's schema list, but AddressRepository in types/api.ts
-- requires saved addresses with an is_default flag. Columns are flat so the
-- repository's `Address & { id, is_default }` return type maps directly.
create table public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  full_name  text not null,
  email      text not null,
  phone      text not null,
  line1      text not null,
  line2      text,
  city       text not null,
  state      text not null check (state = any (public.nigerian_states())),
  area       text,
  country    text not null default 'NG' check (country = 'NG'),
  notes      text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),

  constraint addresses_lagos_needs_area check (state <> 'Lagos' or area is not null)
);

-- setDefault() with nothing enforcing this gives you two defaults.
create unique index addresses_one_default_idx
  on public.addresses (user_id) where is_default;

create index addresses_user_idx on public.addresses (user_id, created_at desc);

alter table public.addresses enable row level security;


-- ───────────────────────────────────────────────────────────────────────────
-- site_settings
-- ───────────────────────────────────────────────────────────────────────────

-- `is_public` rather than BGI's blanket `using (true)`: this table will accrete
-- keys that are genuinely private, and the bank account is one of them —
-- PAYMENT_METHODS.bank_transfer.description says "Account details shown after
-- you order", so they are order-scoped, not published. See
-- get_payment_instructions() below.
create table public.site_settings (
  key        text primary key,
  value      jsonb not null,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

alter table public.site_settings enable row level security;


-- ───────────────────────────────────────────────────────────────────────────
-- order_flow — the lifecycle, as data
-- ───────────────────────────────────────────────────────────────────────────

-- ORDER_FLOW from app/utils/constants/orderStatus.ts, stored rather than
-- encoded in a CASE. Two reasons: can_transition() becomes one join, and the
-- Phase G parity test can assert the table equals the TS constant in a single
-- query instead of trusting two hand-written copies to stay in step.
create table public.order_flow (
  payment_method text not null check (payment_method in ('bank_transfer','pay_on_delivery')),
  position       int  not null check (position > 0),
  status         text not null,
  primary key (payment_method, position),
  unique (payment_method, status)
);

insert into public.order_flow (payment_method, position, status) values
  ('bank_transfer',   1, 'received'),
  ('bank_transfer',   2, 'confirmed'),
  ('bank_transfer',   3, 'shipped'),
  ('bank_transfer',   4, 'delivered'),
  ('pay_on_delivery', 1, 'received'),
  ('pay_on_delivery', 2, 'shipped'),
  ('pay_on_delivery', 3, 'delivered');

alter table public.order_flow enable row level security;

-- Line-for-line mirror of nextStatuses() / canTransition(). The three branches
-- correspond exactly to the TS:
--   TERMINAL_STATUSES.includes(status)  -> []
--   cancelled reachable from any non-terminal
--   next = flow[index + 1]; index === -1 falls out as no matching row
create function public.can_transition(p_from text, p_to text, p_payment text)
returns boolean
language sql stable parallel safe
set search_path = ''
as $$
  select case
    when p_from in ('delivered','cancelled') then false
    when p_to = 'cancelled' then true
    else exists (
      select 1
      from public.order_flow f
      join public.order_flow n
        on n.payment_method = f.payment_method and n.position = f.position + 1
      where f.payment_method = p_payment and f.status = p_from and n.status = p_to)
  end;
$$;

-- So the admin UI can build its controls from the database rather than a
-- hard-coded list, matching what api.ts asks of AdminOrdersRepository.
create function public.next_statuses(p_from text, p_payment text)
returns text[]
language sql stable parallel safe
set search_path = ''
as $$
  select case
    when p_from in ('delivered','cancelled') then '{}'::text[]
    else array_remove(array[
      (select n.status
         from public.order_flow f
         join public.order_flow n
           on n.payment_method = f.payment_method and n.position = f.position + 1
        where f.payment_method = p_payment and f.status = p_from),
      'cancelled'], null)
  end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- orders
-- ───────────────────────────────────────────────────────────────────────────

create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  -- JB-XXXXXX in Crockford base32. Doubles as the bank transfer reference, and
  -- because lookup_order() is anon-callable it is effectively a bearer token —
  -- hence 32^6 (~1.07e9) rather than BGI's six digits (1e6). Stored canonical
  -- uppercase so the lookup is an indexable equality, not upper(col) = upper(x).
  order_number         text not null unique
                         check (order_number ~ '^JB-[0-9A-HJKMNP-TV-Z]{6}$'),
  user_id              uuid references auth.users (id) on delete set null,
  status               text not null default 'received'
                         check (status in ('received','confirmed','shipped','delivered','cancelled')),
  payment_method       text not null
                         check (payment_method in ('bank_transfer','pay_on_delivery')),
  items                jsonb not null check (items is json array and jsonb_array_length(items) > 0),
  subtotal_ngn         bigint not null check (subtotal_ngn >= 0),
  delivery_method      text not null check (delivery_method in ('dispatch','flight')),
  -- Lagos area or state name, taken from the ADDRESS rather than the rate row,
  -- so an unpriced destination still records where the piece was going.
  delivery_destination text not null check (length(btrim(delivery_destination)) > 0),
  -- null ⇒ destination not priced yet; the fee follows by email.
  delivery_fee_ngn     bigint check (delivery_fee_ngn is null or delivery_fee_ngn >= 0),
  -- Generated, not stored: the admin fills the fee AFTER the order exists on an
  -- unpriced destination, and a plain column would drift the moment she does.
  -- (STORED because virtual generated columns are PG18.)
  total_ngn            bigint not null generated always as
                         (subtotal_ngn + coalesce(delivery_fee_ngn, 0)) stored,
  shipping_address     jsonb not null check (
                         shipping_address ?& array['full_name','email','phone','line1','city','state','country']),
  -- The single-definition mirror of isPaid(). Generated so it is indexable and
  -- cannot drift from the TS, and so a partial index over it never goes stale
  -- the way one over a user function would.
  is_paid              boolean not null generated always as (
                         case payment_method
                           when 'bank_transfer'   then status in ('confirmed','shipped','delivered')
                           when 'pay_on_delivery' then status = 'delivered'
                           else false
                         end) stored,
  paid_at              timestamptz,
  status_history       jsonb not null default '[]' check (status_history is json array),
  created_at           timestamptz not null default now(),

  -- `confirmed` means the money has been seen, which only happens on a
  -- transfer. Re-evaluated on every UPDATE, so a currently-confirmed order
  -- cannot be flipped to pay-on-delivery. The pass-through hole — confirmed,
  -- then shipped, THEN change the method — is closed by payment_method being
  -- immutable in orders_guard_immutable() below.
  constraint orders_confirmed_is_transfer check (
    status <> 'confirmed' or payment_method = 'bank_transfer'),

  -- The method really is derived from the address, structurally, so no future
  -- writer can break the derivation. All operands are immutable, which is what
  -- makes this legal in a CHECK.
  constraint orders_method_matches_address check (
    delivery_method = case
      when lower(btrim(shipping_address ->> 'state')) = 'lagos' then 'dispatch'
      else 'flight' end),

  -- A cancelled order keeps paid_at: money was received and refunded, and an
  -- equality check would destroy that record.
  constraint orders_paid_at_sane check (
    paid_at is null
    or (payment_method = 'bank_transfer'
        and status in ('confirmed','shipped','delivered','cancelled'))
    or (payment_method = 'pay_on_delivery'
        and status in ('delivered','cancelled')))
);

alter table public.orders enable row level security;

-- Appends the status change to the timeline.
--
-- Two fixes over BGI: it reads `new.status_history`, not `old.` — BGI's version
-- silently discards history set by the same UPDATE, which is exactly what would
-- happen now that advance_order_status() writes the entry with its note — and it
-- pins the timestamp to UTC with a literal Z. A bare now() renders in the
-- session TimeZone: correct under PostgREST, offset under psql, and an
-- offsetless ISO string parses as LOCAL time in JS.
create function public.append_order_status_history()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(new.status_history -> -1 ->> 'status', '') is distinct from new.status then
    new.status_history := coalesce(new.status_history, '[]'::jsonb)
      || jsonb_build_object(
           'status', new.status,
           'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  end if;
  return new;
end;
$$;

create trigger orders_status_history
  before update on public.orders
  for each row execute function public.append_order_status_history();

-- An order is append-mostly. The column GRANTs below already stop a client
-- writing anything but delivery_fee_ngn; this catches the service role too, and
-- re-checks the transition on any UPDATE path so nothing can route around
-- advance_order_status().
create function public.orders_guard_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- `user_id` is handled separately from the rest, because it has one
  -- legitimate transition: `orders.user_id references auth.users on delete set
  -- null`, so deleting an account NULLs it. Folding it into the tuple below
  -- made that cascade raise, which meant a customer who had ever ordered could
  -- never be deleted — account deletion and test teardown both blocked. The
  -- order must survive the account (it is a financial record), but it must not
  -- be reassignable to a different person.
  if new.user_id is distinct from old.user_id and new.user_id is not null then
    raise exception 'An order cannot be reassigned to another account.'
      using hint = 'illegal_transition';
  end if;

  if (new.order_number, new.items, new.subtotal_ngn,
      new.payment_method, new.delivery_method, new.delivery_destination,
      new.shipping_address, new.created_at)
     is distinct from
     (old.order_number, old.items, old.subtotal_ngn,
      old.payment_method, old.delivery_method, old.delivery_destination,
      old.shipping_address, old.created_at) then
    raise exception 'That column is immutable once the order is placed.'
      using hint = 'illegal_transition';
  end if;

  if new.status is distinct from old.status
     and not public.can_transition(old.status, new.status, old.payment_method) then
    raise exception 'Cannot move a % order from % to %.',
      old.payment_method, old.status, new.status
      using hint = 'illegal_transition';
  end if;

  return new;
end;
$$;

-- BEFORE, and after the history trigger alphabetically ('orders_g' < 'orders_s'
-- so this one runs first) — the guard should reject before anything is appended.
create trigger orders_guard before update on public.orders
  for each row execute function public.orders_guard_immutable();


-- ───────────────────────────────────────────────────────────────────────────
-- order_emails — idempotency for the notify route
-- ───────────────────────────────────────────────────────────────────────────

-- Six templates means a single `notified_at` on orders cannot express "shipped
-- sent, delivered not". The PK is the durable guard against a replayed request
-- or a double click; Resend's own idempotency key only covers 24 hours and a
-- byte-identical payload. Deliberately NOT a column on orders: it is not in the
-- Order contract and would leak through a select.
create table public.order_emails (
  order_id uuid not null references public.orders (id) on delete cascade,
  kind     text not null check (kind in
             ('received_transfer','received_on_delivery','confirmed',
              'shipped','delivered','cancelled')),
  sent_at  timestamptz not null default now(),
  primary key (order_id, kind)
);

-- RLS on with no policies at all: service role only.
alter table public.order_emails enable row level security;


-- ───────────────────────────────────────────────────────────────────────────
-- wishlists, announcements
-- ───────────────────────────────────────────────────────────────────────────

create table public.wishlists (
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.wishlists enable row level security;

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  message    text not null check (length(btrim(message)) > 0),
  is_active  boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

create function public.enforce_single_active_announcement()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.announcements
  set is_active = false
  where id <> new.id and is_active;
  return new;
end;
$$;

-- `when (new.is_active)` also prevents recursion: the inner update only sets
-- rows to false, so the trigger never refires.
create trigger announcements_single_active
  before insert or update of is_active on public.announcements
  for each row when (new.is_active)
  execute function public.enforce_single_active_announcement();


-- ───────────────────────────────────────────────────────────────────────────
-- rate_limits
-- ───────────────────────────────────────────────────────────────────────────

-- Postgres-backed because the app deploys to Vercel serverless, where
-- in-memory limiting is theatre — every request may be a new instance.
--
-- UNLOGGED: this takes a write on every limited request and the data is
-- disposable, so skipping WAL is free. It is not replicated and not in PITR,
-- which is fine — losing it just resets windows. fillfactor + aggressive
-- autovacuum because one row gets rewritten thousands of times a day and needs
-- room for HOT updates.
create unlogged table public.rate_limits (
  key          text primary key,
  count        int not null default 0,
  window_start timestamptz not null default now()
) with (fillfactor = 70,
        autovacuum_vacuum_scale_factor = 0,
        autovacuum_vacuum_threshold = 200);

-- RLS on with no policies: nothing but a definer function or the service role.
alter table public.rate_limits enable row level security;

-- One atomic upsert, never read-then-write.
create function public.check_rate_limit(
  p_key    text,
  p_limit  int      default 10,
  p_window interval default '5 minutes'
) returns boolean
language plpgsql volatile security definer
set search_path = ''
as $$
declare v_count int;
begin
  -- Fail closed on a malformed key rather than granting unlimited budget.
  if coalesce(btrim(p_key), '') = '' or p_limit < 1 then
    return false;
  end if;

  insert into public.rate_limits as r (key, count, window_start)
  values (left(btrim(p_key), 200), 1, now())
  on conflict (key) do update
    set count        = case when r.window_start < now() - p_window then 1
                            else r.count + 1 end,
        window_start = case when r.window_start < now() - p_window then now()
                            else r.window_start end
  returning r.count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Used by lookup_order() to forgive a customer who mistyped and then succeeded.
-- Safe: anyone who has found a valid order already has what enumeration wanted.
create function public.clear_rate_limit(p_key text)
returns void
language sql volatile security definer
set search_path = ''
as $$
  delete from public.rate_limits where key = left(btrim(p_key), 200);
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- Order number
-- ───────────────────────────────────────────────────────────────────────────

-- Crockford base32: 0-9 A-Z minus I, L, O and U, so the reference survives
-- being read down a phone line or written into a transfer narration.
--
-- gen_random_uuid() is CSPRNG-backed and lives in pg_catalog, so this needs no
-- pgcrypto and no schema qualification. Bytes 0-5 of a v4 UUID are all random
-- (version and variant sit in bytes 6 and 8), and 256 = 8 x 32, so `byte & 31`
-- is perfectly uniform with no bit-packing.
create function public.order_ref_suffix()
returns text
language sql volatile
set search_path = ''
as $$
  select string_agg(
           substr('0123456789ABCDEFGHJKMNPQRSTVWXYZ',
                  (get_byte(b.bytes, i) & 31) + 1, 1),
           '' order by i)
  from (select uuid_send(gen_random_uuid()) as bytes) b,
       lateral generate_series(0, 5) as i;
$$;

-- Crockford's decoding rules: case-insensitive, I and L read as 1, O reads as
-- 0. Tolerates 'jb 0l1z2s', 'JB-0L1Z2S' and a bare '01IZ2S'. Returns null when
-- the input cannot be a reference at all, which callers treat as a miss.
create function public.normalize_order_ref(p_ref text)
returns text
language sql immutable parallel safe
set search_path = ''
as $$
  with a as (select translate(upper(coalesce(p_ref, '')), 'ILO', '110') as u),
       b as (select regexp_replace(u, '[^0-9A-Z]', '', 'g') as c from a),
       d as (select case when c like 'JB%' and length(c) = 8 then substr(c, 3)
                        else c end as s from b)
  select case when s ~ '^[0-9A-HJKMNP-TV-Z]{6}$' then 'JB-' || s end from d;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- place_order
-- ───────────────────────────────────────────────────────────────────────────

-- The only path by which a row reaches `orders` — there is no INSERT policy.
--
-- Everything that decides money is computed here: prices come from the
-- catalogue, the delivery method is derived from the address, and the fee comes
-- from delivery_rates. `p_items` carries ids and quantities only; PlaceOrderInput
-- in types/shop.ts has no price field, and any price a caller sends anyway is
-- read by nothing.
--
-- Behaviour is deliberately identical to mockOrdersRepo.place() so the Phase F
-- swap changes nothing, with one exception: this rejects a sold-out piece.
create function public.place_order(
  p_items    jsonb,
  p_address  jsonb,
  p_delivery jsonb default '{}'::jsonb,
  p_payment  text  default 'bank_transfer'
) returns public.orders
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_state     text;
  v_area      text;
  v_email     text;
  v_address   jsonb;
  v_method    text;
  v_dest      text;
  v_canonical text;
  v_rate_id   uuid;
  v_fee       bigint;
  v_ref       text;
  v_line      record;
  v_product   public.products%rowtype;
  v_variant   public.product_variants%rowtype;
  v_price     bigint;
  v_label     text;
  v_items     jsonb := '[]'::jsonb;
  v_subtotal  bigint := 0;
  v_units     int := 0;
  v_number    text;
  v_try       int;
  v_order     public.orders%rowtype;
begin
  -- ── 1. Cart shape. Cheapest rejections first, so a hostile caller cannot
  --       make us do work. BGI caps per-line quantity but not the number of
  --       lines, so a 10,000-line cart was 10,000 indexed lookups inside a
  --       definer function, callable by anon.
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your bag is empty.' using hint = 'empty_cart';
  end if;

  if jsonb_array_length(p_items) > 50 then
    raise exception 'Too many different pieces in one order.'
      using hint = 'invalid_quantity';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) i
    where coalesce(i ->> 'quantity', '') !~ '^[0-9]{1,2}$'
       or (i ->> 'quantity')::int < 1
  ) then
    raise exception 'That quantity is not valid.' using hint = 'invalid_quantity';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) i
    where coalesce(i ->> 'product_id', '')
            !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  ) then
    raise exception 'A piece in your bag is no longer available.'
      using hint = 'product_unavailable';
  end if;

  -- ── 2. Payment method.
  if p_payment is null or p_payment not in ('bank_transfer','pay_on_delivery') then
    raise exception 'Choose a payment method.' using hint = 'invalid_payment_method';
  end if;

  -- ── 3. Rebuild the address from known fields.
  --       BGI stores `p_address` verbatim, which means whatever a caller sent
  --       lands in the vendor's inbox and the admin modal — a 2MB note, extra
  --       keys, anything. Rebuilding from the nine Address fields with length
  --       caps makes that impossible by construction.
  v_state := btrim(coalesce(p_address ->> 'state', ''));
  v_area  := nullif(btrim(coalesce(p_address ->> 'area', '')), '');
  v_email := lower(btrim(coalesce(p_address ->> 'email', '')));

  if v_state = '' or not (v_state = any (public.nigerian_states())) then
    raise exception 'Choose a valid delivery state.' using hint = 'invalid_address';
  end if;
  -- Case-insensitive, mirroring deliveryMethodForState() exactly.
  if lower(v_state) = 'lagos' and v_area is null then
    raise exception 'Choose your area in Lagos.' using hint = 'invalid_address';
  end if;
  if coalesce(p_address ->> 'country', 'NG') <> 'NG' then
    raise exception 'We deliver within Nigeria only.' using hint = 'invalid_address';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.' using hint = 'invalid_address';
  end if;
  if btrim(coalesce(p_address ->> 'full_name', '')) = ''
     or btrim(coalesce(p_address ->> 'phone', '')) = ''
     or btrim(coalesce(p_address ->> 'line1', '')) = ''
     or btrim(coalesce(p_address ->> 'city', '')) = '' then
    raise exception 'Your delivery details are incomplete.' using hint = 'invalid_address';
  end if;

  -- Lowercasing the email at write time is also what makes guest tracking work:
  -- lookup_order() matches on the stored value.
  v_address := jsonb_strip_nulls(jsonb_build_object(
    'full_name', left(btrim(p_address ->> 'full_name'), 120),
    'email',     v_email,
    'phone',     left(btrim(p_address ->> 'phone'), 24),
    'line1',     left(btrim(p_address ->> 'line1'), 200),
    'line2',     nullif(left(btrim(coalesce(p_address ->> 'line2', '')), 200), ''),
    'city',      left(btrim(p_address ->> 'city'), 80),
    'state',     v_state,
    'area',      case when lower(v_state) = 'lagos' then left(v_area, 80) end,
    'country',   'NG',
    'notes',     nullif(left(btrim(coalesce(p_address ->> 'notes', '')), 500), '')
  ));

  -- ── 4. Rate limit, once the email is known and before any catalogue work.
  --       Keyed on the normalised address, so Ada@x.com and ada@x.com share a
  --       budget. Five rather than three: a false positive blocks a real sale on
  --       a high-value piece. Postgres cannot see the client IP
  --       (inet_client_addr() is the pooler), so this catches double-submits and
  --       casual abuse, not someone rotating addresses.
  if not public.check_rate_limit('order:' || v_email, 5, interval '1 hour') then
    raise exception 'You have placed several orders in a short time. Please wait a few minutes, or contact us and we will help.'
      using hint = 'order_rate_limited';
  end if;

  -- ── 5. Reprice every line from the catalogue.
  --       Duplicate (product, variant) pairs are folded together FIRST, or the
  --       same piece listed twice dodges both the quantity cap and the stock
  --       check.
  for v_line in
    select (s.pid)::uuid as product_id,
           (s.vid)::uuid as variant_id,
           sum(s.qty)::int as quantity
    from (
      select i ->> 'product_id' as pid,
             nullif(btrim(coalesce(i ->> 'variant_id', '')), '') as vid,
             (i ->> 'quantity')::int as qty
      from jsonb_array_elements(p_items) i
    ) s
    group by s.pid, s.vid
    order by s.pid, s.vid
  loop
    if v_line.quantity > 99 then
      raise exception 'That quantity is not valid.' using hint = 'invalid_quantity';
    end if;

    -- `archived_at is null` matters: BGI has no such filter, so an archived
    -- product stays orderable by id forever.
    select * into v_product
    from public.products
    where id = v_line.product_id and archived_at is null;
    if not found then
      raise exception 'A piece in your bag is no longer available.'
        using hint = 'product_unavailable';
    end if;

    if v_line.variant_id is not null then
      select * into v_variant
      from public.product_variants
      where id = v_line.variant_id and product_id = v_product.id;
      if not found then
        raise exception 'A selected option for % is no longer available.', v_product.name
          using hint = 'variant_unavailable';
      end if;
      v_price := v_variant.price_ngn;
      v_label := v_variant.label;
    else
      v_price := v_product.price_ngn;
      v_label := null;
    end if;

    -- Made to order is built on demand, so in_stock carries no meaning for it.
    -- This mirrors productAvailability(), where made_to_order short-circuits
    -- BEFORE in_stock is consulted — for the variant too, not just the product.
    if not v_product.made_to_order then
      if v_line.variant_id is not null then
        if not v_variant.in_stock then
          raise exception '% (%) is sold out.', v_product.name, v_variant.label
            using hint = 'sold_out';
        end if;
      elsif not v_product.in_stock then
        raise exception '% is sold out.', v_product.name using hint = 'sold_out';
      end if;
    end if;

    -- The snapshot carries `brand`, where BGI carried `grams`. OrderItem in
    -- types/shop.ts requires it and the emails render it.
    v_items := v_items || jsonb_strip_nulls(jsonb_build_object(
      'product_id',    v_product.id,
      'name',          v_product.name,
      'brand',         v_product.brand,
      'price_ngn',     v_price,
      'quantity',      v_line.quantity,
      'image',         coalesce(v_product.images[1], ''),
      'variant_id',    v_line.variant_id,
      'variant_label', v_label
    ));
    v_subtotal := v_subtotal + v_price * v_line.quantity;
    v_units := v_units + v_line.quantity;
  end loop;

  if v_units > 200 then
    raise exception 'That quantity is not valid.' using hint = 'invalid_quantity';
  end if;

  -- ── 6. Delivery: derived from the address, never taken from the client.
  v_method := case when lower(v_state) = 'lagos' then 'dispatch' else 'flight' end;
  v_dest   := case when v_method = 'dispatch' then v_area else v_state end;

  select r.id, r.fee_ngn, r.name
    into v_rate_id, v_fee, v_canonical
  from public.delivery_rates r
  where r.mode = v_method and lower(r.name) = lower(v_dest) and r.active;

  -- No active row is NOT an error: it is a destination she has not priced yet.
  -- The order is placed with a null fee and the amount follows by email. A null
  -- fee can never undercharge, so this is always the safe direction.
  if v_canonical is not null then
    v_dest := v_canonical;   -- store her casing, not the customer's
  end if;

  -- A client-sent rate_id is an assertion to check, not a source of truth. The
  -- mock repository ignores it entirely and re-resolves; disagreeing means
  -- someone is trying to attach a cheaper destination to this address.
  if nullif(btrim(coalesce(p_delivery ->> 'rate_id', '')), '') is not null then
    if (p_delivery ->> 'rate_id')
         !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or (p_delivery ->> 'rate_id')::uuid is distinct from v_rate_id then
      raise exception 'That delivery rate does not match your address.'
        using hint = 'rate_mismatch';
    end if;
  end if;

  -- ── 7. Allocate the reference. Bounded at 8 attempts: BGI's loop is
  --       unbounded and catches ANY unique_violation from the insert, so the
  --       day a second unique constraint lands on orders it spins forever,
  --       burning a subtransaction per turn.
  for v_try in 1..8 loop
    v_number := 'JB-' || public.order_ref_suffix();
    begin
      insert into public.orders (
        order_number, user_id, status, payment_method, items, subtotal_ngn,
        delivery_method, delivery_destination, delivery_fee_ngn,
        shipping_address, status_history
      ) values (
        v_number, (select auth.uid()), 'received', p_payment, v_items, v_subtotal,
        v_method, v_dest, v_fee, v_address,
        jsonb_build_array(jsonb_build_object(
          'status', 'received',
          'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))
      ) returning * into v_order;
      exit;
    exception when unique_violation then
      if v_try = 8 then raise; end if;
    end;
  end loop;

  return v_order;
end;
$$;

-- Guest checkout is allowed, so anon must be able to place an order. This is
-- the entire public write surface of the schema.
grant execute on function public.place_order(jsonb, jsonb, jsonb, text) to anon, authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- advance_order_status
-- ───────────────────────────────────────────────────────────────────────────

-- Admin only. Validates the move against the order's own payment method, so the
-- two lanes stay correct without the UI being the gate: `received → shipped` is
-- refused on a transfer, and `confirmed` is refused outright on pay-on-delivery.
create function public.advance_order_status(
  p_order_id uuid,
  p_to       text,
  p_note     text default null
) returns public.orders
language plpgsql volatile security definer
set search_path = ''
as $$
declare v_o public.orders%rowtype;
begin
  if not (select public.is_admin()) then
    raise exception 'Admin only.' using hint = 'not_admin', errcode = '42501';
  end if;

  -- FOR UPDATE so two admins clicking at once serialise rather than both
  -- advancing from the same starting status.
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using hint = 'order_not_found';
  end if;

  if not public.can_transition(v_o.status, p_to, v_o.payment_method) then
    raise exception 'Cannot move a % order from % to %.',
      v_o.payment_method, v_o.status, p_to
      using hint = 'illegal_transition';
  end if;

  update public.orders o
  set status  = p_to,
      -- coalesce-by-fallthrough, so paid_at survives confirmed → shipped →
      -- delivered. Matches isPaid().
      paid_at = case
                  when p_to = 'confirmed' and o.payment_method = 'bank_transfer'   then now()
                  when p_to = 'delivered' and o.payment_method = 'pay_on_delivery' then now()
                  else o.paid_at
                end,
      status_history = o.status_history || jsonb_strip_nulls(jsonb_build_object(
        'status', p_to,
        'at',     to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'note',   nullif(left(btrim(coalesce(p_note, '')), 500), '')))
  where o.id = p_order_id
  returning * into v_o;

  -- Stock comes off at COMMITMENT, not at checkout.
  --
  -- Neither payment method captures money when the order is placed, so
  -- decrementing in place_order() would let any anonymous visitor drain visible
  -- inventory with junk guest orders — with nothing to reverse, and owing
  -- restock-on-cancel and restock-on-no-show. stock_count is advisory in the
  -- contract anyway: productAvailability() treats in_stock as the authority.
  --
  -- Here it is admin-serialised by the FOR UPDATE above, so there is no
  -- contention and no deadlock to order locks against. Transitions are strictly
  -- sequential and never revisit a status, so this fires at most once per order.
  if (p_to = 'confirmed' and v_o.payment_method = 'bank_transfer')
     or (p_to = 'shipped' and v_o.payment_method = 'pay_on_delivery') then
    update public.products p
    set stock_count = greatest(p.stock_count - l.qty, 0),
        in_stock    = case when p.stock_count - l.qty <= 0 and not p.made_to_order
                           then false else p.in_stock end
    from (
      select (i ->> 'product_id')::uuid as pid, sum((i ->> 'quantity')::int) as qty
      from jsonb_array_elements(v_o.items) i
      group by 1
    ) l
    where p.id = l.pid and p.stock_count is not null;
  end if;

  return v_o;
end;
$$;



-- ───────────────────────────────────────────────────────────────────────────
-- lookup_order — guest tracking
-- ───────────────────────────────────────────────────────────────────────────

-- VOLATILE plpgsql, not `language sql stable` as in BGI. It writes (the rate
-- limit), and a STABLE function cannot INSERT at all — PostgREST runs stable
-- RPCs in a READ ONLY transaction, so the write would fail there specifically.
--
-- Throttled on TWO keys. One is defeated by rotating the other field: keying on
-- email alone leaves the whole reference space grindable by anyone holding one
-- known address, which is exactly what the 1.07e9 keyspace was for. Charging
-- both means rotating one field still burns down the other.
create function public.lookup_order(p_order_ref text, p_email text)
returns setof public.orders
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_ref   text;
  v_email text;
  v_order public.orders%rowtype;
begin
  v_ref   := public.normalize_order_ref(p_order_ref);
  v_email := lower(btrim(coalesce(p_email, '')));

  if v_email = '' then
    return;
  end if;

  -- An indexable equality on the canonical stored value. BGI compares
  -- upper(order_number) = upper(trim(...)), which cannot use the index.
  if v_ref is not null then
    select * into v_order
    from public.orders
    where order_number = v_ref
      and lower(shipping_address ->> 'email') = v_email;
  end if;

  if v_order.id is not null then
    -- Forgive a customer who mistyped twice and then succeeded. Safe: anyone
    -- who has found a valid order already has what enumeration was after.
    perform public.clear_rate_limit('lookup:email:' || v_email);
    perform public.clear_rate_limit('lookup:ref:' || v_ref);
    return next v_order;
    return;
  end if;

  -- A miss. Charge both budgets. A malformed reference counts too — that is
  -- probing, not a typo pattern worth excusing.
  if not public.check_rate_limit('lookup:email:' || v_email, 10, interval '15 minutes')
     or not public.check_rate_limit('lookup:ref:' || coalesce(v_ref, '-'), 10, interval '15 minutes') then
    raise exception 'Too many lookup attempts. Please wait a few minutes and try again.'
      using hint = 'lookup_rate_limited';
  end if;

  -- Not found is an empty result, never an error: "no such order" is a normal
  -- answer. Only the limit raises.
  return;
end;
$$;

grant execute on function public.lookup_order(text, text) to anon, authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- get_payment_instructions
-- ───────────────────────────────────────────────────────────────────────────

-- Bank details are order-scoped, not published. The contract says so:
-- PAYMENT_METHODS.bank_transfer.description reads "Account details shown after
-- you order". Proving you hold the order id and the email used at checkout is
-- what buys them — a scraper with the anon key gets nothing.
create function public.get_payment_instructions(p_order_id uuid, p_email text)
returns jsonb
language sql volatile security definer
set search_path = ''
as $$
  select s.value
  from public.orders o, public.site_settings s
  where o.id = p_order_id
    and lower(o.shipping_address ->> 'email') = lower(btrim(coalesce(p_email, '')))
    and o.payment_method = 'bank_transfer'
    and s.key = 'bank_account';
$$;

grant execute on function public.get_payment_instructions(uuid, text) to anon, authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- search_products
-- ───────────────────────────────────────────────────────────────────────────

-- Trigram, not a stored tsvector, and the reasoning matters because the obvious
-- choice is wrong here. At a few hundred products the index is decoration — a
-- seq scan is sub-millisecond — so this is a choice about match quality, and
-- tsvector loses on all three axes that matter: it cannot do infix matching at
-- all ("idian" finds nothing), Snowball stemming mangles brand names, and it has
-- no typo tolerance. A stored tsvector is also 1-3KB per row that a `select *`
-- would ship to every grid page.
--
-- AND-ing an ilike per token recovers tsvector's one real advantage — matching
-- words that live in different columns — and similarity() gives ranking free.
create function public.search_products(p_q text, p_limit int default 20)
returns setof public.products
language sql stable
set search_path = ''
as $$
  with q as (
    select array_agg('%' || t || '%') as pats,
           btrim(lower(coalesce(p_q, ''))) as raw
    from unnest(string_to_array(btrim(lower(coalesce(p_q, ''))), ' ')) t
    where t <> ''
  )
  select p.*
  from public.products p, q
  where p.archived_at is null
    and q.pats is not null
    and (p.name || ' ' || p.brand || ' ' || p.description) ilike all (q.pats)
  order by extensions.similarity(p.name || ' ' || p.brand, q.raw) desc,
           p.featured desc, p.created_at desc, p.id
  limit least(coalesce(p_limit, 20), 50);
$$;

grant execute on function public.search_products(text, int) to anon, authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- Admin analytics
-- ───────────────────────────────────────────────────────────────────────────

-- SECURITY INVOKER with an explicit guard, not DEFINER: the admin's own RLS
-- policy already grants SELECT on every order, so definer would buy nothing but
-- attack surface. Returns jsonb so the keys match AdminStats in
-- app/utils/types/admin.ts exactly.
--
-- BGI pulls up to 5,000 order rows into the browser and aggregates in JS. This
-- is the same answer in one round trip.
create function public.admin_stats()
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare v jsonb;
begin
  if not (select public.is_admin()) then
    raise exception 'Admin only.' using hint = 'not_admin', errcode = '42501';
  end if;

  select jsonb_build_object(
    'orders_total', count(*),
    -- Placed, transfer, money not yet seen.
    'orders_awaiting_payment', count(*) filter (
       where o.status = 'received' and o.payment_method = 'bank_transfer'),
    -- Whose next step is `shipped`, in either lane.
    'orders_to_ship', count(*) filter (
       where (o.payment_method = 'bank_transfer'   and o.status = 'confirmed')
          or (o.payment_method = 'pay_on_delivery' and o.status = 'received')),
    'revenue_ngn', coalesce(sum(o.total_ngn) filter (where o.is_paid), 0)
  ) into v
  from public.orders o;

  return v || (
    select jsonb_build_object(
      'products_total', count(*),
      'products_out_of_stock', count(*) filter (where not p.in_stock))
    from public.products p
    where p.archived_at is null);
end;
$$;

-- Day buckets are Africa/Lagos, not UTC: revenue booked at 23:30 WAT belongs on
-- today's bar, and a UTC bucket would put it on yesterday's.
create function public.admin_analytics(p_days int default 30)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  v_days  int;
  v_today date;
  v_from  timestamptz;
  v       jsonb;
begin
  if not (select public.is_admin()) then
    raise exception 'Admin only.' using hint = 'not_admin', errcode = '42501';
  end if;

  v_days  := greatest(least(coalesce(p_days, 30), 365), 1);
  v_today := (now() at time zone 'Africa/Lagos')::date;
  -- A literal timestamptz, so the planner can use orders(created_at desc).
  v_from  := (v_today - (v_days - 1))::timestamp at time zone 'Africa/Lagos';

  with scoped as (
    select o.id, o.status, o.total_ngn, o.items, o.is_paid,
           (o.created_at at time zone 'Africa/Lagos')::date as day
    from public.orders o
    where o.created_at >= v_from
  ),
  paid as (select * from scoped where is_paid),
  days as (
    select g::date as day
    from generate_series(v_today - (v_days - 1), v_today, interval '1 day') g
  ),
  -- Left join against the full day series, so a quiet day is a zero rather than
  -- a gap the chart would silently close up.
  revenue as (
    select d.day,
           coalesce(sum(p.total_ngn), 0)::bigint as revenue_ngn,
           count(p.id)::int as orders
    from days d
    left join paid p on p.day = d.day
    group by d.day
  ),
  -- Every status present even at zero, so the doughnut's legend is stable.
  breakdown as (
    select jsonb_object_agg(s.status, coalesce(c.n, 0)) as v
    from unnest(array['received','confirmed','shipped','delivered','cancelled']) as s(status)
    left join (select status, count(*)::int n from scoped group by status) c
           on c.status = s.status
  ),
  -- PG17 json_table does the path extraction and the casts in one construct.
  lines as (
    select i.product_id, i.name, i.quantity, i.price_ngn * i.quantity as line_ngn
    from paid p
    cross join lateral json_table(p.items, '$[*]' columns (
      product_id uuid   path '$.product_id',
      name       text   path '$.name',
      quantity   int    path '$.quantity',
      price_ngn  bigint path '$.price_ngn'
    )) as i
    where i.product_id is not null and i.quantity > 0
  ),
  top as (
    select l.product_id,
           -- The snapshot name, so an archived piece still has a label.
           (array_agg(l.name order by l.name))[1] as name,
           sum(l.quantity)::int as units,
           sum(l.line_ngn)::bigint as revenue_ngn
    from lines l
    group by l.product_id
    order by 4 desc, 3 desc
    limit 10
  )
  select jsonb_build_object(
    'revenue', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date', to_char(r.day, 'YYYY-MM-DD'),
               'revenue_ngn', r.revenue_ngn,
               'orders', r.orders) order by r.day)
      from revenue r), '[]'::jsonb),
    'status_breakdown', coalesce((select b.v from breakdown b), '{}'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object(
               'product_id', t.product_id,
               'name', t.name,
               'units', t.units,
               'revenue_ngn', t.revenue_ngn) order by t.revenue_ngn desc)
      from top t), '[]'::jsonb)
  ) into v;

  return v;
end;
$$;



-- ───────────────────────────────────────────────────────────────────────────
-- Indexes
-- ───────────────────────────────────────────────────────────────────────────

-- Catalogue. Partial on `archived_at is null` because every storefront query
-- carries that predicate.
create index products_live_idx
  on public.products (category, created_at desc) where archived_at is null;
create index products_featured_idx
  on public.products (featured) where featured and archived_at is null;
create index products_tags_idx on public.products using gin (tags);
create index products_price_idx
  on public.products (price_ngn, id) where archived_at is null;
-- For the admin low-stock tile.
create index products_out_of_stock_idx
  on public.products (in_stock) where archived_at is null and not in_stock;
-- `extensions.gin_trgm_ops` written explicitly: under search_path = '' an
-- unqualified opclass in CREATE INDEX passes locally and fails hosted.
create index products_search_trgm_idx on public.products
  using gin ((name || ' ' || brand || ' ' || description) extensions.gin_trgm_ops)
  where archived_at is null;

create index product_variants_product_idx
  on public.product_variants (product_id, position);

-- Orders. Every paginated ORDER BY needs the id tiebreaker: created_at, status
-- and price all have ties, and without it page 2 repeats and skips rows. It is
-- the most commonly shipped pagination bug and it is invisible in mock data.
create index orders_user_idx on public.orders (user_id, created_at desc, id);
create index orders_status_idx on public.orders (status, created_at desc, id);
create index orders_created_at_idx on public.orders (created_at desc, id);
-- Revenue and top_products both scan paid orders in a window.
create index orders_paid_recent_idx
  on public.orders (created_at desc) where is_paid;
-- The admin order search box: reference, email or customer name.
create index orders_search_trgm_idx on public.orders using gin (
  (order_number || ' ' || coalesce(shipping_address ->> 'email', '')
                || ' ' || coalesce(shipping_address ->> 'full_name', ''))
  extensions.gin_trgm_ops);

create index delivery_rates_list_idx
  on public.delivery_rates (mode, position, name);

create index announcements_active_idx
  on public.announcements (created_at desc) where is_active;


-- ───────────────────────────────────────────────────────────────────────────
-- Row level security
--
-- Both auth.uid() and is_admin() are wrapped as `(select …)`. STABLE does not
-- mean Postgres caches a call per query — only a parameterless subquery gets
-- hoisted into an InitPlan and evaluated once. Unwrapped, is_admin() is one
-- profiles lookup PER ROW, which is the larger of the two wins.
-- ───────────────────────────────────────────────────────────────────────────

-- profiles ─────────────────────────────────────────────────────────────────
-- No INSERT policy: rows come only from the definer handle_new_user() trigger.
-- No DELETE policy: they cascade from auth.users.
create policy "Read own profile" on public.profiles
  for select using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Update own profile" on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Without this nobody can ever be promoted: BGI's only UPDATE policy is
-- own-row, and protect_profile_role() requires an admin to change a role, so
-- not even an admin could do it through the table.
create policy "Admin update profiles" on public.profiles
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

-- products ─────────────────────────────────────────────────────────────────
-- The soft delete belongs here, not only in the repository. Order history is
-- unaffected: orders.items is a snapshot and never reads this table.
create policy "Public read products" on public.products
  for select using (archived_at is null or (select public.is_admin()));

create policy "Admin write products" on public.products
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Public read variants" on public.product_variants
  for select using (
    (select public.is_admin())
    or exists (select 1 from public.products p
               where p.id = product_id and p.archived_at is null));

create policy "Admin write variants" on public.product_variants
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- delivery_rates ───────────────────────────────────────────────────────────
-- Public read of inactive rows too: a fee is not sensitive, and the admin table
-- needs them. DeliveryRepository.options() filters on `active` itself.
create policy "Public read rates" on public.delivery_rates
  for select using (true);

create policy "Admin write rates" on public.delivery_rates
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- site_settings ────────────────────────────────────────────────────────────
-- Not `using (true)`. The bank account lives here, and so will anything else
-- private that gets added later — a blanket policy publishes future keys by
-- default, which is the wrong direction for a table like this.
create policy "Public read public settings" on public.site_settings
  for select using (is_public or (select public.is_admin()));

create policy "Admin write settings" on public.site_settings
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- orders ───────────────────────────────────────────────────────────────────
-- No INSERT policy: place_order() is the only way in. No DELETE policy at all:
-- orders are cancelled, never deleted.
create policy "Read own orders" on public.orders
  for select using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admin update orders" on public.orders
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

-- order_flow ───────────────────────────────────────────────────────────────
-- Readable so the admin UI can build its transition controls from the database.
create policy "Public read flow" on public.order_flow for select using (true);

-- addresses, wishlists ─────────────────────────────────────────────────────
create policy "Own addresses" on public.addresses
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Own wishlist" on public.wishlists
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- announcements ────────────────────────────────────────────────────────────
create policy "Public read announcements" on public.announcements
  for select using (true);

create policy "Admin write announcements" on public.announcements
  for all using ((select public.is_admin())) with check ((select public.is_admin()));


-- ───────────────────────────────────────────────────────────────────────────
-- Column and table privileges
--
-- Supabase's ALTER DEFAULT PRIVILEGES grants everything on new public-schema
-- tables to anon and authenticated, so these revokes are not redundant — they
-- are what stops a policy gap from being a write. RLS has no column
-- granularity, which is why the orders grant is per-column.
-- ───────────────────────────────────────────────────────────────────────────

-- An order is append-mostly. Without this, BGI's `for update using (is_admin())`
-- lets an admin client rewrite items or subtotal_ngn straight from supabase-js,
-- and set status directly — bypassing advance_order_status(), its flow check and
-- its paid_at handling entirely. The one column an admin legitimately edits is
-- the later-quoted delivery fee.
revoke insert, update, delete on public.orders from anon, authenticated;
grant update (delivery_fee_ngn) on public.orders to authenticated;

-- Rows are created by the definer trigger and removed by cascade.
revoke insert, delete on public.profiles from anon, authenticated;

-- The lifecycle is not user data.
revoke insert, update, delete on public.order_flow from anon, authenticated;

-- Service role only, both of them.
revoke all on public.order_emails from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;

-- `from public`, not `from anon, authenticated`. Postgres grants EXECUTE on a
-- new function to PUBLIC by default, so revoking from the two Supabase roles
-- leaves the grant intact and the function still callable — verified the hard
-- way: `select check_rate_limit(...)` as `authenticated` succeeded until this
-- was corrected.
--
-- These two have no internal guard, and both are directly abusable: spending a
-- victim's order budget, or clearing the lookup throttle protecting their order.
-- BOTH, and both are required. Postgres grants EXECUTE to PUBLIC on every new
-- function, and Supabase's ALTER DEFAULT PRIVILEGES additionally grants it
-- explicitly to anon, authenticated and service_role. Revoking from one leaves
-- the other standing, and the function stays callable — verified twice the hard
-- way: `select check_rate_limit(...)` as `authenticated` succeeded after the
-- role-only revoke, and again after the PUBLIC-only revoke.
revoke execute on function public.check_rate_limit(text, int, interval) from public, anon, authenticated;
revoke execute on function public.clear_rate_limit(text) from public, anon, authenticated;
revoke execute on function public.order_ref_suffix() from public, anon, authenticated;

-- These do guard themselves with is_admin(), so removing the public grant is
-- defence in depth rather than the control — but there is no reason for anon to
-- hold EXECUTE on an admin function at all.
revoke execute on function public.advance_order_status(uuid, text, text) from public, anon;
revoke execute on function public.admin_stats() from public, anon;
revoke execute on function public.admin_analytics(int) from public, anon;
grant execute on function public.advance_order_status(uuid, text, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_analytics(int) to authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- Storage
-- ───────────────────────────────────────────────────────────────────────────

-- The size and MIME limits are the real guardrails: a public bucket without
-- them accepts arbitrary files at arbitrary size from anyone who passes the
-- insert policy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

create policy "Public read product images" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "Admin insert product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and (select public.is_admin()));

-- Both halves: `using` alone would let an admin move an object INTO this bucket
-- from another one without the check applying.
create policy "Admin update product images" on storage.objects
  for update using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "Admin delete product images" on storage.objects
  for delete using (bucket_id = 'product-images' and (select public.is_admin()));


-- ───────────────────────────────────────────────────────────────────────────
-- Realtime and scheduled maintenance
-- ───────────────────────────────────────────────────────────────────────────

-- The banner is the one thing worth pushing live. Never add `orders`: it would
-- stream other customers' rows to anyone subscribed, and RLS on a publication is
-- not the same guarantee as RLS on a query.
--
-- Wrapped so a bare-psql or CI run without the Supabase stack does not fail the
-- whole migration on a missing publication.
do $$
begin
  alter publication supabase_realtime add table public.announcements;
exception
  when undefined_object then raise notice 'supabase_realtime not present — skipped';
  when duplicate_object then null;
end;
$$;

-- Without a sweep the rate-limit key space grows without bound. pg_cron is not
-- available in every environment, so this is best-effort.
do $$
begin
  perform cron.schedule('rate-limits-sweep', '17 3 * * *',
    $sweep$delete from public.rate_limits where window_start < now() - interval '1 day'$sweep$);
exception
  when undefined_function or invalid_schema_name or insufficient_privilege then
    raise notice 'pg_cron not available — rate_limits will not be swept automatically';
end;
$$;
