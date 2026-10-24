import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/** .env에 Supabase 값이 들어 있는지. 없으면 앱은 휴대폰에만 저장하는 모드로 동작한다 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient<Database>(
  // 값이 없을 때도 앱이 죽지 않게 자리만 채운다 (isSupabaseConfigured로 막는다)
  supabaseUrl || 'https://not-configured.supabase.co',
  supabaseKey || 'not-configured',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// 앱이 앞에 있을 때만 로그인 토큰을 자동으로 갱신한다 (Supabase 권장 설정)
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
  } else {
    void supabase.auth.stopAutoRefresh();
  }
});
