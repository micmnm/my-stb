import { useSyncExternalStore } from 'react';
import { getLang, subscribe, t } from './index';

export function useT() {
  useSyncExternalStore(subscribe, getLang, getLang);
  return t;
}
