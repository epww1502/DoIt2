-- 관리자 모드 > 로그: 앱 오류(app_errors), 기능 사용(app_steps), AI 호출(ai_events)의 요약과 최근 기록.
-- 관리자가 PIN으로 연 15분 안에만 준다 (is_app_admin). 세 표 모두 담은 항목의 내용이나 쓴 글은 없다.
-- days: 요약에 쓸 기간 (1~90일). 최근 기록은 기간과 상관없이 최신 것부터 정해진 수만큼.
create function public.admin_logs (days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - make_interval(days => least(greatest(coalesce(days, 7), 1), 90));
begin
  if not public.is_app_admin () then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'days', least(greatest(coalesce(days, 7), 1), 90),
    'errors', jsonb_build_object(
      'total', (select count(*) from public.app_errors where occurred_at > since),
      'users', (select count(distinct user_id) from public.app_errors where occurred_at > since),
      -- 같은 오류끼리 묶어서 많이 난 순서로
      'groups', coalesce((
        select jsonb_agg(row_to_json(g) order by g.count desc)
        from (
          select
            e.kind,
            coalesce(e.title, left(e.message, 80)) as title,
            count(*) as count,
            count(distinct e.user_id) as users,
            max(e.occurred_at) as last_at,
            string_agg(distinct e.platform || ' ' || coalesce(e.app_version, '?'), ', ') as versions
          from public.app_errors e
          where e.occurred_at > since
          group by 1, 2
          order by 3 desc
          limit 50
        ) g
      ), '[]'::jsonb),
      'recent', coalesce((
        select jsonb_agg(row_to_json(r) order by r.occurred_at desc)
        from (
          select
            e.id, e.occurred_at, e.kind, e.platform, e.app_version, e.update_id,
            e.title, e.message, e.stack, e.user_id, p.nickname
          from public.app_errors e
          left join public.profiles p on p.user_id = e.user_id
          order by e.occurred_at desc
          limit 100
        ) r
      ), '[]'::jsonb)
    ),
    'steps', jsonb_build_object(
      -- 기능·단계별로 몇 번, 몇 명
      'groups', coalesce((
        select jsonb_agg(row_to_json(g) order by g.events desc)
        from (
          select s.step, count(*) as events, count(distinct s.user_id) as users
          from public.app_steps s
          where s.created_at > since
          group by 1
        ) g
      ), '[]'::jsonb),
      -- 날짜별 (한국 날짜)
      'daily', coalesce((
        select jsonb_agg(row_to_json(d) order by d.day desc)
        from (
          select
            (s.created_at at time zone 'Asia/Seoul')::date as day,
            count(*) as events,
            count(distinct s.user_id) as users
          from public.app_steps s
          where s.created_at > since
          group by 1
        ) d
      ), '[]'::jsonb),
      'recent', coalesce((
        select jsonb_agg(row_to_json(r) order by r.created_at desc)
        from (
          select s.created_at, s.step, s.detail, s.platform, s.app_version, s.user_id, p.nickname
          from public.app_steps s
          left join public.profiles p on p.user_id = s.user_id
          order by s.created_at desc
          limit 100
        ) r
      ), '[]'::jsonb)
    ),
    'ai', jsonb_build_object(
      'summary', (
        select jsonb_build_object(
          'calls', count(*),
          'ok', count(*) filter (where a.outcome = 'ok'),
          'failed', count(*) filter (where a.outcome = 'failed'),
          'limited', count(*) filter (where a.outcome in ('limit_user', 'limit_global')),
          'users', count(distinct a.user_id),
          'input_tokens', coalesce(sum(a.input_tokens), 0),
          'output_tokens', coalesce(sum(a.output_tokens), 0),
          'avg_ms', coalesce(round(avg(a.ms) filter (where a.outcome = 'ok')), 0),
          -- ai_daily와 같은 셈 (입력 100만 토큰 0.10달러, 출력 0.50달러)
          'est_usd', round(
            (coalesce(sum(a.input_tokens), 0) * 0.10 + coalesce(sum(a.output_tokens), 0) * 0.50) / 1000000.0,
            4
          )
        )
        from public.ai_events a
        where a.created_at > since
      ),
      'recent', coalesce((
        select jsonb_agg(row_to_json(r) order by r.created_at desc)
        from (
          select
            a.created_at, a.action, a.outcome, a.model, a.input_tokens, a.output_tokens, a.ms,
            a.user_id, p.nickname
          from public.ai_events a
          left join public.profiles p on p.user_id = a.user_id
          order by a.created_at desc
          limit 50
        ) r
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke execute on function public.admin_logs (integer) from public, anon;
grant execute on function public.admin_logs (integer) to authenticated;

comment on function public.admin_logs (integer) is '관리자 모드 로그: 오류·기능 사용·AI 호출 (관리자가 PIN으로 연 동안만)';
