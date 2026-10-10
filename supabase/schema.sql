-- Fyxnora schema v1 - run once in Supabase SQL editor.
-- IMPORTANT: Only the server-side API may use the SERVICE_ROLE key.
create extension if not exists pgcrypto;
create type public.app_role as enum ('customer','technician','partner','regional','admin');
create table public.regions (id uuid primary key default gen_random_uuid(),name text not null, state text not null,country text not null default 'India',active boolean not null default true,created_at timestamptz not null default now());
create table public.partners (id uuid primary key default gen_random_uuid(),name text not null,legal_name text,kind text not null default 'repair_centre' check (kind in ('repair_centre','pickup','both')),contact_email text,contact_phone text,region_id uuid references public.regions(id),city text,pincode text,street_address text,verification_status text not null default 'pending' check(verification_status in('pending','verified','suspended')),commission_rate numeric(5,2) not null default 20 check(commission_rate between 0 and 100),created_at timestamptz not null default now());
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade,full_name text not null default '',email text not null,phone text,role public.app_role not null default 'customer',region_id uuid references public.regions(id),partner_id uuid references public.partners(id),active boolean not null default true,created_at timestamptz not null default now());
create table public.coverage_pincodes (id uuid primary key default gen_random_uuid(),pincode varchar(6) not null,region_id uuid references public.regions(id),partner_id uuid references public.partners(id),category text not null check(category in('Mobile','Laptop')),active boolean not null default true,unique(pincode,partner_id,category));
create table public.service_categories (id uuid primary key default gen_random_uuid(),name text not null unique,active boolean not null default true,sort_order int not null default 0);
insert into public.service_categories(name,sort_order) values('Mobile',1),('Laptop',2);
create sequence public.booking_reference_seq start 1001;
create table public.bookings (
 id uuid primary key default gen_random_uuid(),reference text not null unique default ('FX-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.booking_reference_seq')::text,6,'0')),
 customer_id uuid not null references public.profiles(id),category text not null check(category in('Mobile','Laptop')),
 brand text not null,model text not null,issue text not null,phone text not null,city text not null,pincode varchar(6) not null,address text not null,
 preferred_date date,status text not null default 'BOOKED' check(status in('BOOKED','ASSIGNED','VISIT_SCHEDULED','PICKUP_VERIFIED','IN_TRANSIT','RECEIVED_AT_CENTRE','DIAGNOSIS','QUOTE_SENT','CUSTOMER_APPROVED','REPAIRING','QUALITY_CHECK','READY_FOR_DELIVERY','OUT_FOR_DELIVERY','DELIVERED','CLOSED','QUOTE_REJECTED','RETURN_WITHOUT_REPAIR','PARTS_DELAYED','CUSTOMER_UNREACHABLE','DISPUTED','LOST_OR_DAMAGED','WARRANTY_REOPENED')),
 partner_id uuid references public.partners(id),technician_id uuid references public.profiles(id),regional_id uuid references public.profiles(id),
 quoted_amount numeric(12,2) check(quoted_amount>=0),quote_details text,approved_amount numeric(12,2),approved_at timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index bookings_customer_idx on public.bookings(customer_id,created_at desc);
create index bookings_partner_idx on public.bookings(partner_id,status);
create index bookings_technician_idx on public.bookings(technician_id,status);
create index bookings_region_idx on public.bookings(regional_id,status);
create index bookings_status_idx on public.bookings(status,created_at desc);
create table public.booking_events (id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id) on delete cascade,actor_id uuid references public.profiles(id),kind text not null,description text not null default '',created_at timestamptz not null default now());
create index booking_events_order_idx on public.booking_events(booking_id,created_at);
create table public.device_condition_reports(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),recorded_by uuid references public.profiles(id),serial_masked text,accessories jsonb not null default '[]',condition_notes text,damage_notes text,pickup_otp_hash text,customer_verified_at timestamptz,created_at timestamptz not null default now());
create table public.custody_events(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),from_actor uuid references public.profiles(id),to_actor uuid references public.profiles(id),handover_type text not null,location_text text,verification_reference text,notes text,created_at timestamptz not null default now());
create table public.booking_media(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),uploaded_by uuid references public.profiles(id),bucket text not null default 'private-booking-media',object_path text not null,media_type text not null default 'condition',created_at timestamptz not null default now());
create table public.quotation_items(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),label text not null,item_type text not null default 'labour' check(item_type in('labour','part','diagnosis','logistics','tax','discount')),quantity numeric(10,2) not null default 1,unit_amount numeric(12,2) not null default 0,tax_rate numeric(5,2) not null default 0,created_at timestamptz not null default now());
create table public.repair_tasks(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),assigned_to uuid references public.profiles(id),description text not null,status text not null default 'pending',started_at timestamptz,completed_at timestamptz);
create table public.inventory_items(id uuid primary key default gen_random_uuid(),partner_id uuid not null references public.partners(id),sku text not null,name text not null,quantity numeric(12,2) not null default 0,unit_cost numeric(12,2),unique(partner_id,sku));
create table public.repair_parts(id uuid primary key default gen_random_uuid(),booking_id uuid references public.bookings(id),inventory_item_id uuid references public.inventory_items(id),description text not null,qty numeric(10,2) not null default 1,created_at timestamptz default now());
create table public.quality_checks(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),checked_by uuid references public.profiles(id),checklist jsonb not null default '{}',passed boolean not null default false,notes text,checked_at timestamptz not null default now());
create table public.payments(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),gateway text,external_order_id text,external_payment_id text unique,amount numeric(12,2) not null,status text not null default 'pending',verified_at timestamptz,created_at timestamptz not null default now());
create table public.settlements(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),partner_id uuid references public.partners(id),gross_amount numeric(12,2) not null,commission_amount numeric(12,2) not null,net_amount numeric(12,2) not null,status text not null default 'pending',paid_at timestamptz);
create table public.warranty_claims(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),raised_by uuid references public.profiles(id),reason text not null,status text not null default 'open',created_at timestamptz not null default now());
create table public.support_tickets(id uuid primary key default gen_random_uuid(),booking_id uuid references public.bookings(id),customer_id uuid references public.profiles(id),subject text not null,description text not null,status text not null default 'open',created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id),booking_id uuid references public.bookings(id),channel text not null default 'email',template text not null,payload jsonb not null default '{}',status text not null default 'queued',sent_at timestamptz,created_at timestamptz not null default now());
create table public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id),entity_type text not null,entity_id uuid,action text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now());
create or replace function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
create trigger booking_updated before update on public.bookings for each row execute function public.set_updated_at();
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.profiles(id,full_name,email,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.email,''),'customer') on conflict(id) do nothing;return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Browser-side reads are disabled for private operational data in this release.
-- Route handlers verify the signed-in identity, role and scoped booking before using service role.
-- This prevents direct browser writes from circumventing state machine checks.
alter table public.regions enable row level security;
alter table public.partners enable row level security;
alter table public.profiles enable row level security;
alter table public.coverage_pincodes enable row level security;
alter table public.service_categories enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.device_condition_reports enable row level security;
alter table public.custody_events enable row level security;
alter table public.booking_media enable row level security;
alter table public.quotation_items enable row level security;
alter table public.repair_tasks enable row level security;
alter table public.inventory_items enable row level security;
alter table public.repair_parts enable row level security;
alter table public.quality_checks enable row level security;
alter table public.payments enable row level security;
alter table public.settlements enable row level security;
alter table public.warranty_claims enable row level security;
alter table public.support_tickets enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
-- Service role bypasses RLS only on trusted server. Do NOT put service role credentials in NEXT_PUBLIC env vars.
-- To promote yourself after signing up, run the following in SQL editor replacing the email:
-- update public.profiles set role='admin' where email='your-email@example.com';
-- Example partner bootstrap:
-- insert into public.regions(name,state) values ('Bengaluru','Karnataka');
-- insert into public.partners(name,kind,city,verification_status) values ('Demo Repair Hub','both','Bengaluru','verified');
-- For registered accounts only, assign roles using admin-authorized back-office SQL until onboarding UI is implemented.
