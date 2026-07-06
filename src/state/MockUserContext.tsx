import { createContext, useContext, useMemo, useState } from "react";
import { mockUsers } from "../data/mockData";
import type { MockUser } from "../types";

type NewMockUserInput = Pick<MockUser, "name" | "role" | "bureau"> & {
  telegramId?: string;
};

type MockUserUpdate = Partial<Pick<MockUser, "name" | "role" | "bureau">>;

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

export function MockUserProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState(mockUsers);
  const [userId, setUserIdState] = useState(() => localStorage.getItem(storageKey) || mockUsers[0].id);

  const setUserId = (id: string) => {
    localStorage.setItem(storageKey, id);
    setUserIdState(id);
  };

  const addMockUser = (input: NewMockUserInput) => {
    const next: MockUser = {
      id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      telegramId: input.telegramId || `tg-${Math.floor(100000 + Math.random() * 900000)}`,
      name: input.name,
      role: input.role,
      bureau: input.role === "student" ? undefined : input.bureau
    };

    setUsers((items) => [next, ...items]);
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
