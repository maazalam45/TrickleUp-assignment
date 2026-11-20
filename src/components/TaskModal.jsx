import { useState } from 'react';
import Icon from './Icon.jsx';
import { dateOffset } from '../utils/dates.js';

export default function TaskModal({ task, workspace, onClose, onSave }) {
  const [form, setForm] = useState(
    task
      ? {
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate,
        }
      : { title: '', description: '', priority: 'Medium', status: 'To Do', dueDate: '' },
  );
  const [attempted, setAttempted] = useState(false);
  const minDate = dateOffset(0);
  const dateInvalid = form.dueDate && form.dueDate < minDate;
  function submit(event) {
    event.preventDefault();
    setAttempted(true);
    if (!form.title.trim() || !form.description.trim() || !form.dueDate || dateInvalid) return;
    onSave(form);
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <span className="modal-eyebrow">
              {task ? 'MAKE A CHANGE' : `NEW TASK · ${workspace.toUpperCase()}`}
            </span>
            <h2 id="modal-title">{task ? 'Edit task' : 'Create a task'}</h2>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" />
          </button>
        </div>
        <form onSubmit={submit} noValidate>
          <label className="form-label">
            Task name <span>*</span>
            <input
              autoFocus
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="e.g. Prepare project proposal"
              maxLength={100}
            />
            {attempted && !form.title.trim() && (
              <small className="field-error">Add a task name to continue.</small>
            )}
          </label>
          <label className="form-label">
            Description <span>*</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="What needs to get done?"
              rows="3"
              maxLength={500}
            />
            {attempted && !form.description.trim() && (
              <small className="field-error">Add a short description.</small>
            )}
          </label>
          <div className="form-grid">
            <label className="form-label">
              Priority
              <select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <label className="form-label">
              Status
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                <option>To Do</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </label>
          </div>
          <label className="form-label">
            Due date <span>*</span>
            <input
              type="date"
              min={minDate}
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
            {attempted && !form.dueDate && (
              <small className="field-error">Choose a due date.</small>
            )}
            {attempted && dateInvalid && (
              <small className="field-error">Due date can’t be in the past.</small>
            )}
          </label>
          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              {task ? 'Save changes' : 'Create task'} <Icon name="arrow" size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
