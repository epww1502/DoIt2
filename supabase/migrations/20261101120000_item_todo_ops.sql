-- 할 것을 하나씩 바꾸는 함수.
-- 목록 전체를 덮어쓰면 두 사람이 동시에 다른 할 것을 체크할 때 한쪽 체크가 사라진다.
-- 그래서 체크·추가는 '무엇을 바꿀지'만 보내고 서버가 지금 목록에 반영한다.
-- 같은 내용을 두 번 보내도 결과가 같다 (앱이 다시 보내도 안전).
--
-- p_ops 예:
--   [{"type":"check","todoId":"abc","done":true},
--    {"type":"add","todo":{"id":"def","text":"점심","done":false}}]
create or replace function public.apply_item_todo_ops(p_item_id uuid, p_ops jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  cur jsonb;
  op jsonb;
begin
  -- 행을 잠가서 동시에 들어온 변경이 차례로 반영되게 한다 (RLS로 내 공간 항목만)
  select coalesce(todos, '[]'::jsonb) into cur
  from bucket_items
  where id = p_item_id
  for update;
  if not found then
    return;
  end if;

  for op in select * from jsonb_array_elements(coalesce(p_ops, '[]'::jsonb)) loop
    if op->>'type' = 'check' then
      select coalesce(
        jsonb_agg(
          case when t->>'id' = op->>'todoId'
            then jsonb_set(t, '{done}', to_jsonb(coalesce((op->>'done')::boolean, false)))
            else t
          end
          order by ord
        ),
        '[]'::jsonb
      ) into cur
      from jsonb_array_elements(cur) with ordinality as x(t, ord);
    elsif op->>'type' = 'add' then
      -- 이미 있는 id면 건너뛰고, 한 항목에 30개까지만
      if jsonb_typeof(op->'todo') = 'object'
        and jsonb_array_length(cur) < 30
        and not exists (
          select 1 from jsonb_array_elements(cur) t
          where t->>'id' = op->'todo'->>'id'
        )
      then
        cur := cur || jsonb_build_array(op->'todo');
      end if;
    end if;
  end loop;

  update bucket_items
  set todos = case when jsonb_array_length(cur) = 0 then null else cur end
  where id = p_item_id;
end;
$$;

revoke all on function public.apply_item_todo_ops(uuid, jsonb) from public, anon;
grant execute on function public.apply_item_todo_ops(uuid, jsonb) to authenticated;
