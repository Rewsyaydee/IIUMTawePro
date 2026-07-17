import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, PenLine, Plus, Trash2 } from "lucide-react";
import { BUREAUS } from "../constants";
import { authSessionChangedEvent, shouldUseApiAuth } from "../lib/apiAuth";
import { hapticError, hapticImpact } from "../lib/telegram";
import { createTask as createTaskApi, deleteTaskApi, listTasks, updateTaskDetails as updateTaskDetailsApi, updateTaskStatus as updateTaskStatusApi } from "../lib/tasksApi";
import { StatusBadge } from "../components/StatusBadge";
import { useMockData } from "../state/MockDataContext";
import { useMockUser } from "../state/MockUserContext";
import type { Bureau, PoaTask, Priority, TaskStatus } from "../types";

const statuses: TaskStatus[] = ["todo", "in_progress", "blocked", "done"];
const priorities: Priority[] = ["low", "medium", "high", "critical"];

function Tasks() {
  const { user } = useMockUser();
  const { tasks, updateTaskStatus, addTask, updateTaskDetails, deleteTask } = useMockData();
  const apiMode = shouldUseApiAuth();
  const [remoteTasks, setRemoteTasks] = useState<PoaTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [authRefreshTick, setAuthRefreshTick] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    bureau: user.bureau || "Welfare",
    title: "",
    description: "",
    dueDate: todayStr,
    dueTime: "09:00",
    assignedTo: "",
    priority: "medium"
  });

  const canSeeTasks = user.role !== "student";
  const canCreate = user.role === "head" || user.role === "mainboard";
  const activeTasks = apiMode ? remoteTasks : tasks;

  useEffect(() => {
    const handleSessionChanged = () => setAuthRefreshTick((value) => value + 1);
    window.addEventListener(authSessionChangedEvent, handleSessionChanged);
    return () => window.removeEventListener(authSessionChangedEvent, handleSessionChanged);
  }, []);

  useEffect(() => {
    if (!apiMode || user.role === "student") return;

    let cancelled = false;
    setLoadingTasks(true);
    setErrorMessage("");
    listTasks()
      .then((loaded) => {
        if (!cancelled) setRemoteTasks(loaded);
      })
      .catch((error) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load tasks.");
          hapticError();
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTasks(false);
      });

    return () => { cancelled = true; };
  }, [apiMode, authRefreshTick, user.role]);

  const visibleTasks = useMemo(() => {
    if (user.role === "mainboard") return activeTasks;
    return activeTasks.filter((task) => task.bureau === user.bureau);
  }, [activeTasks, user.bureau, user.role]);

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

  const submitTask = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    const fields = {
      bureau: form.bureau as Bureau,
      title: form.title,
      description: form.description,
      dueDate: form.dueDate,
      dueTime: form.dueTime,
      assignedTo: form.assignedTo || user.name,
      priority: form.priority as Priority
    };

    try {
      if (editingId) {
        if (apiMode) {
          const updated = await updateTaskDetailsApi(editingId, fields);
          setRemoteTasks((items) => items.map((item) => (item.id === editingId ? updated : item)));
        } else {
          updateTaskDetails(editingId, fields);
        }
        setEditingId(null);
      } else {
        if (apiMode) {
          const task = await createTaskApi(fields);
          setRemoteTasks((items) => [task, ...items]);
        } else {
          addTask(fields);
        }
      }

      setForm((current) => ({ ...current, title: "", description: "", assignedTo: "" }));
      setFormOpen(false);
      hapticImpact("medium");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save task.");
      hapticError();
    }
  };

  const handleStatusUpdate = async (id: string, status: TaskStatus) => {
    try {
      if (apiMode) {
        const updated = await updateTaskStatusApi(id, status);
        setRemoteTasks((items) => items.map((item) => (item.id === id ? updated : item)));
      } else {
        updateTaskStatus(id, status);
      }
      hapticImpact("light");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update task.");
      hapticError();
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      if (apiMode) {
        await deleteTaskApi(id);
        setRemoteTasks((items) => items.filter((item) => item.id !== id));
      } else {
        deleteTask(id);
      }
      setConfirmDelete(null);
      hapticImpact("medium");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete task.");
      hapticError();
    }
  };

  const startEdit = (task: PoaTask) => {
    setForm({
      bureau: task.bureau,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      assignedTo: task.assignedTo,
      priority: task.priority
    });
    setEditingId(task.id);
    setFormOpen(true);
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Plan of action</p>
          <h2>{user.role === "mainboard" ? "Masterplan" : "Bureau Tasks"}</h2>
        </div>
        <span className="soft-chip">{apiMode ? "Supabase" : "Mock"}</span>
      </div>

      {errorMessage && (
        <div className="banner banner-emergency">
          <ClipboardCheck size={18} />
          <div>
            <strong>Error</strong>
            <p>{errorMessage}</p>
          </div>
          <button className="icon-button" onClick={() => setErrorMessage("")} aria-label="Dismiss error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      )}

      {canCreate && (
        <button className="icon-text-button" style={{ justifySelf: "start" }} onClick={() => setFormOpen((value) => !value)}>
          <Plus size={16} aria-hidden="true" />
          <span>Add task</span>
        </button>
      )}

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
          <div className="form-actions">
            <button className="primary-button" type="submit">
              <Plus size={16} aria-hidden="true" />
              <span>{editingId ? "Save changes" : "Create task"}</span>
            </button>
            {editingId && (
              <button className="outline-button" type="button" onClick={() => { setEditingId(null); setFormOpen(false); }}>
                Cancel
              </button>
            )}
          </div>
        </motion.form>
      )}

      {loadingTasks ? (
        <div className="skeleton-page" />
      ) : visibleTasks.length === 0 ? (
        <div className="empty-state">
          <ClipboardCheck size={24} aria-hidden="true" />
          <strong>No tasks yet</strong>
          <p>Tasks for {user.bureau || "all bureaus"} will appear here.</p>
        </div>
      ) : (
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
              <div className="review-actions" style={{ marginBottom: 8 }}>
                <button type="button" className="outline-button" onClick={() => startEdit(task)}>
                  <PenLine size={14} aria-hidden="true" />
                  <span>Edit</span>
                </button>
                {confirmDelete === task.id ? (
                  <div className="rejection-form">
                    <span style={{ fontSize: "0.85rem" }}>Delete this task?</span>
                    <div className="rejection-form-actions">
                      <button type="button" className="outline-button" onClick={() => setConfirmDelete(null)}>No</button>
                      <button type="button" className="danger-outline-button" onClick={() => handleDeleteTask(task.id)}>Yes, delete</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="danger-outline-button" onClick={() => setConfirmDelete(task.id)}>
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
              <div className="segmented-actions">
                {statuses.map((status) => (
                  <button
                    key={status}
                    className={task.status === status ? "selected" : ""}
                    type="button"
                    onClick={() => handleStatusUpdate(task.id, status)}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}

export default Tasks;
