create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.ecoworld_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  consultant_key text unique,
  display_name text not null,
  email text not null,
  role text not null check (role in ('Management','Consultant')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ecoworld_profiles_email_lower_idx on public.ecoworld_profiles(lower(email));

create table if not exists public.ecoworld_project_access (
  user_id uuid not null references public.ecoworld_profiles(user_id) on delete cascade,
  project_key text not null,
  region text not null,
  business_unit text not null,
  project text not null,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  primary key (user_id, project_key)
);
create index if not exists ecoworld_project_access_lookup_idx on public.ecoworld_project_access(region,business_unit,project);
create index if not exists ecoworld_project_access_assigned_by_idx on public.ecoworld_project_access(assigned_by);

create table if not exists public.ecoworld_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create index if not exists ecoworld_config_updated_by_idx on public.ecoworld_config(updated_by);

create table if not exists public.ecoworld_submissions (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  consultant_key text not null,
  region text not null,
  business_unit text not null,
  project text not null,
  revision text not null,
  year text,
  version_number integer not null default 1 check (version_number >= 1),
  edit_allowed boolean not null default false,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ecoworld_submission_identity_idx on public.ecoworld_submissions(owner_user_id,region,business_unit,project,revision);
create index if not exists ecoworld_submissions_project_idx on public.ecoworld_submissions(region,business_unit,project,updated_at desc);
create index if not exists ecoworld_submissions_owner_idx on public.ecoworld_submissions(owner_user_id,updated_at desc);

create table if not exists public.ecoworld_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ecoworld_audit_actor_idx on public.ecoworld_audit_log(actor_user_id);

create table if not exists public.ecoworld_bootstrap (
  id smallint primary key default 1 check (id = 1),
  setup_token_hash text not null,
  claimed_at timestamptz,
  claimed_by uuid references auth.users(id) on delete set null
);
create index if not exists ecoworld_bootstrap_claimed_by_idx on public.ecoworld_bootstrap(claimed_by);
insert into public.ecoworld_bootstrap(id,setup_token_hash)
values (1,'f517f39c0950984ac598db0dfbbee989f3355ea2c01d11d1a3ead35fee99341c')
on conflict (id) do nothing;

create or replace function public.ecoworld_touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists ecoworld_profiles_touch_updated_at on public.ecoworld_profiles;
create trigger ecoworld_profiles_touch_updated_at before update on public.ecoworld_profiles for each row execute function public.ecoworld_touch_updated_at();
drop trigger if exists ecoworld_config_touch_updated_at on public.ecoworld_config;
create trigger ecoworld_config_touch_updated_at before update on public.ecoworld_config for each row execute function public.ecoworld_touch_updated_at();
drop trigger if exists ecoworld_submissions_touch_updated_at on public.ecoworld_submissions;
create trigger ecoworld_submissions_touch_updated_at before update on public.ecoworld_submissions for each row execute function public.ecoworld_touch_updated_at();

create or replace function private.ecoworld_is_management()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.ecoworld_profiles p where p.user_id=(select auth.uid()) and p.role='Management' and p.active=true);
$$;
create or replace function private.ecoworld_is_active_consultant()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.ecoworld_profiles p where p.user_id=(select auth.uid()) and p.role='Consultant' and p.active=true);
$$;
create or replace function private.ecoworld_has_project_access(p_region text,p_business_unit text,p_project text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from public.ecoworld_project_access a
    join public.ecoworld_profiles p on p.user_id=a.user_id
    where a.user_id=(select auth.uid()) and a.region=p_region and a.business_unit=p_business_unit and a.project=p_project
      and p.role='Consultant' and p.active=true
  );
$$;
grant usage on schema private to authenticated;
revoke all on function private.ecoworld_is_management() from public, anon;
revoke all on function private.ecoworld_is_active_consultant() from public, anon;
revoke all on function private.ecoworld_has_project_access(text,text,text) from public, anon;
grant execute on function private.ecoworld_is_management() to authenticated;
grant execute on function private.ecoworld_is_active_consultant() to authenticated;
grant execute on function private.ecoworld_has_project_access(text,text,text) to authenticated;

alter table public.ecoworld_profiles enable row level security;
alter table public.ecoworld_project_access enable row level security;
alter table public.ecoworld_config enable row level security;
alter table public.ecoworld_submissions enable row level security;
alter table public.ecoworld_audit_log enable row level security;
alter table public.ecoworld_bootstrap enable row level security;

grant select on public.ecoworld_profiles to authenticated;
grant select,insert,update,delete on public.ecoworld_project_access to authenticated;
grant select,insert,update,delete on public.ecoworld_config to authenticated;
grant select,insert,update,delete on public.ecoworld_submissions to authenticated;
grant select,insert on public.ecoworld_audit_log to authenticated;
grant usage,select on sequence public.ecoworld_audit_log_id_seq to authenticated;

create policy ecoworld_profiles_select_own_or_management on public.ecoworld_profiles for select to authenticated
using (user_id=(select auth.uid()) or private.ecoworld_is_management());
create policy ecoworld_project_access_select on public.ecoworld_project_access for select to authenticated
using (user_id=(select auth.uid()) or private.ecoworld_is_management());
create policy ecoworld_project_access_management_insert on public.ecoworld_project_access for insert to authenticated with check (private.ecoworld_is_management());
create policy ecoworld_project_access_management_update on public.ecoworld_project_access for update to authenticated using (private.ecoworld_is_management()) with check (private.ecoworld_is_management());
create policy ecoworld_project_access_management_delete on public.ecoworld_project_access for delete to authenticated using (private.ecoworld_is_management());
create policy ecoworld_config_select on public.ecoworld_config for select to authenticated
using (private.ecoworld_is_management() or (private.ecoworld_is_active_consultant() and key in ('portal_hierarchy','dropdown_options','pile_reference','table_settings')));
create policy ecoworld_config_management_insert on public.ecoworld_config for insert to authenticated with check (private.ecoworld_is_management());
create policy ecoworld_config_management_update on public.ecoworld_config for update to authenticated using (private.ecoworld_is_management()) with check (private.ecoworld_is_management());
create policy ecoworld_config_management_delete on public.ecoworld_config for delete to authenticated using (private.ecoworld_is_management());
create policy ecoworld_submissions_select on public.ecoworld_submissions for select to authenticated
using (private.ecoworld_is_management() or (owner_user_id=(select auth.uid()) and private.ecoworld_is_active_consultant() and private.ecoworld_has_project_access(region,business_unit,project)));
create policy ecoworld_submissions_insert on public.ecoworld_submissions for insert to authenticated
with check (private.ecoworld_is_management() or (owner_user_id=(select auth.uid()) and private.ecoworld_is_active_consultant() and private.ecoworld_has_project_access(region,business_unit,project)));
create policy ecoworld_submissions_update on public.ecoworld_submissions for update to authenticated
using (private.ecoworld_is_management() or (owner_user_id=(select auth.uid()) and edit_allowed=true and private.ecoworld_is_active_consultant() and private.ecoworld_has_project_access(region,business_unit,project)))
with check (private.ecoworld_is_management() or (owner_user_id=(select auth.uid()) and private.ecoworld_is_active_consultant() and private.ecoworld_has_project_access(region,business_unit,project)));
create policy ecoworld_submissions_management_delete on public.ecoworld_submissions for delete to authenticated using (private.ecoworld_is_management());
create policy ecoworld_audit_select_management on public.ecoworld_audit_log for select to authenticated using (private.ecoworld_is_management());
create policy ecoworld_audit_insert_authenticated on public.ecoworld_audit_log for insert to authenticated
with check (actor_user_id=(select auth.uid()) and (private.ecoworld_is_management() or private.ecoworld_is_active_consultant()));
create policy ecoworld_bootstrap_no_client_access on public.ecoworld_bootstrap for all to anon,authenticated using(false) with check(false);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('ecoworld-drawings','ecoworld-drawings',false,52428800,array['application/pdf','image/png','image/jpeg','image/webp','application/octet-stream'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy ecoworld_drawings_select on storage.objects for select to authenticated
using (bucket_id='ecoworld-drawings' and (private.ecoworld_is_management() or (split_part(name,'/',1)=(select auth.uid())::text and private.ecoworld_is_active_consultant())));
create policy ecoworld_drawings_insert on storage.objects for insert to authenticated
with check (bucket_id='ecoworld-drawings' and split_part(name,'/',1)=(select auth.uid())::text and private.ecoworld_is_active_consultant());
create policy ecoworld_drawings_delete on storage.objects for delete to authenticated
using (bucket_id='ecoworld-drawings' and (private.ecoworld_is_management() or (split_part(name,'/',1)=(select auth.uid())::text and private.ecoworld_is_active_consultant())));
