import { tryCatch } from '@/lib/tryCatch';

const STORAGE_KEY = 'ownOpenRouterKey';

// sessionStorage can throw or be missing, so a failed read or write leaves the key in memory only.
export const ownKeyStorage = {
  read(): string | null {
    const { result } = tryCatch(() =>
      window.sessionStorage.getItem(STORAGE_KEY)
    );

    return result;
  },
  write(key: string | null): void {
    tryCatch(() => {
      if (key === null) window.sessionStorage.removeItem(STORAGE_KEY);
      else window.sessionStorage.setItem(STORAGE_KEY, key);
    });
  },
};
