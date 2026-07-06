import { UserCog } from "lucide-react";
import { roleLabels } from "../constants";
import { hapticImpact } from "../lib/telegram";
import { useMockUser } from "../state/MockUserContext";

export function RoleSwitcher() {
  const { user, users, setUserId } = useMockUser();
  if (import.meta.env.VITE_ENABLE_MOCKS === "false") return null;

  const shouldShow =
    import.meta.env.DEV ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost" ||
    new URLSearchParams(window.location.search).has("previewRoles");

  if (!shouldShow) return null;

  return (
    <details className="role-switcher" aria-label="Preview role switcher">
      <summary>
        <UserCog size={16} aria-hidden="true" />
        <span>Preview mode</span>
        <strong>
          {roleLabels[user.role]}
          {user.bureau ? ` - ${user.bureau}` : ""}
        </strong>
      </summary>
      <select
        value={user.id}
        onChange={(event) => {
          hapticImpact("light");
          setUserId(event.target.value);
        }}
      >
        {users.map((mockUser) => (
          <option key={mockUser.id} value={mockUser.id}>
            {roleLabels[mockUser.role]} - {mockUser.bureau || "Student"}
          </option>
        ))}
      </select>
    </details>
  );
}
