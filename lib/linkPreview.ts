/**
 * 링크 미리보기 (페이지 제목·사진). 앱에서 바로 받으면 막는 사이트가 많아서
 * Supabase Edge Function(link-preview)이 대신 받아 온다.
 */
import type { ItemLink } from '@/lib/bucket/types';
import { supabase } from '@/lib/supabase/client';

type Preview = Pick<ItemLink, 'title' | 'image' | 'site'>;

/** 못 받으면 빈 미리보기 (링크는 그대로 쓸 수 있다) */
export async function fetchLinkPreview(url: string): Promise<Preview> {
  const { data, error } = await supabase.functions.invoke<Preview>(
    'link-preview',
    { body: { url } }
  );
  if (error || !data) return {};
  return {
    title: data.title ?? null,
    image: data.image ?? null,
    site: data.site ?? null,
  };
}
