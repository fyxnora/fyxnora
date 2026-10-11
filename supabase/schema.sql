-- FYXNORA UNIFIED SCHEMA
-- Safe for both a fresh Supabase project and an existing Fyxnora database.
-- This file is rerunnable: existing types, tables, indexes, triggers and seed rows are preserved.
-- Only trusted server routes may use SUPABASE_SERVICE_ROLE_KEY.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('customer','technician','partner','regional','admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.regions(id uuid primary key default gen_random_uuid(),name text not null,state text not null,country text not null default 'India',active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.partners(id uuid primary key default gen_random_uuid(),name text not null,legal_name text,kind text not null default 'repair_centre' check(kind in('repair_centre','pickup','both')),contact_email text,contact_phone text,region_id uuid references public.regions(id),city text,pincode text,street_address text,verification_status text not null default 'pending' check(verification_status in('pending','verified','suspended')),commission_rate numeric(5,2) not null default 20 check(commission_rate between 0 and 100),created_at timestamptz not null default now());
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text not null default '',email text not null,phone text,role public.app_role not null default 'customer',region_id uuid references public.regions(id),partner_id uuid references public.partners(id),active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.coverage_pincodes(id uuid primary key default gen_random_uuid(),pincode varchar(6) not null,region_id uuid references public.regions(id),partner_id uuid references public.partners(id),category text not null,active boolean not null default true,unique(pincode,partner_id,category));

create table if not exists public.service_categories(id uuid primary key default gen_random_uuid(),name text not null unique,active boolean not null default true,sort_order int not null default 0);
create table if not exists public.device_brands(id uuid primary key default gen_random_uuid(),category_id uuid not null references public.service_categories(id) on delete cascade,name text not null,active boolean not null default true,sort_order int not null default 0,unique(category_id,name));
create table if not exists public.device_models(id uuid primary key default gen_random_uuid(),brand_id uuid not null references public.device_brands(id) on delete cascade,name text not null,model_code text,image_url text,active boolean not null default true,sort_order int not null default 0,unique(brand_id,name));
create table if not exists public.repair_services(id uuid primary key default gen_random_uuid(),name text not null unique,description text not null default '',default_duration_minutes int not null default 60 check(default_duration_minutes>0),default_warranty_months int not null default 3 check(default_warranty_months>=0),active boolean not null default true,sort_order int not null default 0);
create table if not exists public.model_repair_prices(id uuid primary key default gen_random_uuid(),model_id uuid not null references public.device_models(id) on delete cascade,repair_service_id uuid not null references public.repair_services(id) on delete cascade,price numeric(12,2) not null check(price>=0),discount_price numeric(12,2) check(discount_price>=0),doorstep_available boolean not null default true,active boolean not null default true,unique(model_id,repair_service_id));
create table if not exists public.app_settings(id text primary key,value jsonb not null default '{}',updated_by uuid references public.profiles(id),updated_at timestamptz not null default now());
create table if not exists public.business_queries(id uuid primary key default gen_random_uuid(),company_name text not null,contact_name text not null,phone text not null,email text not null,service text not null check(service in('Repair','AMC','Procurement','Liquidation','Other Service')),employee_count int,city text,details text not null default '',status text not null default 'new' check(status in('new','contacted','qualified','won','closed')),admin_notes text not null default '',handled_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.email_verification_codes(id uuid primary key default gen_random_uuid(),email text not null unique,full_name text not null,code_hash text not null,attempts int not null default 0,expires_at timestamptz not null,used_at timestamptz,last_sent_at timestamptz,created_at timestamptz not null default now());
alter table public.email_verification_codes add column if not exists last_sent_at timestamptz;

insert into public.regions(name,state,country,active)
select 'Bengaluru','Karnataka','India',true where not exists(select 1 from public.regions where lower(name)='bengaluru' and lower(state)='karnataka');
insert into public.partners(name,legal_name,kind,region_id,city,verification_status,commission_rate)
select 'Fyxnora Bengaluru Service Hub','Fyxnora Demo Service Hub','both',r.id,'Bengaluru','verified',20 from public.regions r
where lower(r.name)='bengaluru' and not exists(select 1 from public.partners where name='Fyxnora Bengaluru Service Hub');

create sequence if not exists public.booking_reference_seq start 1001;
create table if not exists public.bookings(
 id uuid primary key default gen_random_uuid(),reference text not null unique default('FX-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.booking_reference_seq')::text,6,'0')),
 customer_id uuid not null references public.profiles(id),category text not null,brand text not null,model text not null,issue text not null,phone text not null,city text not null,state text not null default '',country text not null default 'India',pincode varchar(6) not null,address text not null,location_latitude double precision,location_longitude double precision,
 model_id uuid references public.device_models(id),repair_service_ids uuid[] not null default '{}',estimated_amount numeric(12,2),preferred_date date,
 status text not null default 'BOOKED' check(status in('BOOKED','ASSIGNED','VISIT_SCHEDULED','PICKUP_VERIFIED','IN_TRANSIT','RECEIVED_AT_CENTRE','DIAGNOSIS','QUOTE_SENT','CUSTOMER_APPROVED','REPAIRING','QUALITY_CHECK','READY_FOR_DELIVERY','OUT_FOR_DELIVERY','DELIVERED','CLOSED','QUOTE_REJECTED','RETURN_WITHOUT_REPAIR','PARTS_DELAYED','CUSTOMER_UNREACHABLE','DISPUTED','LOST_OR_DAMAGED','WARRANTY_REOPENED')),
 partner_id uuid references public.partners(id),technician_id uuid references public.profiles(id),regional_id uuid references public.profiles(id),quoted_amount numeric(12,2) check(quoted_amount>=0),quote_details text,approved_amount numeric(12,2),approved_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());

-- Upgrade columns for databases created with an older Fyxnora schema.
alter table public.bookings drop constraint if exists bookings_category_check;
alter table public.bookings add column if not exists model_id uuid references public.device_models(id);
alter table public.bookings add column if not exists repair_service_ids uuid[] not null default '{}';
alter table public.bookings add column if not exists estimated_amount numeric(12,2);
alter table public.bookings add column if not exists state text not null default '';
alter table public.bookings add column if not exists country text not null default 'India';
alter table public.bookings add column if not exists location_latitude double precision;
alter table public.bookings add column if not exists location_longitude double precision;
alter table public.device_models add column if not exists image_url text;

create table if not exists public.booking_events(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id) on delete cascade,actor_id uuid references public.profiles(id),kind text not null,description text not null default '',created_at timestamptz not null default now());
create table if not exists public.device_condition_reports(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),recorded_by uuid references public.profiles(id),serial_masked text,accessories jsonb not null default '[]',condition_notes text,damage_notes text,pickup_otp_hash text,customer_verified_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.custody_events(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),from_actor uuid references public.profiles(id),to_actor uuid references public.profiles(id),handover_type text not null,location_text text,verification_reference text,notes text,created_at timestamptz not null default now());
create table if not exists public.booking_media(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),uploaded_by uuid references public.profiles(id),bucket text not null default 'private-booking-media',object_path text not null,media_type text not null default 'condition',created_at timestamptz not null default now());
create table if not exists public.quotation_items(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),label text not null,item_type text not null default 'labour' check(item_type in('labour','part','diagnosis','logistics','tax','discount')),quantity numeric(10,2) not null default 1,unit_amount numeric(12,2) not null default 0,tax_rate numeric(5,2) not null default 0,created_at timestamptz not null default now());
create table if not exists public.repair_tasks(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),assigned_to uuid references public.profiles(id),description text not null,status text not null default 'pending',started_at timestamptz,completed_at timestamptz);
create table if not exists public.inventory_items(id uuid primary key default gen_random_uuid(),partner_id uuid not null references public.partners(id),sku text not null,name text not null,quantity numeric(12,2) not null default 0,unit_cost numeric(12,2),unique(partner_id,sku));
create table if not exists public.repair_parts(id uuid primary key default gen_random_uuid(),booking_id uuid references public.bookings(id),inventory_item_id uuid references public.inventory_items(id),description text not null,qty numeric(10,2) not null default 1,created_at timestamptz default now());
create table if not exists public.quality_checks(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),checked_by uuid references public.profiles(id),checklist jsonb not null default '{}',passed boolean not null default false,notes text,checked_at timestamptz not null default now());
create table if not exists public.payments(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),gateway text,external_order_id text,external_payment_id text unique,amount numeric(12,2) not null,status text not null default 'pending',verified_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.settlements(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),partner_id uuid references public.partners(id),gross_amount numeric(12,2) not null,commission_amount numeric(12,2) not null,net_amount numeric(12,2) not null,status text not null default 'pending',paid_at timestamptz);
create table if not exists public.warranty_claims(id uuid primary key default gen_random_uuid(),booking_id uuid not null references public.bookings(id),raised_by uuid references public.profiles(id),reason text not null,status text not null default 'open',created_at timestamptz not null default now());
create table if not exists public.support_tickets(id uuid primary key default gen_random_uuid(),booking_id uuid references public.bookings(id),customer_id uuid references public.profiles(id),subject text not null,description text not null,status text not null default 'open',created_at timestamptz not null default now());
create table if not exists public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid references public.profiles(id),booking_id uuid references public.bookings(id),channel text not null default 'email',template text not null,payload jsonb not null default '{}',status text not null default 'queued',sent_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id),entity_type text not null,entity_id uuid,action text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now());

create index if not exists bookings_customer_idx on public.bookings(customer_id,created_at desc);
create index if not exists bookings_partner_idx on public.bookings(partner_id,status);
create index if not exists bookings_technician_idx on public.bookings(technician_id,status);
create index if not exists bookings_region_idx on public.bookings(regional_id,status);
create index if not exists bookings_status_idx on public.bookings(status,created_at desc);
create index if not exists booking_events_order_idx on public.booking_events(booking_id,created_at);
create index if not exists business_queries_status_idx on public.business_queries(status,created_at desc);

insert into public.service_categories(name,sort_order) values('Mobile',1),('Tablet',2),('Laptop',3),('Smart Watch',4),('AirPods',5),('Desktop',6)
on conflict(name) do update set sort_order=excluded.sort_order;
insert into public.repair_services(name,description,sort_order) values
 ('Screen replacement','Cracked, damaged or unresponsive display',1),('Battery replacement','Battery drain, swelling or charging issues',2),('Charging repair','Charging port and power input faults',3),('Camera repair','Front or rear camera faults',4),('Speaker / microphone','Audio input and output faults',5),('Diagnosis','Complete device inspection',6)
on conflict(name) do update set description=excluded.description,sort_order=excluded.sort_order;

-- Initial mobile catalogue with common device repair categories and models.
-- Prices below are Fyxnora editable starting estimates, not copied competitor prices.
insert into public.repair_services(name,description,default_duration_minutes,default_warranty_months,sort_order) values
 ('Standard Screen','Standard display replacement',60,6,10),('Premium OLED Screen','Premium OLED display replacement',60,12,11),('Touch & Glass','Front glass and touch repair',360,6,12),('Back Glass','Rear glass replacement',360,6,13),('Body Housing','Device body and housing replacement',360,6,14),('Back Camera','Rear camera module replacement',60,6,15),('Ear Speaker','Ear speaker replacement',45,6,16),('Loud Speaker','Loud speaker replacement',45,6,17),('Motherboard Repair','Board-level diagnosis and repair',1440,3,18),('Water / Liquid Damage','Liquid damage diagnosis and repair',1440,3,19),('Software / Network','Operating system, Wi-Fi, Bluetooth or network repair',360,3,20),('Other Issues','Advanced device diagnosis',1440,3,21)
on conflict(name) do update set description=excluded.description,default_duration_minutes=excluded.default_duration_minutes,default_warranty_months=excluded.default_warranty_months,sort_order=excluded.sort_order;

insert into public.device_brands(category_id,name,sort_order)
select c.id,v.name,v.sort_order from public.service_categories c cross join(values('Apple',1),('Nothing',2),('OnePlus',3),('Google Pixel',4),('Poco',5))v(name,sort_order) where c.name='Mobile'
on conflict(category_id,name) do update set active=true,sort_order=excluded.sort_order;

with seed(brand,model,sort_order) as (values
 ('Apple','iPhone 17 Air',1),('Apple','iPhone 17 Pro Max',2),('Apple','iPhone 17 Pro',3),('Apple','iPhone 17',4),('Apple','iPhone 16e',5),('Apple','iPhone 16 Pro Max',6),('Apple','iPhone 16 Pro',7),('Apple','iPhone 16 Plus',8),('Apple','iPhone 16',9),('Apple','iPhone 15 Pro Max',10),('Apple','iPhone 15 Pro',11),('Apple','iPhone 15 Plus',12),('Apple','iPhone 15',13),('Apple','iPhone 14 Pro Max',14),('Apple','iPhone 14 Pro',15),('Apple','iPhone 14 Plus',16),('Apple','iPhone 14',17),('Apple','iPhone 13 Pro Max',18),('Apple','iPhone 13 Pro',19),('Apple','iPhone 13 Mini',20),('Apple','iPhone 13',21),('Apple','iPhone 12 Pro Max',22),('Apple','iPhone 12 Pro',23),('Apple','iPhone 12 Mini',24),('Apple','iPhone 12',25),('Apple','iPhone 11 Pro Max',26),('Apple','iPhone 11 Pro',27),('Apple','iPhone 11',28),('Apple','iPhone X',29),('Apple','iPhone XR',30),('Apple','iPhone XS',31),('Apple','iPhone XS Max',32),('Apple','iPhone SE 2020',33),('Apple','iPhone 8 Plus',34),('Apple','iPhone 8',35),('Apple','iPhone 7 Plus',36),('Apple','iPhone 7',37),('Apple','iPhone 6s Plus',38),('Apple','iPhone 6s',39),('Apple','iPhone 6 Plus',40),('Apple','iPhone 6',41),('Apple','iPhone SE',42),('Apple','iPhone 5s',43),
 ('Nothing','Phone (1)',1),
 ('OnePlus','OnePlus Nord CE 2 5G',1),('OnePlus','OnePlus 8 Pro',2),('OnePlus','OnePlus 7 Pro',3),('OnePlus','OnePlus Nord CE',4),('OnePlus','OnePlus Nord 2',5),('OnePlus','OnePlus Nord',6),('OnePlus','OnePlus 9R',7),('OnePlus','OnePlus 9 Pro',8),('OnePlus','OnePlus 9',9),('OnePlus','OnePlus 8T',10),('OnePlus','OnePlus 8',11),('OnePlus','OnePlus 7T Pro',12),('OnePlus','OnePlus 7T',13),('OnePlus','OnePlus 7',14),('OnePlus','OnePlus 6T',15),('OnePlus','OnePlus 6',16),
 ('Google Pixel','Google Pixel 8',1),('Google Pixel','Google Pixel 7a',2),('Google Pixel','Google Pixel 6 Pro',3),('Google Pixel','Google Pixel 6a',4),('Google Pixel','Google Pixel 5',5),('Google Pixel','Google Pixel 5a',6),('Google Pixel','Google Pixel 4a 5G',7),('Google Pixel','Google Pixel 4a',8),('Google Pixel','Google Pixel 4 XL',9),('Google Pixel','Google Pixel 4',10),('Google Pixel','Google Pixel 3a XL',11),('Google Pixel','Google Pixel 3 XL',12),('Google Pixel','Google Pixel 3',13),('Google Pixel','Google Pixel 2 XL',14),('Google Pixel','Google Pixel 2',15),('Google Pixel','Google Pixel XL',16),('Google Pixel','Others',17),
 ('Poco','Poco X3 Pro',1),('Poco','Poco X3',2),('Poco','Poco X2',3),('Poco','Poco M3',4),('Poco','Poco M2 Pro',5),('Poco','Poco M2',6),('Poco','Poco C3',7),('Poco','Poco F1',8),('Poco','Others',9)
)
insert into public.device_models(brand_id,name,sort_order)
select b.id,s.model,s.sort_order from seed s join public.device_brands b on b.name=s.brand join public.service_categories c on c.id=b.category_id and c.name='Mobile'
on conflict(brand_id,name) do update set active=true,sort_order=excluded.sort_order;

insert into public.model_repair_prices(model_id,repair_service_id,price,discount_price,doorstep_available,active)
select m.id,s.id,
 case s.name when 'Diagnosis' then 499 when 'Battery replacement' then 2499 when 'Charging repair' then 1999 when 'Standard Screen' then 4999 when 'Premium OLED Screen' then 8999 when 'Touch & Glass' then 3499 when 'Back Glass' then 2999 when 'Camera repair' then 2499 when 'Back Camera' then 3499 when 'Ear Speaker' then 1499 when 'Loud Speaker' then 1799 when 'Speaker / microphone' then 1799 when 'Motherboard Repair' then 3999 when 'Water / Liquid Damage' then 2999 when 'Software / Network' then 999 else 1499 end,
 null,
 s.default_duration_minutes<=90,true
from public.device_models m join public.device_brands b on b.id=m.brand_id join public.service_categories c on c.id=b.category_id and c.name='Mobile' cross join public.repair_services s
where b.name in('Apple','Nothing','OnePlus','Google Pixel','Poco') and s.name in('Diagnosis','Battery replacement','Charging repair','Standard Screen','Premium OLED Screen','Touch & Glass','Back Glass','Camera repair','Back Camera','Ear Speaker','Loud Speaker','Speaker / microphone','Motherboard Repair','Water / Liquid Damage','Software / Network','Other Issues')
on conflict(model_id,repair_service_id) do nothing;

insert into public.app_settings(id,value) values('marketplace','{"commission_rate":20,"inspection_fee":199,"pickup_fee":149,"express_fee":299,"gst_rate":18}'::jsonb)
on conflict(id) do nothing;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
drop trigger if exists booking_updated on public.bookings;
create trigger booking_updated before update on public.bookings for each row execute function public.set_updated_at();
drop trigger if exists business_query_updated on public.business_queries;
create trigger business_query_updated before update on public.business_queries for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name,email,role) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),coalesce(new.email,''),'customer') on conflict(id) do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.regions enable row level security;
alter table public.partners enable row level security;
alter table public.profiles enable row level security;
alter table public.coverage_pincodes enable row level security;
alter table public.service_categories enable row level security;
alter table public.device_brands enable row level security;
alter table public.device_models enable row level security;
alter table public.repair_services enable row level security;
alter table public.model_repair_prices enable row level security;
alter table public.app_settings enable row level security;
alter table public.business_queries enable row level security;
alter table public.email_verification_codes enable row level security;
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

-- After registering the first account, promote it once:
-- update public.profiles set role='admin' where email='your-email@example.com';
