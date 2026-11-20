import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { formatDate } from '../utils/dates.js';

export default function TaskBoard({ tasks, onEdit, onDelete, onMove }) {
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  const moveHandler = useRef(onMove);
  moveHandler.current = onMove;

  function startDrag(event, task) {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    const nextDrag = {
      taskId: task.id,
      title: task.title,
      x: event.clientX,
      y: event.clientY,
      over: null,
      overTaskId: null,
      placement: 'after',
      pointerId: event.pointerId,
    };
    dragRef.current = nextDrag;
    setDrag(nextDrag);
  }

  useEffect(() => {
    if (!drag) return undefined;
    function handlePointerMove(event) {
      if (event.pointerId !== drag.pointerId) return;
      const edgeSize = 56;
      if (event.clientY < edgeSize) window.scrollBy(0, -8);
      else if (event.clientY > window.innerHeight - edgeSize) window.scrollBy(0, 8);
      const board = document.querySelector('.task-board');
      const boardBounds = board?.getBoundingClientRect();
      if (boardBounds && event.clientX < boardBounds.left + edgeSize) board.scrollLeft -= 8;
      else if (boardBounds && event.clientX > boardBounds.right - edgeSize) board.scrollLeft += 8;
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('[data-board-status]');
      const targetCard = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('[data-board-task]');
      const bounds = targetCard?.getBoundingClientRect();
      const placement =
        bounds && event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
      const next = {
        ...dragRef.current,
        x: event.clientX,
        y: event.clientY,
        over: target?.dataset.boardStatus ?? null,
        overTaskId: targetCard?.dataset.boardTask ?? null,
        placement,
      };
      dragRef.current = next;
      setDrag(next);
      event.preventDefault();
    }
    function finishDrag(event, shouldMove) {
      const current = dragRef.current;
      if (!current || event.pointerId !== current.pointerId) return;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const target = element?.closest('[data-board-status]');
      const targetCard = element?.closest('[data-board-task]');
      const bounds = targetCard?.getBoundingClientRect();
      const placement =
        bounds && event.clientY < bounds.top + bounds.height / 2 ? 'before' : current.placement;
      const destination = target?.dataset.boardStatus ?? current.over;
      if (shouldMove && destination) {
        const task = tasks.find((item) => item.id === current.taskId);
        if (task)
          moveHandler.current(
            task,
            destination,
            targetCard?.dataset.boardTask ?? current.overTaskId,
            placement,
          );
      }
      dragRef.current = null;
      setDrag(null);
    }
    const handlePointerUp = (event) => finishDrag(event, true);
    const handlePointerCancel = (event) => finishDrag(event, false);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [drag?.taskId, drag?.pointerId, tasks]);

  if (!tasks.length) {
    return (
      <div className="board-empty-state">
        <strong>No tasks match these filters</strong>
        <span>Change the search or filters to see tasks here.</span>
      </div>
    );
  }
  const statuses = ['To Do', 'In Progress', 'Done'];
  return (
    <div className="task-board">
      {statuses.map((status) => {
        const columnTasks = tasks
          .filter((task) => task.status === status)
          .sort((a, b) => {
            if (Number.isFinite(a.boardOrder) && Number.isFinite(b.boardOrder))
              return a.boardOrder - b.boardOrder;
            if (Number.isFinite(a.boardOrder)) return -1;
            if (Number.isFinite(b.boardOrder)) return 1;
            return a.dueDate.localeCompare(b.dueDate);
          });
        return (
          <section
            className={`board-column ${drag?.over === status ? 'drop-target' : ''}`}
            key={status}
            data-board-status={status}
          >
            <header className="board-column-heading">
              <span className={`column-dot ${status.toLowerCase().replace(' ', '-')}`} />
              <h3>{status}</h3>
              <span className="column-count">{columnTasks.length}</span>
            </header>
            <div className="board-cards">
              {columnTasks.map((task) => (
                <article
                  className={`board-card ${drag?.taskId === task.id ? 'is-dragging' : ''}`}
                  key={task.id}
                  data-board-task={task.id}
                >
                  <div className="board-card-top">
                    <span className={`priority-pill ${task.priority.toLowerCase()}`}>
                      <i />
                      {task.priority}
                    </span>
                    <button
                      type="button"
                      className="board-drag-handle"
                      aria-label={`Drag ${task.title} to reorder or change status`}
                      title="Drag to reorder or change status"
                      onPointerDown={(event) => startDrag(event, task)}
                    >
                      ⠿
                    </button>
                  </div>
                  <h4>{task.title}</h4>
                  <p>{task.description}</p>
                  <div className="board-card-bottom">
                    <span className="due-cell">
                      <Icon name="calendar" size={14} />
                      {formatDate(task.dueDate)}
                    </span>
                    <div className="board-card-actions">
                      <button onClick={() => onEdit(task)}>Edit</button>
                      <button className="delete-action" onClick={() => onDelete(task)}>
                        Delete
                      </button>
                    </div>
                    <select
                      aria-label={`Change ${task.title} status`}
                      value={task.status}
                      onChange={(event) => onMove(task, event.target.value, null, 'after')}
                    >
                      <option>To Do</option>
                      <option>In Progress</option>
                      <option>Done</option>
                    </select>
                  </div>
                </article>
              ))}
              {columnTasks.length === 0 && <div className="board-empty">Drop a task here</div>}
            </div>
          </section>
        );
      })}
      {drag && (
        <div className="drag-preview" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <span>⠿</span>
          {drag.title}
        </div>
      )}
    </div>
  );
}
