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
alter table projects alter column country set default '国家未识别';
alter table projects alter column financier set default '待人工核实';
alter table projects alter column title_zh set default '待人工核实';
alter table projects alter column title_en set default '待人工核实';
alter table projects alter column risks_zh set default '[]'::jsonb;
create index if not exists project_links_project_id_idx on project_links(project_id);

alter table run_logs add column if not exists fetched_count int default 0;
alter table run_logs add column if not exists success_count int default 0;
create index if not exists projects_dashboard_idx on projects(section, created_at, deadline_at);

-- Public visibility and AI/translation state (safe to rerun in Supabase SQL Editor).
alter table projects add column if not exists translation_status text not null default 'pending'
  check (translation_status in ('translated','pending','failed'));
alter table projects add column if not exists ai_analysis_status text not null default 'pending'
  check (ai_analysis_status in ('success','pending','failed'));
update projects set translation_status = 'translated'
where title_zh ~ '[\u3400-\u9fff]' and title_zh <> '待翻译' and translation_status = 'pending';
update projects set ai_analysis_status = 'success'
where ai_analyzed_at is not null and ai_analysis_status = 'pending';
create index if not exists projects_public_filter_idx
  on projects(section, translation_status, status, deadline_at, created_at desc);
create index if not exists projects_favorites_idx on projects(updated_at desc) where is_favorite = true;

-- Review state is authoritative: pending items never share the approved public gate.
update projects set gate = case review_status
  when 'approved' then 'official'::project_gate
  when 'rejected' then 'blocked'::project_gate
  else 'pending_review'::project_gate
end;
alter table projects drop constraint if exists projects_review_status_check;
alter table projects add constraint projects_review_status_check
  check (review_status in ('approved', 'pending', 'rejected'));
alter table projects drop constraint if exists projects_review_gate_check;
alter table projects add constraint projects_review_gate_check check (
  (review_status = 'approved' and gate = 'official') or
  (review_status = 'pending' and gate = 'pending_review') or
  (review_status = 'rejected' and gate = 'blocked')
);
create index if not exists projects_review_queue_idx
  on projects(created_at desc) where review_status = 'pending' and gate = 'pending_review';

-- Country data-quality repair. Run this migration before deploying the crawler.
-- The final SELECT returns: deleted Chinese projects, repaired country fields,
-- and still-unrecognized projects for the deployment report.
create table if not exists country_cleanup_runs (
  id uuid primary key default gen_random_uuid(),
  deleted_china_count int not null,
  repaired_country_count int not null,
  unidentified_country_count int not null,
  created_at timestamptz not null default now()
);
do $$
declare deleted_count int := 0; repaired_count int := 0; marked_unknown_count int := 0; unknown_count int := 0;
begin
  delete from projects where
    lower(trim(country)) in ('china','cn','chn','中国','people''s republic of china','prc')
    or concat_ws(' ', country, title_en) ~* '\m(heilongjiang|beijing|shanghai|tianjin|chongqing|hebei|henan|shandong|shanxi|shaanxi|liaoning|jilin|jiangsu|zhejiang|anhui|fujian|jiangxi|hubei|hunan|guangdong|hainan|sichuan|guizhou|yunnan|gansu|qinghai|taiwan|inner mongolia|guangxi|tibet|xinjiang|ningxia|hong kong|macao|macau)\M'
    or concat_ws(' ', country, title_en) ~ '(黑龙江|北京|上海|天津|重庆|河北|河南|山东|山西|陕西|辽宁|吉林|江苏|浙江|安徽|福建|江西|湖北|湖南|广东|海南|四川|贵州|云南|甘肃|青海|台湾|内蒙古|广西|西藏|新疆|宁夏|香港|澳门)';
  get diagnostics deleted_count = row_count;

  with candidates as (
    select id, case
      when lower(trim(country)) in ('ar','arg','argentina') or title_en ~* '\margentina\M' then '阿根廷'
      when lower(trim(country)) in ('mx','mex','mexico') or title_en ~* '\mmexico\M' then '墨西哥'
      when lower(trim(country)) in ('tr','tur','turkey','turkiye','türkiye') or title_en ~* '\m(turkey|turkiye|türkiye)\M' then '土耳其'
      when lower(trim(country)) in ('br','bra','brazil') or title_en ~* '\mbrazil\M' then '巴西'
      when lower(trim(country)) in ('in','ind','india') or title_en ~* '\mindia\M' then '印度'
      else '国家未识别' end as new_country
    from projects
  )
  update projects p set country = c.new_country, gate = 'pending_review', review_status = 'pending', updated_at = now()
  from candidates c where p.id = c.id and p.country is distinct from c.new_country
    and (p.country is null or trim(p.country) = '' or p.country = '待人工核实' or c.new_country <> '国家未识别');
  get diagnostics repaired_count = row_count;

  update projects set country = '国家未识别', gate = 'pending_review', review_status = 'pending', updated_at = now()
  where country is null or trim(country) = '' or country = '待人工核实';
  get diagnostics marked_unknown_count = row_count;
  repaired_count := repaired_count + marked_unknown_count;
  select count(*) into unknown_count from projects where country = '国家未识别';
  insert into country_cleanup_runs(deleted_china_count, repaired_country_count, unidentified_country_count)
    values (deleted_count, repaired_count, unknown_count);
end $$;
alter table projects drop constraint if exists projects_country_quality_check;
alter table projects add constraint projects_country_quality_check check (country <> '待人工核实');
alter table projects drop constraint if exists projects_country_gate_check;
alter table projects add constraint projects_country_gate_check check (country <> '国家未识别' or (gate = 'pending_review' and review_status = 'pending'));
alter table projects drop constraint if exists projects_no_china_check;
alter table projects add constraint projects_no_china_check check (
  lower(trim(country)) not in ('china','cn','chn','中国','people''s republic of china','prc')
  and concat_ws(' ', country, title_en) !~* '\m(heilongjiang|beijing|shanghai|tianjin|chongqing|hebei|henan|shandong|shanxi|shaanxi|liaoning|jilin|jiangsu|zhejiang|anhui|fujian|jiangxi|hubei|hunan|guangdong|hainan|sichuan|guizhou|yunnan|gansu|qinghai|taiwan|inner mongolia|guangxi|tibet|xinjiang|ningxia|hong kong|macao|macau)\M'
  and concat_ws(' ', country, title_en) !~ '(黑龙江|北京|上海|天津|重庆|河北|河南|山东|山西|陕西|辽宁|吉林|江苏|浙江|安徽|福建|江西|湖北|湖南|广东|海南|四川|贵州|云南|甘肃|青海|台湾|内蒙古|广西|西藏|新疆|宁夏|香港|澳门)'
);
create index if not exists projects_country_idx on projects(country);
select deleted_china_count, repaired_country_count, unidentified_country_count, created_at
from country_cleanup_runs order by created_at desc limit 1;

-- RLS exposes only approved projects to direct anonymous clients. The server-side
-- service role is required for the review queue and all review mutations.
drop policy if exists "Public can read approved projects" on projects;
create policy "Public can read approved projects" on projects for select to anon
  using (review_status = 'approved' and gate = 'official');
drop policy if exists "Public can read approved project links" on project_links;
create policy "Public can read approved project links" on project_links for select to anon
  using (exists (select 1 from projects where projects.id = project_links.project_id
    and projects.review_status = 'approved' and projects.gate = 'official'));
