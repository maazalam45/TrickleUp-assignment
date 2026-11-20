import Icon from './Icon.jsx';
import { formatDate } from '../utils/dates.js';

export default function TaskRow({ task, menuId, setMenuId, onEdit, onDelete, onStatus }) {
  return (
    <article className="task-row">
      <div className="task-main">
        <button
          className={`task-check ${task.status === 'Done' ? 'checked' : ''}`}
          aria-label={
            task.status === 'Done' ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`
          }
          onClick={() => onStatus(task.status === 'Done' ? 'To Do' : 'Done')}
        >
          {task.status === 'Done' && <Icon name="check" size={13} />}
        </button>
        <div className="task-title-wrap">
          <strong className={task.status === 'Done' ? 'task-done' : ''}>{task.title}</strong>
          <span>{task.description}</span>
        </div>
      </div>
      <div className="task-meta">
        <div className="task-cell priority-cell">
          <span className={`priority-pill ${task.priority.toLowerCase()}`}>
            <i />
            {task.priority}
          </span>
        </div>
        <div className="task-cell status-cell">
          <span className={`status-pill ${task.status.toLowerCase().replace(' ', '-')}`}>
            <i />
            {task.status}
          </span>
        </div>
        <div className="task-cell due-cell">
          <Icon name="calendar" size={15} />
          {formatDate(task.dueDate)}
        </div>
      </div>
      <div className="task-menu-wrap">
        <button
          className="row-menu"
          aria-label={`Options for ${task.title}`}
          onClick={() => setMenuId(menuId === task.id ? null : task.id)}
        >
          <Icon name="dots" size={19} />
        </button>
        {menuId === task.id && (
          <>
            <button
              className="menu-dismiss"
              aria-label="Close menu"
              onClick={() => setMenuId(null)}
            />
            <div className="task-menu">
              <button onClick={onEdit}>Edit task</button>
              <div className="menu-label">CHANGE STATUS</div>
              {['To Do', 'In Progress', 'Done']
                .filter((status) => status !== task.status)
                .map((status) => (
                  <button key={status} onClick={() => onStatus(status)}>
                    {status === 'Done' ? 'Mark as done' : `Move to ${status}`}
                  </button>
                ))}
              <button className="delete-action" onClick={onDelete}>
                Delete task
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
