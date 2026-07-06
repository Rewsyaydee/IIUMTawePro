import { FormEvent, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  KeyRound,
  Megaphone,
  Send,
  ShieldAlert,
  Trash2,
  UserCog,
  UserPlus,
  UsersRound
} from "lucide-react";
import { BUREAUS, ROLES, roleLabels } from "../constants";
import { confirmNative, hapticSuccess } from "../lib/telegram";
import { StatusBadge } from "../components/StatusBadge";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { AdminRole, Bureau, Role, ScheduleItem } from "../types";

const ADMIN_TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: UsersRound },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "notices", label: "Notices", icon: BellRing },
  { id: "audit", label: "Audit", icon: ClipboardList }
] as const;

type AdminTab = (typeof ADMIN_TABS)[number]["id"];

const ADMIN_ROLES: AdminRole[] = ["committee", "head", "mainboard"];

const defaultScheduleForm = {
  date: "2026-02-24",
  day: "Tuesday",
  week: "event_week" as ScheduleItem["week"],
  scheduledStartTime: "15:00",
  scheduledEndTime: "16:00",
  title: "New Ta'aruf Week session",
  venue: "TBC",
  tag: "Programme",
  audience: "All" as ScheduleItem["audience"],
  description: "",
  notifyMinutesBefore: "30",
  responsibleBureau: "Program Coordinator" as Bureau,
  readinessStatus: "pending" as NonNullable<ScheduleItem["readinessStatus"]>,
  preSessionTasks: "Confirm venue, Assign usher, Prepare announcement"
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function Mainboard() {
  const { user, users, addMockUser, updateMockUser, revokeMockUser } = useMockUser();
  const {
    attendanceProofs,
    auditLog,
    banners,
    bureauOperations,
    createEmergencyBroadcast,
    createScheduleItem,
    deactivateBanner,
    deleteScheduleItem,
    generateInviteCode,
    inviteCodes,
    notifications,
    recordAuditLog,
    reports,
    schedule,
    sendGlobalNotification,
    tasks,
    updateScheduleItem
  } = useMockData();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [emergencyForm, setEmergencyForm] = useState({
    title: "Emergency update",
    body: "",
    targetRole: "all",
    targetBureau: "all"
  });
  const [noticeForm, setNoticeForm] = useState({
    title: "Official update",
    body: "",
    targetRole: "all",
    targetBureau: "all",
    createBanner: true
  });
  const [inviteForm, setInviteForm] = useState({
    role: "committee" as AdminRole,
    bureau: "Catering" as Bureau,
    expiresAt: "2026-03-15T23:59"
  });
  const [userForm, setUserForm] = useState({
    name: "New Committee",
    telegramId: "",
    role: "committee" as Role,
    bureau: "Catering" as Bureau
  });
  const [scheduleForm, setScheduleForm] = useState(defaultScheduleForm);

  const metrics = useMemo(() => {
    const done = tasks.filter((task) => task.status === "done").length;
    const blocked = tasks.filter((task) => task.status === "blocked").length;
    const unresolved = reports.filter((report) => report.status !== "resolved").length;
    const verifiedAttendance = attendanceProofs.filter((proof) => proof.status === "sent_to_mainboard").length;
    const pendingAttendance = attendanceProofs.filter((proof) => proof.status === "pending_review").length;
    const taskCompletion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    const operationIssues = bureauOperations.filter((operation) => operation.status === "issue").length;
    const liveItems = schedule.filter((item) => item.isLive).length;
    const pendingInvites = inviteCodes.filter((invite) => !invite.isUsed).length;
    return {
      blocked,
      done,
      liveItems,
      operationIssues,
      pendingAttendance,
      pendingInvites,
      taskCompletion,
      totalTasks: tasks.length,
      unresolved,
      verifiedAttendance
    };
  }, [attendanceProofs, bureauOperations, inviteCodes, reports, schedule, tasks]);

  if (user.role !== "mainboard") {
    return (
      <section className="page-stack">
        <div className="empty-state tall">
          <ShieldAlert size={28} aria-hidden="true" />
          <strong>Mainboard only</strong>
          <p>Switch to the mainboard mock profile to open the control room.</p>
        </div>
      </section>
    );
  }

  const submitEmergency = async (event: FormEvent) => {
    event.preventDefault();
    const confirmed = await confirmNative("Send mock emergency broadcast?");
    if (!confirmed) return;

    createEmergencyBroadcast({
      title: emergencyForm.title,
      body: emergencyForm.body,
      targetRole: emergencyForm.targetRole as Role | "all",
      targetBureau: emergencyForm.targetBureau as Bureau | "all"
    });
    setEmergencyForm((current) => ({ ...current, body: "" }));
    hapticSuccess();
  };

  const submitNotice = (event: FormEvent) => {
    event.preventDefault();
    sendGlobalNotification({
      title: noticeForm.title,
      body: noticeForm.body,
      targetRole: noticeForm.targetRole as Role | "all",
      targetBureau: noticeForm.targetBureau as Bureau | "all",
      createBanner: noticeForm.createBanner
    });
    setNoticeForm((current) => ({ ...current, body: "" }));
    hapticSuccess();
  };

  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    generateInviteCode({
      role: inviteForm.role,
      bureau: inviteForm.role === "mainboard" ? undefined : inviteForm.bureau,
      expiresAt: inviteForm.expiresAt ? new Date(inviteForm.expiresAt).toISOString() : undefined
    });
    hapticSuccess();
  };

  const submitMockUser = (event: FormEvent) => {
    event.preventDefault();
    const next = addMockUser({
      name: userForm.name,
      telegramId: userForm.telegramId || undefined,
      role: userForm.role,
      bureau: userForm.role === "student" || userForm.role === "mainboard" ? undefined : userForm.bureau
    });
    recordAuditLog({
      action: "Added mock user",
      table: "users",
      recordId: next.id,
      details: `${next.name} added as ${roleLabels[next.role]}.`
    });
    setUserForm((current) => ({ ...current, name: "New Committee", telegramId: "" }));
    hapticSuccess();
  };

  const submitSchedule = (event: FormEvent) => {
    event.preventDefault();
    createScheduleItem({
      date: scheduleForm.date,
      day: scheduleForm.day,
      week: scheduleForm.week,
      scheduledStartTime: scheduleForm.scheduledStartTime,
      scheduledEndTime: scheduleForm.scheduledEndTime,
      title: scheduleForm.title,
      venue: scheduleForm.venue,
      tag: scheduleForm.tag,
      audience: scheduleForm.audience,
      description: scheduleForm.description,
      isLive: false,
      notifyMinutesBefore: Number(scheduleForm.notifyMinutesBefore) || 0,
      responsibleBureau: scheduleForm.responsibleBureau,
      readinessStatus: scheduleForm.readinessStatus,
      preSessionTasks: scheduleForm.preSessionTasks
        .split(",")
        .map((task) => task.trim())
        .filter(Boolean)
    });
    setScheduleForm(defaultScheduleForm);
    hapticSuccess();
  };

  const revokeUser = async (id: string, name: string) => {
    if (id === user.id) return;
    const confirmed = await confirmNative(`Revoke ${name} from this mock app?`);
    if (!confirmed) return;

    revokeMockUser(id);
    recordAuditLog({
      action: "Revoked mock user",
      table: "users",
      recordId: id,
      details: `${name} was removed from local mock access.`
    });
    hapticSuccess();
  };

  const removeScheduleItem = async (item: ScheduleItem) => {
    const confirmed = await confirmNative(`Delete ${item.title} from the mock schedule?`);
    if (!confirmed) return;

    deleteScheduleItem(item.id);
    hapticSuccess();
  };

  const renderOverview = () => (
    <>
      <section className="admin-hero">
        <div>
          <p className="eyebrow">Phase 3 command suite</p>
          <h3>Mainboard decisions, visible accountability</h3>
          <p>
            Manage access, publish schedule changes, send official notices, and keep an audit trail before the real backend is connected.
          </p>
        </div>
        <div className="admin-hero-meter" aria-label={`${metrics.taskCompletion}% task completion`}>
          <strong>{metrics.taskCompletion}%</strong>
          <span>POA done</span>
        </div>
      </section>

      <div className="metric-grid">
        <article>
          <span>Task completion</span>
          <strong>
            {metrics.done}/{metrics.totalTasks}
          </strong>
        </article>
        <article>
          <span>Blocked tasks</span>
          <strong>{metrics.blocked}</strong>
        </article>
        <article>
          <span>Open wellbeing</span>
          <strong>{metrics.unresolved}</strong>
        </article>
        <article>
          <span>Attendance sent</span>
          <strong>{metrics.verifiedAttendance}</strong>
        </article>
      </div>

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Attention queue</h3>
          <span>{metrics.operationIssues + metrics.pendingAttendance + metrics.pendingInvites} items</span>
        </div>
        <div className="admin-insight-grid">
          <article>
            <Activity size={18} aria-hidden="true" />
            <strong>{metrics.operationIssues} bureau issues</strong>
            <p>PrepTech, Multimedia, and Welfare style issues surface here for mainboard scanning.</p>
          </article>
          <article>
            <UserCog size={18} aria-hidden="true" />
            <strong>{metrics.pendingAttendance} attendance proofs</strong>
            <p>Special Task still verifies these before anything reaches mainboard records.</p>
          </article>
          <article>
            <CalendarDays size={18} aria-hidden="true" />
            <strong>{metrics.liveItems} live schedule item</strong>
            <p>Live sessions appear as public-facing guidance in the student view.</p>
          </article>
          <article>
            <KeyRound size={18} aria-hidden="true" />
            <strong>{metrics.pendingInvites} unused invites</strong>
            <p>Mock codes prepare the future invite and claims flow.</p>
          </article>
        </div>
      </section>
    </>
  );

  const renderUsers = () => (
    <>
      <form className="form-card" onSubmit={submitInvite}>
        <div className="form-title">
          <KeyRound size={20} aria-hidden="true" />
          <h3>Generate invite code</h3>
        </div>
        <div className="form-grid">
          <label>
            <span>Role</span>
            <select value={inviteForm.role} onChange={(event) => setInviteForm((current) => ({ ...current, role: event.target.value as AdminRole }))}>
              {ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Bureau</span>
            <select
              value={inviteForm.bureau}
              disabled={inviteForm.role === "mainboard"}
              onChange={(event) => setInviteForm((current) => ({ ...current, bureau: event.target.value as Bureau }))}
            >
              {BUREAUS.map((bureau) => (
                <option key={bureau} value={bureau}>
                  {bureau}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>Expiry</span>
          <input
            type="datetime-local"
            value={inviteForm.expiresAt}
            onChange={(event) => setInviteForm((current) => ({ ...current, expiresAt: event.target.value }))}
          />
        </label>
        <button className="primary-button full-width" type="submit">
          <UserPlus size={16} aria-hidden="true" />
          <span>Generate mock invite</span>
        </button>
      </form>

      <form className="form-card" onSubmit={submitMockUser}>
        <div className="form-title">
          <UsersRound size={20} aria-hidden="true" />
          <h3>Add mock user</h3>
        </div>
        <label>
          <span>Name</span>
          <input value={userForm.name} required onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <div className="form-grid">
          <label>
            <span>Role</span>
            <select value={userForm.role} onChange={(event) => setUserForm((current) => ({ ...current, role: event.target.value as Role }))}>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Bureau</span>
            <select
              value={userForm.bureau}
              disabled={userForm.role === "student" || userForm.role === "mainboard"}
              onChange={(event) => setUserForm((current) => ({ ...current, bureau: event.target.value as Bureau }))}
            >
              {BUREAUS.map((bureau) => (
                <option key={bureau} value={bureau}>
                  {bureau}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>Telegram ID</span>
          <input value={userForm.telegramId} placeholder="Optional in mock mode" onChange={(event) => setUserForm((current) => ({ ...current, telegramId: event.target.value }))} />
        </label>
        <button className="primary-button full-width" type="submit">
          <UserPlus size={16} aria-hidden="true" />
          <span>Add local user</span>
        </button>
      </form>

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Access list</h3>
          <span>{users.length} users</span>
        </div>
        <div className="admin-list">
          {users.map((person) => (
            <article className="admin-row" key={person.id}>
              <div className="admin-row-main">
                <strong>{person.name}</strong>
                <span>
                  {roleLabels[person.role]} {person.bureau ? `/ ${person.bureau}` : ""}
                </span>
              </div>
              <div className="admin-row-controls">
                <select
                  value={person.role}
                  onChange={(event) => {
                    const role = event.target.value as Role;
                    updateMockUser(person.id, { role, bureau: role === "student" || role === "mainboard" ? undefined : person.bureau || "Catering" });
                    recordAuditLog({
                      action: "Updated user role",
                      table: "users",
                      recordId: person.id,
                      details: `${person.name} role changed to ${roleLabels[role]}.`
                    });
                  }}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role]}
                    </option>
                  ))}
                </select>
                <select
                  value={person.bureau || "Catering"}
                  disabled={person.role === "student" || person.role === "mainboard"}
                  onChange={(event) => {
                    const bureau = event.target.value as Bureau;
                    updateMockUser(person.id, { bureau });
                    recordAuditLog({
                      action: "Updated user bureau",
                      table: "users",
                      recordId: person.id,
                      details: `${person.name} moved to ${bureau}.`
                    });
                  }}
                >
                  {BUREAUS.map((bureau) => (
                    <option key={bureau} value={bureau}>
                      {bureau}
                    </option>
                  ))}
                </select>
                <button className="danger-outline-button" type="button" disabled={person.id === user.id} onClick={() => revokeUser(person.id, person.name)}>
                  <Trash2 size={15} aria-hidden="true" />
                  <span>Revoke</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Invite codes</h3>
          <span>{inviteCodes.length} codes</span>
        </div>
        <div className="admin-list">
          {inviteCodes.map((invite) => (
            <article className="admin-row" key={invite.id}>
              <div className="admin-row-main">
                <strong className="invite-code">{invite.code}</strong>
                <span>
                  {roleLabels[invite.role]} {invite.bureau ? `/ ${invite.bureau}` : ""} {invite.isReusable ? "/ reusable" : ""}{" "}
                  {invite.expiresAt ? `/ expires ${formatDateTime(invite.expiresAt)}` : ""}
                </span>
              </div>
              <StatusBadge value={invite.isReusable ? "ready" : invite.isUsed ? "done" : "pending"} />
            </article>
          ))}
        </div>
      </section>
    </>
  );

  const renderSchedule = () => (
    <>
      <form className="form-card" onSubmit={submitSchedule}>
        <div className="form-title">
          <CalendarPlus size={20} aria-hidden="true" />
          <h3>Add programme item</h3>
        </div>
        <div className="form-grid">
          <label>
            <span>Title</span>
            <input value={scheduleForm.title} required onChange={(event) => setScheduleForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Venue</span>
            <input value={scheduleForm.venue} required onChange={(event) => setScheduleForm((current) => ({ ...current, venue: event.target.value }))} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Date</span>
            <input type="date" value={scheduleForm.date} required onChange={(event) => setScheduleForm((current) => ({ ...current, date: event.target.value }))} />
          </label>
          <label>
            <span>Day</span>
            <input value={scheduleForm.day} required onChange={(event) => setScheduleForm((current) => ({ ...current, day: event.target.value }))} />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Start</span>
            <input
              type="time"
              value={scheduleForm.scheduledStartTime}
              required
              onChange={(event) => setScheduleForm((current) => ({ ...current, scheduledStartTime: event.target.value }))}
            />
          </label>
          <label>
            <span>End</span>
            <input
              type="time"
              value={scheduleForm.scheduledEndTime}
              required
              onChange={(event) => setScheduleForm((current) => ({ ...current, scheduledEndTime: event.target.value }))}
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Audience</span>
            <select
              value={scheduleForm.audience}
              onChange={(event) => setScheduleForm((current) => ({ ...current, audience: event.target.value as ScheduleItem["audience"] }))}
            >
              <option value="All">All</option>
              <option value="Students">Students</option>
              <option value="Committee">Committee</option>
            </select>
          </label>
          <label>
            <span>Responsible bureau</span>
            <select
              value={scheduleForm.responsibleBureau}
              onChange={(event) => setScheduleForm((current) => ({ ...current, responsibleBureau: event.target.value as Bureau }))}
            >
              {BUREAUS.map((bureau) => (
                <option key={bureau} value={bureau}>
                  {bureau}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            <span>Tag</span>
            <input value={scheduleForm.tag} required onChange={(event) => setScheduleForm((current) => ({ ...current, tag: event.target.value }))} />
          </label>
          <label>
            <span>Reminder minutes</span>
            <input
              type="number"
              min="0"
              value={scheduleForm.notifyMinutesBefore}
              onChange={(event) => setScheduleForm((current) => ({ ...current, notifyMinutesBefore: event.target.value }))}
            />
          </label>
        </div>
        <label>
          <span>Description</span>
          <textarea
            rows={3}
            value={scheduleForm.description}
            onChange={(event) => setScheduleForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>
        <label>
          <span>Pre-session tasks</span>
          <input
            value={scheduleForm.preSessionTasks}
            onChange={(event) => setScheduleForm((current) => ({ ...current, preSessionTasks: event.target.value }))}
          />
        </label>
        <button className="primary-button full-width" type="submit">
          <CalendarPlus size={16} aria-hidden="true" />
          <span>Add to mock schedule</span>
        </button>
      </form>

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Schedule publishing</h3>
          <span>{schedule.length} items</span>
        </div>
        <div className="schedule-admin-list">
          {[...schedule]
            .sort((a, b) => `${a.date} ${a.scheduledStartTime}`.localeCompare(`${b.date} ${b.scheduledStartTime}`))
            .map((item) => (
              <article className={item.isLive ? "schedule-admin-row is-live" : "schedule-admin-row"} key={item.id}>
                <div className="schedule-admin-time">
                  <strong>{item.scheduledStartTime}</strong>
                  <span>{item.date}</span>
                </div>
                <div className="schedule-admin-copy">
                  <div className="schedule-title-row">
                    <div>
                      <h4>{item.title}</h4>
                      <p>
                        {item.venue} / {item.audience}
                      </p>
                    </div>
                    <div className="badge-row">
                      {item.isLive && <StatusBadge value="live" />}
                      <StatusBadge value={item.readinessStatus || "pending"} />
                    </div>
                  </div>
                  <div className="admin-row-controls compact">
                    <button
                      className={item.isLive ? "danger-outline-button" : "verify-button"}
                      type="button"
                      onClick={() => updateScheduleItem(item.id, { isLive: !item.isLive })}
                    >
                      <Send size={15} aria-hidden="true" />
                      <span>{item.isLive ? "Unpublish" : "Publish"}</span>
                    </button>
                    <select
                      value={item.readinessStatus || "pending"}
                      onChange={(event) => updateScheduleItem(item.id, { readinessStatus: event.target.value as NonNullable<ScheduleItem["readinessStatus"]> })}
                    >
                      <option value="pending">Pending</option>
                      <option value="ready">Ready</option>
                      <option value="issues">Issues</option>
                    </select>
                    <button className="danger-outline-button" type="button" onClick={() => removeScheduleItem(item)}>
                      <Trash2 size={15} aria-hidden="true" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </section>
    </>
  );

  const renderNotices = () => (
    <>
      <form className="form-card" onSubmit={submitNotice}>
        <div className="form-title">
          <Megaphone size={20} aria-hidden="true" />
          <h3>Official notice</h3>
        </div>
        <label>
          <span>Title</span>
          <input value={noticeForm.title} required onChange={(event) => setNoticeForm((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label>
          <span>Message</span>
          <textarea value={noticeForm.body} required rows={4} onChange={(event) => setNoticeForm((current) => ({ ...current, body: event.target.value }))} />
        </label>
        <div className="form-grid">
          <label>
            <span>Role</span>
            <select value={noticeForm.targetRole} onChange={(event) => setNoticeForm((current) => ({ ...current, targetRole: event.target.value }))}>
              <option value="all">All roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Bureau</span>
            <select
              value={noticeForm.targetBureau}
              onChange={(event) => setNoticeForm((current) => ({ ...current, targetBureau: event.target.value }))}
            >
              <option value="all">All bureaus</option>
              {BUREAUS.map((bureau) => (
                <option key={bureau} value={bureau}>
                  {bureau}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={noticeForm.createBanner}
            onChange={(event) => setNoticeForm((current) => ({ ...current, createBanner: event.target.checked }))}
          />
          <span>Show as in-app banner</span>
        </label>
        <button className="primary-button full-width" type="submit">
          <Send size={16} aria-hidden="true" />
          <span>Send mock notice</span>
        </button>
      </form>

      <form className="form-card emergency-card" onSubmit={submitEmergency}>
        <div className="form-title">
          <AlertTriangle size={20} aria-hidden="true" />
          <h3>Emergency broadcast</h3>
        </div>
        <label>
          <span>Title</span>
          <input value={emergencyForm.title} required onChange={(event) => setEmergencyForm((current) => ({ ...current, title: event.target.value }))} />
        </label>
        <label>
          <span>Message</span>
          <textarea
            value={emergencyForm.body}
            required
            rows={4}
            onChange={(event) => setEmergencyForm((current) => ({ ...current, body: event.target.value }))}
          />
        </label>
        <div className="form-grid">
          <label>
            <span>Role</span>
            <select value={emergencyForm.targetRole} onChange={(event) => setEmergencyForm((current) => ({ ...current, targetRole: event.target.value }))}>
              <option value="all">All roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Bureau</span>
            <select
              value={emergencyForm.targetBureau}
              onChange={(event) => setEmergencyForm((current) => ({ ...current, targetBureau: event.target.value }))}
            >
              <option value="all">All bureaus</option>
              {BUREAUS.map((bureau) => (
                <option key={bureau} value={bureau}>
                  {bureau}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="danger-button full-width" type="submit">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>Send mock emergency</span>
        </button>
      </form>

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Active banners</h3>
          <span>{banners.filter((banner) => banner.isActive).length} active</span>
        </div>
        <div className="banner-admin-list">
          {banners.map((banner) => (
            <article key={banner.id}>
              <div>
                <strong>{banner.title}</strong>
                <p>{banner.body}</p>
              </div>
              <div className="admin-actions">
                <StatusBadge value={banner.type === "emergency" ? "critical" : "mock"} />
                {banner.isActive && (
                  <button type="button" onClick={() => deactivateBanner(banner.id)}>
                    deactivate
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ops-panel">
        <div className="section-heading">
          <h3>Mock sends</h3>
          <span>{notifications.length} records</span>
        </div>
        <div className="notification-list">
          {notifications.map((notification) => (
            <article key={notification.id}>
              <BellRing size={16} aria-hidden="true" />
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
                <span>
                  {notification.targetRole} / {notification.targetBureau || "all"} / {formatDateTime(notification.sentAt)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );

  const renderAudit = () => (
    <section className="ops-panel">
      <div className="section-heading">
        <h3>Admin audit trail</h3>
        <span>{auditLog.length} records</span>
      </div>
      <div className="audit-list">
        {auditLog.map((entry) => (
          <article key={entry.id}>
            <div className="audit-marker" aria-hidden="true" />
            <div>
              <strong>{entry.action}</strong>
              <p>{entry.details}</p>
              <span>
                {entry.actorName} / {entry.table} / {formatDateTime(entry.timestamp)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Control Room</h2>
        </div>
        <span className="soft-chip">Phase 3 admin suite</span>
      </div>

      <div className="admin-tabs" role="tablist" aria-label="Mainboard admin sections">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "admin-tab active" : "admin-tab"}
              key={tab.id}
              role="tab"
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && renderOverview()}
      {activeTab === "users" && renderUsers()}
      {activeTab === "schedule" && renderSchedule()}
      {activeTab === "notices" && renderNotices()}
      {activeTab === "audit" && renderAudit()}
    </section>
  );
}

export default Mainboard;
