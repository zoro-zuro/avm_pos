const KEY = "user";

export const USER = {
  read<T>() {
    const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
      return null;
    }
  },

  write<T>(u: T) {
    localStorage.setItem(KEY, JSON.stringify(u));
  },

  clear() {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  },
};
