-- Supabase schema for multi-tenant restaurant order app

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  phone_number text not null unique,
  business_type text,
  timezone text,
  is_active boolean not null default true
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin','staff','super_admin')),
  created_at timestamptz not null default now()
);

create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  category text,
  name text not null,
  price numeric(10,2) not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  source text not null check (source in ('voice_call','whatsapp','manual')),
  customer_name text,
  customer_phone text,
  order_type text not null check (order_type in ('pickup','delivery')),
  delivery_address text,
  status text not null check (status in ('new','in_progress','ready','completed','cancelled')),
  total_amount numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id) on delete set null,
  item_name text,
  quantity int not null default 1,
  unit_price numeric(10,2) not null default 0,
  customizations text
);

create table if not exists call_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  vapi_call_id text,
  duration_seconds int,
  cost_usd numeric(10,2),
  created_at timestamptz not null default now()
);

-- Optional event history table for easier webhook/realtime events
create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Policies for row level security
alter table businesses enable row level security;
create policy businesses_is_active on businesses
  for select using (is_active = true);

alter table users enable row level security;
create policy users_by_business on users
  for select using (auth.uid() = id or exists (
    select 1 from businesses b where b.id = business_id and b.is_active
  ));

alter table menu_items enable row level security;
create policy menu_items_by_business on menu_items
  for select using (business_id = current_setting('request.jwt.claims.business_id', true)::uuid)
  with check (business_id = current_setting('request.jwt.claims.business_id', true)::uuid);

alter table orders enable row level security;
create policy orders_by_business on orders
  for select, insert, update using (business_id = current_setting('request.jwt.claims.business_id', true)::uuid)
  with check (business_id = current_setting('request.jwt.claims.business_id', true)::uuid);

alter table order_items enable row level security;
create policy order_items_by_business on order_items
  for select using (order_id in (
    select id from orders where business_id = current_setting('request.jwt.claims.business_id', true)::uuid
  ));

alter table call_logs enable row level security;
create policy call_logs_by_business on call_logs
  for select using (business_id = current_setting('request.jwt.claims.business_id', true)::uuid);

-- Recommended: add a function to set business_id in JWT claims on login
-- and configure Supabase Auth to include business_id in the JWT.
