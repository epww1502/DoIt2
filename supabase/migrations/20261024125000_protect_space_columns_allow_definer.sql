-- 앱(authenticated·anon)이 직접 고칠 때만 초대 코드·만든 사람·공간장을 지킨다.
-- 공간장 함수(reset_invite_code 등, security definer)는 바꿀 수 있게 한다.
create or replace function public.protect_space_columns ()
  returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.invite_code := old.invite_code;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.owner_id := old.owner_id;
  end if;
  return new;
end;
$$;
