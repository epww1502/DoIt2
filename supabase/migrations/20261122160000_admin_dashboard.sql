-- 관리자 모드(앱 설정 > 관리자 모드)에서 보는 요약. 관리자(app_admins)만 부를 수 있다.
-- 숫자와 이름·날짜만 준다. 담은 항목의 내용, 기록, 사진, 댓글은 주지 않는다.
create function public.admin_dashboard ()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_app_admin () then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'overview', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'new_users_7d', (
        select count(*) from auth.users where created_at > now() - interval '7 days'
      ),
      'active_users_7d', (
        select count(*) from auth.users u
        where coalesce(
          (
            select max(greatest(s.created_at, s.updated_at, s.refreshed_at at time zone 'utc'))
            from auth.sessions s where s.user_id = u.id
          ),
          u.last_sign_in_at
        ) > now() - interval '7 days'
      ),
      'spaces', (select count(*) from public.spaces),
      'shared_spaces', (
        select count(*) from (
          select space_id from public.space_members group by space_id having count(*) > 1
        ) shared
      ),
      'items', (select count(*) from public.bucket_items),
      'records', (select count(*) from public.item_reviews),
      'open_inquiries', (select count(*) from public.inquiries where handled_at is null)
    ),
    'spaces', coalesce((
      select jsonb_agg(row_to_json(t) order by t.last_activity desc nulls last)
      from (
        select
          sp.id,
          sp.name,
          sp.emoji,
          sp.is_personal as personal,
          sp.created_at,
          (select count(*) from public.space_members m where m.space_id = sp.id) as members,
          (select count(*) from public.bucket_items i where i.space_id = sp.id) as items,
          (select count(*) from public.item_reviews r where r.space_id = sp.id) as records,
          (select max(i.updated_at) from public.bucket_items i where i.space_id = sp.id) as last_activity
        from public.spaces sp
        order by last_activity desc nulls last
        limit 200
      ) t
    ), '[]'::jsonb),
    'users', coalesce((
      select jsonb_agg(row_to_json(t) order by t.last_used desc nulls last)
      from (
        select
          u.id,
          p.nickname,
          u.created_at as joined,
          coalesce(
            (
              select max(greatest(s.created_at, s.updated_at, s.refreshed_at at time zone 'utc'))
              from auth.sessions s where s.user_id = u.id
            ),
            u.last_sign_in_at
          ) as last_used,
          (select count(*) from public.space_members m where m.user_id = u.id) as spaces,
          (select count(*) from public.bucket_items i where i.created_by = u.id) as items,
          (
            select a.platform || ' ' || a.app_version
            from public.app_steps a where a.user_id = u.id
            order by a.created_at desc limit 1
          ) as app
        from auth.users u
        left join public.profiles p on p.user_id = u.id
        order by last_used desc nulls last
        limit 300
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.admin_dashboard () from public, anon;
grant execute on function public.admin_dashboard () to authenticated;

comment on function public.admin_dashboard () is '관리자 모드 요약 (관리자만, 숫자와 이름·날짜만)';
