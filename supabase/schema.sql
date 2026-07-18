create extension if not exists pgcrypto;
create type project_section as enum ('prequalification','tender','pipeline');
create type project_gate as enum ('official','pending_review','blocked');
create table if not exists projects (
  id uuid primary key default gen_random_uuid(), section project_section not null, gate project_gate not null default 'pending_review', title_zh text not null, title_en text not null, country text not null, region text, industry text, owner text, financier text, procurement_no text, contract_no text, amount_usd numeric, amount_is_official boolean default false, amount_is_ai_estimate boolean default false, deadline_at timestamptz, published_at timestamptz, status text not null default '待人工核实', china_eligible boolean, joint_venture_requirements text, local_registration_requirements text, qualification_requirements_zh text, scope_zh text, risks_zh jsonb default '[]', ai_score int check (ai_score between 0 and 100), credibility int check (credibility between 0 and 100), ai_analyzed_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists project_links (id uuid primary key default gen_random_uuid(), project_id uuid references projects(id) on delete cascade, link_type text not null, url text not null, is_official boolean default true, http_status int, is_pdf boolean, last_checked_at timestamptz, unique(project_id,url));
create table if not exists data_sources (id uuid primary key default gen_random_uuid(), country text, region text, agency_name text not null, homepage text, crawl_entry text not null, api_url text, rss_url text, requires_login boolean default false, has_captcha boolean default false, crawl_method text not null default 'html', frequency_minutes int default 360, last_success_at timestamptz, last_failure_at timestamptz, consecutive_failures int default 0, enabled boolean default true, fetched_count int default 0, inserted_count int default 0, updated_at timestamptz default now());
create table if not exists run_logs (id uuid primary key default gen_random_uuid(), started_at timestamptz default now(), finished_at timestamptz, status text not null, scanned_sources int default 0, new_count int default 0, error text);
create table if not exists notifications (id uuid primary key default gen_random_uuid(), project_id uuid references projects(id), channel text not null, subject text, body text not null, sent_at timestamptz, status text not null default 'pending');
create table if not exists admin_audit_logs (id uuid primary key default gen_random_uuid(), actor uuid, action text not null, entity text, entity_id uuid, metadata jsonb default '{}', created_at timestamptz default now());
alter table projects enable row level security; alter table project_links enable row level security; alter table data_sources enable row level security; alter table run_logs enable row level security; alter table notifications enable row level security; alter table admin_audit_logs enable row level security;
create table if not exists reminder_rules (id uuid primary key default gen_random_uuid(), days_before_deadline int not null, channel text not null, enabled boolean default true, unique(days_before_deadline, channel));
insert into reminder_rules (days_before_deadline, channel) values (30,'telegram'),(14,'telegram'),(7,'telegram'),(3,'telegram'),(1,'telegram'),(0,'telegram'),(30,'email'),(14,'email'),(7,'email'),(3,'email'),(1,'email'),(0,'email') on conflict do nothing;
create table if not exists project_events (id uuid primary key default gen_random_uuid(), project_id uuid references projects(id) on delete cascade, event_type text not null, title text not null, official_url text, happened_at timestamptz default now(), metadata jsonb default '{}');
alter table reminder_rules enable row level security; alter table project_events enable row level security;


alter table projects add column if not exists source_unique_key text;
alter table projects add column if not exists procurement_method text;
alter table projects add column if not exists stage text;
alter table projects add column if not exists summary_zh text;
alter table projects add column if not exists package_no text;
alter table projects add column if not exists review_status text not null default 'pending';
alter table projects add column if not exists amount_currency text default 'USD';
alter table projects add column if not exists is_favorite boolean not null default false;
alter table projects add column if not exists participated_company_name text;
alter table projects add column if not exists completed_at timestamptz;
drop index if exists projects_source_unique_key_idx;
create unique index if not exists projects_source_unique_key_idx on projects(source_unique_key);
create table if not exists error_logs (id uuid primary key default gen_random_uuid(), source_key text, project_id uuid references projects(id), message text not null, stack text, created_at timestamptz default now(), resolved_at timestamptz);
create table if not exists project_reviews (id uuid primary key default gen_random_uuid(), project_id uuid references projects(id) on delete cascade, reviewer uuid, decision text not null, note text, created_at timestamptz default now());
create table if not exists project_status_history (id uuid primary key default gen_random_uuid(), project_id uuid references projects(id) on delete cascade, status text not null, gate text, changed_at timestamptz default now(), metadata jsonb default '{}');
alter table error_logs enable row level security; alter table project_reviews enable row level security; alter table project_status_history enable row level security;

-- Ensure crawler upserts match Supabase conflict targets and service inserts.
create unique index if not exists data_sources_agency_name_idx on data_sources(agency_name);
alter table projects alter column country set default '待人工核实';
alter table projects alter column financier set default '待人工核实';
alter table projects alter column title_zh set default '待人工核实';
alter table projects alter column title_en set default '待人工核实';
alter table projects alter column risks_zh set default '[]'::jsonb;
create index if not exists project_links_project_id_idx on project_links(project_id);

alter table run_logs add column if not exists fetched_count int default 0;
alter table run_logs add column if not exists success_count int default 0;
create index if not exists projects_dashboard_idx on projects(section, created_at, deadline_at);
