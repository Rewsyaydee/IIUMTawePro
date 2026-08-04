import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UsersRound } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { authSessionChangedEvent, shouldUseApiAuth } from "../lib/apiAuth";
import { listBureauMembers, type BureauMember } from "../lib/usersApi";
import { useMockUser } from "../state/MockUserContext";
import { BUREAUS } from "../constants";
import type { Bureau } from "../types";

function MemberRow({ member, index }: { member: BureauMember; index: number }) {
  const username = member.telegram_username ? `@${member.telegram_username}` : "—";
  return (
    <motion.article
      className="admin-row"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <div className="member-avatar">{member.name.charAt(0).toUpperCase()}</div>
      <div className="admin-row-main">
        <strong>{member.name}</strong>
        <span>
          {member.matric_number || "No matric"} · {username}
        </span>
      </div>
    </motion.article>
  );
}

function Members() {
  const { user, users } = useMockUser();
  const apiMode = shouldUseApiAuth();
  const [bureau, setBureau] = useState<Bureau | "all">(user.bureau || "all");
  const [remoteMembers, setRemoteMembers] = useState<BureauMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);

  useEffect(() => {
    const handleSessionChanged = () => setAuthRefreshTick((value) => value + 1);
    window.addEventListener(authSessionChangedEvent, handleSessionChanged);
    return () => window.removeEventListener(authSessionChangedEvent, handleSessionChanged);
  }, []);

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    setLoading(true);
    listBureauMembers(bureau === "all" ? undefined : bureau)
      .then((members) => {
        if (!cancelled) setRemoteMembers(members);
      })
      .catch(() => {
        if (!cancelled) setRemoteMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiMode, authRefreshTick, bureau]);

  const members = apiMode
    ? remoteMembers
    : users
        .filter((person) => (bureau === "all" ? person.role !== "student" : person.bureau === bureau))
        .map((person) => ({
          id: person.id,
          name: person.name,
          matric_number: person.matricNumber,
          telegram_username: person.telegramId.startsWith("@") ? person.telegramId.slice(1) : "",
          role: person.role
        }));

  const isMainboard = user.role === "mainboard";

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Bureau roster</p>
          <h2>Members</h2>
        </div>
        <span className="soft-chip">{apiMode ? "Supabase" : "Mock"}</span>
      </div>

      {isMainboard && (
        <label>
          <span>Bureau</span>
          <select value={bureau} onChange={(event) => setBureau(event.target.value as Bureau | "all")}>
            <option value="all">All bureaus</option>
            {BUREAUS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      )}

      <section className="ops-panel">
        <div className="section-heading">
          <h3>{bureau === "all" ? "All members" : `${bureau} members`}</h3>
          <span>{loading ? "loading" : `${members.length} members`}</span>
        </div>
        {loading ? (
          <div className="skeleton-page" />
        ) : members.length === 0 ? (
          <EmptyState icon={UsersRound} title="No members" body="Registered members of this bureau will appear here." />
        ) : (
          <div className="admin-list">
            {members.map((member, index) => (
              <MemberRow key={member.id} member={member} index={index} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default Members;
