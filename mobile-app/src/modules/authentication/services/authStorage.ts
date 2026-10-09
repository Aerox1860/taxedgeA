import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DevUser } from "../types/auth.types";

const KEY_USERS = "taxEdgeDevUsersMap";
const KEY_SESSION = "taxEdgeDevSession";
const memory: Record<string, string> = {};
let storageRevision = 0;

const get = (k: string) => {
  if (memory[k]) return memory[k];
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(k);
    }
  } catch {}
  return null;
};

const set = (k: string, v: string) => {
  storageRevision += 1;
  memory[k] = v;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(k, v);
    }
  } catch {}
  AsyncStorage.setItem(k, v).catch(() => {});
};

const removePersisted = async (k: string): Promise<void> => {
  storageRevision += 1;
  delete memory[k];
  try {
    if (typeof window !== "undefined") {
      window.localStorage?.removeItem(k);
      window.sessionStorage?.removeItem(k);
    }
  } catch {}
  await AsyncStorage.removeItem(k).catch(() => {});
};

export const authStorage = {
  initAsync: async (): Promise<void> => {
    const revisionAtStart = storageRevision;
    try {
      const [session, users] = await Promise.all([
        AsyncStorage.getItem(KEY_SESSION),
        AsyncStorage.getItem(KEY_USERS),
      ]);
      if (revisionAtStart !== storageRevision) return;
      if (session) memory[KEY_SESSION] = session;
      else delete memory[KEY_SESSION];
      if (users) memory[KEY_USERS] = users;
      else delete memory[KEY_USERS];
    } catch {}
  },
  getUsersMap: (): Record<string, DevUser> => {
    try {
      return JSON.parse(get(KEY_USERS) || "{}");
    } catch {
      return {};
    }
  },
  getUserByMobile: (mobile: string): DevUser | null => {
    if (!mobile) return null;
    const clean = mobile.replace(/\D/g, "").slice(-10);
    return authStorage.getUsersMap()[clean] || null;
  },
  getUser: (): DevUser | null => {
    const s = authStorage.getSession();
    return s.activeMobile ? authStorage.getUserByMobile(s.activeMobile) : null;
  },
  saveUser: (user: DevUser) => {
    const rawMob = user.mobileNumber || "";
    const cleanMobile = rawMob.replace(/\D/g, "").slice(-10);
    if (!cleanMobile) return;
    const map = authStorage.getUsersMap();
    const existing = map[cleanMobile] || {};
    const regCompleted =
      typeof user.registrationCompleted === "boolean"
        ? user.registrationCompleted
        : Boolean(existing.registrationCompleted);
    map[cleanMobile] = {
      ...existing,
      ...user,
      mobileNumber: cleanMobile,
      registrationCompleted: regCompleted,
    };
    set(KEY_USERS, JSON.stringify(map));
  },
  getSession: () => {
    try {
      return JSON.parse(get(KEY_SESSION) || '{"isLoggedIn":false,"activeMobile":null}');
    } catch {
      return { isLoggedIn: false, activeMobile: null, lastLoginAt: null };
    }
  },
  saveSession: (s: any) => set(KEY_SESSION, JSON.stringify(s)),
  clearSession: async (): Promise<void> => {
    const session = JSON.stringify({ isLoggedIn: false, activeMobile: null, lastLoginAt: null });
    storageRevision += 1;
    memory[KEY_SESSION] = session;
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(KEY_SESSION, session);
      }
    } catch {}
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem(KEY_SESSION);
      }
    } catch {}
    await AsyncStorage.setItem(KEY_SESSION, session);
  },
  clearCurrentUser: async (mobile?: string | null): Promise<void> => {
    const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);
    if (cleanMobile) {
      const users = authStorage.getUsersMap();
      delete users[cleanMobile];
      if (Object.keys(users).length > 0) {
        const serialized = JSON.stringify(users);
        storageRevision += 1;
        memory[KEY_USERS] = serialized;
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem(KEY_USERS, serialized);
          }
        } catch {}
        await AsyncStorage.setItem(KEY_USERS, serialized);
      } else {
        await removePersisted(KEY_USERS);
      }
    }
    await removePersisted("taxEdgeDevUser");
  },
  clearAllAuthData: async (): Promise<void> => {
    await Promise.all([
      removePersisted(KEY_USERS),
      removePersisted(KEY_SESSION),
      removePersisted("taxEdgeDevUser"),
    ]);
  },
};

export default authStorage;
