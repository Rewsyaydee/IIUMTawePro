import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mockUsers } from "../data/mockData";
import { authenticateTelegram, clearAuthSession, loadAuthSession, shouldUseApiAuth } from "../lib/apiAuth";
import type { MockUser } from "../types";

type NewMockUserInput = Pick<MockUser, "name" | "role" | "bureau"> & {
  id?: string;
  telegramId?: string;
};

type MockUserUpdate = Partial<Pick<MockUser, "name" | "role" | "bureau" | "matricNumber" | "kulliyyah">>;

type MockUserContextValue = {
  user: MockUser;
  users: MockUser[];
  setUserId: (id: string) => void;
  addMockUser: (input: NewMockUserInput) => MockUser;
  updateMockUser: (id: string, patch: MockUserUpdate) => void;
  revokeMockUser: (id: string) => void;
};

const MockUserContext = createContext<MockUserContextValue | undefined>(undefined);

const storageKey = "twa-event-ops-user";

function upsertUser(items: MockUser[], next: MockUser) {
  return [next, ...items.filter((item) => item.id !== next.id)];
}

function initialUsers() {
  const session = loadAuthSession();
  if (!session.user) return mockUsers;
  return upsertUser(mockUsers, session.user);
}

export function MockUserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState(initialUsers);
  const [userId, setUserIdState] = useState(() => {
    const session = loadAuthSession();
    return localStorage.getItem(storageKey) || session.user?.id || mockUsers[0].id;
  });

  const setUserId = (id: string) => {
    localStorage.setItem(storageKey, id);
    setUserIdState(id);
  };

  useEffect(() => {
    if (!shouldUseApiAuth()) return;

    let cancelled = false;
    authenticateTelegram()
      .then((session) => {
        if (cancelled) return;
        setUsers((items) => upsertUser(items, session.user));
        setUserId(session.user.id);
      })
      .catch((error) => {
        console.warn("Telegram auth bridge failed", error);
        clearAuthSession();
        setUsers(mockUsers);
        setUserId(mockUsers[0].id);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const addMockUser = (input: NewMockUserInput) => {
    const next: MockUser = {
      id: input.id || `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      telegramId: input.telegramId || `tg-${Math.floor(100000 + Math.random() * 900000)}`,
      name: input.name,
      role: input.role,
      bureau: input.role === "student" ? undefined : input.bureau
    };

    setUsers((items) => upsertUser(items, next));
    return next;
  };

  const updateMockUser = (id: string, patch: MockUserUpdate) => {
    setUsers((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              bureau: patch.role === "student" ? undefined : patch.bureau ?? item.bureau
            }
          : item
      )
    );
  };

  const revokeMockUser = (id: string) => {
    setUsers((items) => items.filter((item) => item.id !== id));
    if (id === userId) {
      setUserId(mockUsers[0].id);
    }
  };

  const user = users.find((item) => item.id === userId) || users[0] || mockUsers[0];

  const value = useMemo(
    () => ({
      user,
      users,
      setUserId,
      addMockUser,
      updateMockUser,
      revokeMockUser
    }),
    [user, users]
  );

  return <MockUserContext.Provider value={value}>{children}</MockUserContext.Provider>;
}

export function useMockUser() {
  const context = useContext(MockUserContext);
  if (!context) {
    throw new Error("useMockUser must be used inside MockUserProvider");
  }
  return context;
}
