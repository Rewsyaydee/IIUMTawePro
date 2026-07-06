import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Plus } from "lucide-react";
import { BUREAUS } from "../constants";
import { hapticImpact } from "../lib/telegram";
import { StatusBadge } from "../components/StatusBadge";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { Bureau, Priority, TaskStatus } from "../types";

const statuses: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];
const priorities: Priority[] = ["low", "medium", "high", "critical"];

function Tasks() {
  const { user } = useMockUser();
  const { tasks, updateTaskStatus, addTask } = useMockData();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    bureau: user.bureau || "Welfare",
    title: "",
    description: "",
    dueDate: "2026-02-23",
    dueTime: "09:00",
    assignedTo: "",
    priority: "medium"
  });

  const canSeeTasks = user.role !== "student";
  const canCreate = user.role === "head" || user.role === "mainboard";
  const visibleTasks = useMemo(() => {
    if (user.role === "mainboard") return tasks;
    return tasks.filter((task) => task.bureau === user.bureau);
  }, [tasks, user.bureau, user.role]);

  if (!canSeeTasks) {
    return (
      <section className="page-stack">
        <div className="empty-state tall">
          <ClipboardCheck size={28} aria-hidden="true" />
          <strong>Committee area</strong>
          <p>POA tasks appear for committee, heads, and mainboard roles.</p>
        </div>
      </section>
    );
  }

  const submitTask = (event: FormEvent) => {
    event.preventDefault();
    addTask({
      bureau: form.bureau as Bureau,
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      dueTime: form.dueTime,
      assignedTo: form.assignedTo || user.name,
      priority: form.priority as Priority
    });
    setForm((current) => ({ ...current, title: "", description: "", assignedTo: "" }));
    setFormOpen(false);
    hapticImpact("medium");
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Plan of action</p>
          <h2>{user.role === "mainboard" ? "Masterplan" : "Bureau Tasks"}</h2>
        </div>
        {canCreate && (
          <button className="icon-text-button" onClick={() => setFormOpen((value) => !value)}>
            <Plus size={16} aria-hidden="true" />
            <span>Add</span>
          </button>
        )}
      </div>

      {formOpen && (
        <motion.form className="form-card compact" onSubmit={submitTask} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <label>
            <span>Bureau</span>
            <select
              value={form.bureau}
              onChange={(event) => setForm((current) => ({ ...current, bureau: event.target.value as Bureau }))}
              disabled={user.role === "head"}
            >
              {BUREAUS.map((bureau) => (
                <option key={bureau} value={bureau}>
                  {bureau}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Title</span>
            <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label>
            <span>Description</span>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <div className="form-grid">
            <label>
              <span>Due date</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </label>
            <label>
              <span>Due time</span>
              <input
                type="time"
                value={form.dueTime}
                onChange={(event) => setForm((current) => ({ ...current, dueTime: event.target.value }))}
              />
            </label>
          </div>
          <label>
            <span>Assigned to</span>
            <input value={form.assignedTo} onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))} />
          </label>
          <label>
            <span>Priority</span>
            <select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button full-width" type="submit">
            <Plus size={16} aria-hidden="true" />
            <span>Create task</span>
          </button>
        </motion.form>
      )}

      <div className="task-board">
        {visibleTasks.map((task, index) => (
          <motion.article
            key={task.id}
            className={`task-card priority-${task.priority}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <div className="task-card-header">
              <div>
                <h3>{task.title}</h3>
                <p>
                  {task.dueDate} at {task.dueTime}
                </p>
              </div>
              <StatusBadge value={task.priority} />
            </div>
            <p className="muted">{task.description}</p>
            <div className="task-meta">
              <span>{task.bureau}</span>
              <span>{task.assignedTo}</span>
            </div>
            <div className="segmented-actions">
              {statuses.map((status) => (
                <button
                  key={status}
                  className={task.status === status ? "selected" : ""}
                  type="button"
                  onClick={() => {
                    hapticImpact("light");
                    updateTaskStatus(task.id, status);
                  }}
                >
                  {status.replace("_", " ")}
                </button>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export default Tasks;
