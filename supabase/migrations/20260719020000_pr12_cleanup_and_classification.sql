-- PR #12 database delta only.
--
-- PR #12 did not add any columns: the columns used below already belong to the
-- existing schema.  This migration deliberately does not recreate the
-- project_section/project_gate enum types and does not invoke the maintenance
-- function, so applying it cannot delete or rewrite existing project rows.

begin;

-- Administrator maintenance operation added by PR #12.  CREATE OR REPLACE is
-- safe both before and after supabase/schema.sql has been applied.
create or replace function public.admin_cleanup_and_reclassify() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_china int := 0;
  deleted_invalid int := 0;
  repaired int := 0;
  classified_prequal int := 0;
  classified_tender int := 0;
  classified_pipeline int := 0;
  failed int := 0;
begin
  delete from projects
  where lower(trim(country)) in ('china','cn','chn','中国','people''s republic of china','prc')
    or concat_ws(' ',country,title_en,title_zh) ~* '\m(heilongjiang|beijing|shanghai|tianjin|chongqing|hebei|henan|shandong|shanxi|shaanxi|liaoning|jilin|jiangsu|zhejiang|anhui|fujian|jiangxi|hubei|hunan|guangdong|hainan|sichuan|guizhou|yunnan|gansu|qinghai|taiwan|inner mongolia|guangxi|tibet|xinjiang|ningxia|hong kong|macao|macau)\M|(黑龙江|北京|上海|天津|重庆|河北|河南|山东|山西|陕西|辽宁|吉林|江苏|浙江|安徽|福建|江西|湖北|湖南|广东|海南|四川|贵州|云南|甘肃|青海|台湾|内蒙古|广西|西藏|新疆|宁夏|香港|澳门)';
  get diagnostics deleted_china = row_count;

  delete from projects p
  where trim(coalesce(p.title_en,'')) = ''
    or not exists (
      select 1 from project_links l
      where l.project_id = p.id and l.is_official and l.url ~ '^https://'
    );
  get diagnostics deleted_invalid = row_count;

  with duplicates as (
    select id, row_number() over (
      partition by coalesce(source_unique_key, procurement_no, lower(title_en))
      order by updated_at desc nulls last, id
    ) n
    from projects
  )
  delete from projects
  using duplicates
  where projects.id = duplicates.id and duplicates.n > 1;
  get diagnostics failed = row_count;
  deleted_invalid := deleted_invalid + failed;
  failed := 0;

  update projects
  set country = case
      when lower(trim(country)) in ('ar','arg','argentina') then '阿根廷'
      when lower(trim(country)) in ('mx','mex','mexico') then '墨西哥'
      when lower(trim(country)) in ('tr','tur','turkey','turkiye','türkiye') then '土耳其'
      when lower(trim(country)) in ('br','bra','brazil') then '巴西'
      when lower(trim(country)) in ('in','ind','india') then '印度'
      else '国家未识别'
    end,
    updated_at = now()
  where country is null or trim(country) = '' or country = '待人工核实'
    or lower(trim(country)) in ('ar','arg','argentina','mx','mex','mexico','tr','tur','turkey','turkiye','türkiye','br','bra','brazil','in','ind','india');
  get diagnostics repaired = row_count;

  update projects set section = 'pipeline'
  where concat_ws(' ',procurement_method,stage,title_en) ~* '(general procurement notice|project pipeline|procurement plan|\mgpn\M)';
  get diagnostics classified_pipeline = row_count;

  update projects set section = 'prequalification'
  where concat_ws(' ',procurement_method,stage,title_en) ~* '(pre[ -]?qualification|request for qualification|request for prequalification|\mrfq\M)';
  get diagnostics classified_prequal = row_count;

  update projects set section = 'tender'
  where concat_ws(' ',procurement_method,stage,title_en) ~* '(invitation for bids?|request for bids?|\mrfb\M|tender|specific procurement notice)';
  get diagnostics classified_tender = row_count;

  update projects p
  set gate = 'official',
    review_status = 'approved',
    status = case when status = '待人工核实' then '未截止' else status end
  where country <> '国家未识别' and translation_status = 'translated'
    and exists (
      select 1 from project_links l
      where l.project_id = p.id and l.is_official
        and coalesce(l.http_status,200) between 200 and 399
    )
    and concat_ws(' ',procurement_method,stage,title_en) ~* '(general procurement notice|project pipeline|procurement plan|pre[ -]?qualification|request for qualification|invitation for bids?|request for bids?|tender|works|construction|civil|design-build)';

  update projects p
  set gate = 'pending_review', review_status = 'pending', status = '待人工核实'
  where country = '国家未识别' or translation_status <> 'translated'
    or not exists (
      select 1 from project_links l
      where l.project_id = p.id and l.is_official
        and coalesce(l.http_status,200) between 200 and 399
    );

  return jsonb_build_object(
    'deletedChina', deleted_china,
    'deletedInvalid', deleted_invalid,
    'repairedCountries', repaired,
    'classified', jsonb_build_object(
      'prequalification', classified_prequal,
      'tender', classified_tender,
      'pipeline', classified_pipeline
    ),
    'failed', failed
  );
end
$$;

revoke all on function public.admin_cleanup_and_reclassify() from public, anon, authenticated;
grant execute on function public.admin_cleanup_and_reclassify() to service_role;

-- Ask PostgREST to expose the new RPC immediately after the transaction lands.
notify pgrst, 'reload schema';

commit;
