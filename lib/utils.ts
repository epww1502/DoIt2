import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Constants from 'expo-constants';
import { ResolvedColorScheme } from '@/contexts/ThemeModeContext';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isDarkMode(colorScheme: ResolvedColorScheme): boolean {
  return colorScheme === 'dark';
}

/** Expo Go(storeClient) 실행 환경 여부 */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}
