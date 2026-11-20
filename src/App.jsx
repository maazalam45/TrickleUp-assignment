import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './components/Icon.jsx';
import Stat from './components/Stat.jsx';
import TaskBoard from './components/TaskBoard.jsx';
import TaskModal from './components/TaskModal.jsx';
import TaskRow from './components/TaskRow.jsx';
import { seedActivity, seedTasks } from './data/seedData.js';
import { dateOffset, timeAgo } from './utils/dates.js';
import { createId, readStorage, writeStorage } from './utils/storage.js';

function App() {
  const [tasks, setTasks] = useState(() => readStorage('daymark.tasks', seedTasks));
  const [activity, setActivity] = useState(() => readStorage('daymark.activity', seedActivity));
  const [workspace, setWorkspace] = useState('work');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [priorityFilter, setPriorityFilter] = useState('All priorities');
  const [sort, setSort] = useState('oldest');
  const [modal, setModal] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [mobileActivity, setMobileActivity] = useState(false);
  const [taskView, setTaskView] = useState('list');
  const searchInput = useRef(null);

  useEffect(() => {
    writeStorage('daymark.tasks', tasks);
  }, [tasks]);
  useEffect(() => {
    writeStorage('daymark.activity', activity);
  }, [activity]);
  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.current?.focus();
      }
      if (event.key === 'Escape') {
        setModal(null);
        setMenuId(null);
        setMobileActivity(false);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);
  const log = (text, type) =>
    setActivity((items) =>
      [{ id: createId(), text, type, time: Date.now() }, ...items].slice(0, 5),
    );
  const workspaceTasks = useMemo(
    () => tasks.filter((task) => task.workspace === workspace),
    [tasks, workspace],
  );
  const visibleTasks = useMemo(
    () =>
      workspaceTasks
        .filter((task) => {
          const matchesQuery = `${task.title} ${task.description}`
            .toLowerCase()
            .includes(query.toLowerCase());
          return (
            matchesQuery &&
            (statusFilter === 'All statuses' || task.status === statusFilter) &&
            (priorityFilter === 'All priorities' || task.priority === priorityFilter)
          );
        })
        .sort((a, b) =>
          sort === 'oldest'
            ? a.dueDate.localeCompare(b.dueDate)
            : b.dueDate.localeCompare(a.dueDate),
        ),
    [workspaceTasks, query, statusFilter, priorityFilter, sort],
  );
  const doneCount = workspaceTasks.filter((task) => task.status === 'Done').length;
  const inProgressCount = workspaceTasks.filter((task) => task.status === 'In Progress').length;
  const pendingCount = workspaceTasks.filter((task) => task.status !== 'Done').length;
  const dueSoon = workspaceTasks.filter(
    (task) => task.status !== 'Done' && task.dueDate <= dateOffset(2),
  ).length;

  function saveTask(form) {
    const title = form.title.trim();
    const description = form.description.trim();
    if (!title || !description || !form.dueDate) return;
    const existing = modal.task;
    if (existing) {
      setTasks((items) =>
        items.map((task) =>
          task.id === existing.id ? { ...task, ...form, title, description } : task,
        ),
      );
      const statusChanged = existing.status !== form.status;
      const activityText = statusChanged
        ? `“${title}” ${form.status === 'Done' ? 'marked as Done' : `moved to ${form.status}`}`
        : `“${title}” updated`;
      log(activityText, statusChanged && form.status === 'Done' ? 'done' : 'edit');
    } else {
      setTasks((items) => [
        { ...form, title, description, id: createId(), workspace, createdAt: Date.now() },
        ...items,
      ]);
      log(`“${title}” created`, 'create');
    }
    setModal(null);
  }
  function changeStatus(task, status) {
    if (task.status === status) return;
    setTasks((items) => items.map((item) => (item.id === task.id ? { ...item, status } : item)));
    log(
      status === 'Done' ? `“${task.title}” marked as Done` : `“${task.title}” moved to ${status}`,
      status === 'Done' ? 'done' : 'edit',
    );
    setMenuId(null);
  }
  function moveBoardTask(task, status, targetTaskId, placement) {
    if (status === task.status && targetTaskId === task.id) return;
    setTasks((items) => {
      const current = items.find((item) => item.id === task.id);
      if (!current) return items;
      const updated = items.map((item) => (item.id === task.id ? { ...item, status } : item));
      const column = updated.filter(
        (item) => item.workspace === task.workspace && item.status === status,
      );
      column.sort((a, b) => {
        if (Number.isFinite(a.boardOrder) && Number.isFinite(b.boardOrder))
          return a.boardOrder - b.boardOrder;
        if (Number.isFinite(a.boardOrder)) return -1;
        if (Number.isFinite(b.boardOrder)) return 1;
        return a.dueDate.localeCompare(b.dueDate);
      });
      const withoutMoving = column.filter((item) => item.id !== task.id);
      const targetIndex = withoutMoving.findIndex((item) => item.id === targetTaskId);
      const insertionIndex =
        targetIndex < 0 ? withoutMoving.length : targetIndex + (placement === 'after' ? 1 : 0);
      withoutMoving.splice(insertionIndex, 0, { ...current, status });
      const orderById = new Map(withoutMoving.map((item, index) => [item.id, index]));
      return updated.map((item) =>
        orderById.has(item.id) ? { ...item, boardOrder: orderById.get(item.id) } : item,
      );
    });
    if (task.status !== status) {
      log(
        status === 'Done' ? `“${task.title}” marked as Done` : `“${task.title}” moved to ${status}`,
        status === 'Done' ? 'done' : 'edit',
      );
    }
    setMenuId(null);
  }
  function deleteTask(task) {
    setTasks((items) => items.filter((item) => item.id !== task.id));
    log(`“${task.title}” deleted`, 'delete');
    setMenuId(null);
  }
  const currentName = workspace === 'work' ? 'Work' : 'Personal';
  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const greetingDate = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="TrickleUp Task Manager home">
          <span className="brand-mark">
            <Icon name="spark" size={21} />
          </span>
          <span>
            TrickleUp<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="side-label">MENU</div>
        <button className="nav-item active">
          <Icon name="grid" /> <span>Overview</span>
        </button>
        <button
          className="nav-item"
          aria-label="Open recent activity"
          onClick={() => setMobileActivity(true)}
        >
          <Icon name="clock" /> <span>Activity</span>
          <span className="nav-count">{activity.length}</span>
        </button>
        <div className="workspace-heading">
          <span className="side-label">WORKSPACES</span>
        </div>
        <button
          className={`workspace-link ${workspace === 'personal' ? 'selected' : ''}`}
          onClick={() => setWorkspace('personal')}
        >
          <span className="workspace-icon personal">
            <Icon name="home" size={16} />
          </span>
          Personal
          <span className="workspace-total">
            {tasks.filter((task) => task.workspace === 'personal').length}
          </span>
        </button>
        <button
          className={`workspace-link ${workspace === 'work' ? 'selected' : ''}`}
          onClick={() => setWorkspace('work')}
        >
          <span className="workspace-icon work">
            <Icon name="briefcase" size={16} />
          </span>
          Work
          <span className="workspace-total">
            {tasks.filter((task) => task.workspace === 'work').length}
          </span>
        </button>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-spark">
              <Icon name="spark" size={17} />
            </div>
            <strong>
              A little progress
              <br />
              goes a long way.
            </strong>
            <span>Keep your focus on what matters.</span>
            <div className="upgrade-art">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <button className="profile">
            <span className="avatar">JD</span>
            <span className="profile-copy">
              <strong>Jordan Davis</strong>
              <small>Free plan</small>
            </span>
            <Icon name="dots" size={18} />
          </button>
        </div>
      </aside>

      <main className="main-content" id="top">
        <header className="topbar">
          <div className="breadcrumb">
            My workspace <span>/</span> <strong>{currentName}</strong>
          </div>
          <div className="top-actions">
            <div className="today-label">
              <Icon name="calendar" size={16} />
              {greetingDate}
            </div>
            <span className="top-avatar">JD</span>
          </div>
        </header>
        <div className="page-content">
          <div className="page-intro">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" /> YOUR OVERVIEW
              </div>
              <h1>
                {greeting}, Jordan <span className="wave">✳</span>
              </h1>
              <p>Here’s what’s happening in your {currentName.toLowerCase()} workspace.</p>
            </div>
            <button className="primary-button" onClick={() => setModal({ task: null })}>
              <Icon name="plus" size={18} />
              New task
            </button>
          </div>
          <section className="stats-grid" aria-label="Workspace summary">
            <Stat
              label="Total tasks"
              value={workspaceTasks.length}
              note="In this workspace"
              icon="grid"
              color="purple"
            />
            <Stat
              label="In progress"
              value={inProgressCount}
              note="Keep the momentum"
              icon="spark"
              color="blue"
            />
            <Stat
              label="Completed"
              value={doneCount}
              note="Nice work, you!"
              icon="check"
              color="green"
            />
            <Stat
              label="Due soon"
              value={dueSoon}
              note="Next 48 hours"
              icon="calendar"
              color="orange"
            />
          </section>
          <section className="tasks-section">
            <div className="section-heading">
              <div>
                <div className="section-title-row">
                  <h2>Your tasks</h2>
                  <span className="task-total">{workspaceTasks.length}</span>
                </div>
                <p>A clear view of everything on your plate.</p>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  setStatusFilter('All statuses');
                  setPriorityFilter('All priorities');
                  setQuery('');
                }}
              >
                Clear filters <Icon name="arrow" size={15} />
              </button>
            </div>
            <div className="toolbar">
              <label className="search-box">
                <Icon name="search" size={17} />
                <input
                  ref={searchInput}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tasks..."
                />
                <kbd>⌘ K</kbd>
              </label>
              <div className="filter-control">
                <Icon name="filter" size={16} />
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option>All statuses</option>
                  <option>To Do</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              </div>
              <div className="filter-control">
                <select
                  aria-label="Filter by priority"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                >
                  <option>All priorities</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
                <Icon name="chevron" size={15} />
              </div>
              <div className="sort-control">
                <span>Due date</span>
                <button
                  onClick={() => setSort(sort === 'oldest' ? 'newest' : 'oldest')}
                  title="Toggle due date sort"
                >
                  <span className={`sort-glyph ${sort}`}>↕</span>
                  {sort === 'oldest' ? 'Oldest first' : 'Newest first'}
                </button>
              </div>
              <div className="view-toggle" aria-label="Task view">
                <button
                  className={taskView === 'list' ? 'selected' : ''}
                  aria-pressed={taskView === 'list'}
                  onClick={() => setTaskView('list')}
                >
                  List
                </button>
                <button
                  className={taskView === 'board' ? 'selected' : ''}
                  aria-pressed={taskView === 'board'}
                  onClick={() => setTaskView('board')}
                >
                  Board
                </button>
              </div>
            </div>
            {taskView === 'list' ? (
              <div className="task-list">
                <div className="list-header">
                  <span>TASK</span>
                  <span>PRIORITY</span>
                  <span>STATUS</span>
                  <span>DUE DATE</span>
                  <span></span>
                </div>
                {visibleTasks.length ? (
                  visibleTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      menuId={menuId}
                      setMenuId={setMenuId}
                      onEdit={() => {
                        setMenuId(null);
                        setModal({ task });
                      }}
                      onDelete={() => deleteTask(task)}
                      onStatus={(status) => changeStatus(task, status)}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon">
                      <Icon name="search" size={21} />
                    </span>
                    <strong>No tasks found</strong>
                    <span>Try adjusting your search or filters.</span>
                    <button
                      onClick={() => {
                        setQuery('');
                        setStatusFilter('All statuses');
                        setPriorityFilter('All priorities');
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <TaskBoard
                tasks={visibleTasks}
                onEdit={(task) => setModal({ task })}
                onDelete={deleteTask}
                onMove={moveBoardTask}
              />
            )}
            <div className="list-footer">
              <span>
                Showing <strong>{visibleTasks.length}</strong> of{' '}
                <strong>{workspaceTasks.length}</strong> tasks
              </span>
            </div>
          </section>
        </div>
        <footer className="footer-note">
          <span>Made for thoughtful work.</span>
          <span>
            {pendingCount} things left to do <span className="footer-dot">✦</span>
          </span>
        </footer>
      </main>

      <aside className={`activity-sidebar ${mobileActivity ? 'activity-open' : ''}`}>
        <div className="activity-top">
          <div>
            <div className="activity-heading">
              <h2>Recent activity</h2>
              <button
                className="activity-close"
                aria-label="Close activity"
                onClick={() => setMobileActivity(false)}
              >
                <Icon name="close" size={17} />
              </button>
            </div>
            <p>Little steps add up.</p>
          </div>
        </div>
        <div className="activity-timeline">
          {activity.slice(0, 5).map((item, index) => (
            <div className="activity-item" key={item.id}>
              <div className={`activity-icon ${item.type}`}>
                <Icon
                  name={
                    item.type === 'done'
                      ? 'check'
                      : item.type === 'create'
                        ? 'plus'
                        : item.type === 'delete'
                          ? 'close'
                          : 'spark'
                  }
                  size={15}
                />
              </div>
              {index < Math.min(activity.length, 5) - 1 && <span className="timeline-line" />}
              <div className="activity-copy">
                <span>{item.text}</span>
                <time>{timeAgo(item.time)}</time>
              </div>
            </div>
          ))}
        </div>
        <div className="activity-all">
          Showing the latest {activity.length} {activity.length === 1 ? 'action' : 'actions'}
        </div>
        <div className="focus-card">
          <span className="focus-icon">
            <Icon name="spark" size={18} />
          </span>
          <div>
            <strong>Stay in your flow</strong>
            <p>
              Small, steady steps make
              <br />
              big things happen.
            </p>
          </div>
          <div className="focus-decoration">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </aside>
      {mobileActivity && (
        <button
          className="mobile-scrim"
          aria-label="Close activity panel"
          onClick={() => setMobileActivity(false)}
        />
      )}
      {modal && (
        <TaskModal
          task={modal.task}
          workspace={currentName}
          onClose={() => setModal(null)}
          onSave={saveTask}
        />
      )}
    </div>
  );
}

export default App;
