// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App.jsx';

class TestPointerEvent extends MouseEvent {
  constructor(type, init = {}) {
    super(type, init);
    Object.defineProperties(this, {
      pointerId: { value: init.pointerId ?? 1 },
      isPrimary: { value: init.isPrimary ?? true },
      pointerType: { value: init.pointerType ?? 'mouse' },
    });
  }
}

beforeEach(() => {
  window.PointerEvent = TestPointerEvent;
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    writable: true,
    value: () => null,
  });
  const values = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    clear: () => values.clear(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete document.elementFromPoint;
});

describe('TrickleUp task manager', () => {
  it('validates, creates, persists, edits, and deletes tasks', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'New task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));

    expect(screen.getByText('Add a task name to continue.')).toBeTruthy();
    expect(screen.getByText('Add a short description.')).toBeTruthy();
    expect(screen.getByText('Choose a due date.')).toBeTruthy();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateValue = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    fireEvent.change(screen.getByPlaceholderText('e.g. Prepare project proposal'), {
      target: { value: 'Prepare launch notes' },
    });
    fireEvent.change(screen.getByPlaceholderText('What needs to get done?'), {
      target: { value: 'Write the release summary.' },
    });
    fireEvent.change(screen.getByLabelText(/Due date/), { target: { value: dateValue } });
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    expect(screen.getByText('Due date can’t be in the past.')).toBeTruthy();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    fireEvent.change(screen.getByLabelText(/Due date/), { target: { value: dueDate } });
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));

    expect(screen.getByText('Prepare launch notes')).toBeTruthy();
    expect(
      JSON.parse(localStorage.getItem('daymark.tasks')).some(
        (task) => task.title === 'Prepare launch notes',
      ),
    ).toBe(true);

    cleanup();
    render(<App />);
    expect(screen.getByText('Prepare launch notes')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Options for Prepare launch notes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit task' }));
    fireEvent.change(screen.getByPlaceholderText('e.g. Prepare project proposal'), {
      target: { value: 'Finalize launch notes' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Finalize launch notes')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Options for Finalize launch notes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
    expect(screen.queryByText('Finalize launch notes')).toBeNull();
    expect(
      JSON.parse(localStorage.getItem('daymark.tasks')).some(
        (task) => task.title === 'Finalize launch notes',
      ),
    ).toBe(false);
  });

  it('filters by status and priority together, then searches the filtered tasks', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'To Do' } });
    fireEvent.change(screen.getByLabelText('Filter by priority'), { target: { value: 'High' } });

    expect(screen.getByText('Review Q3 design proposal')).toBeTruthy();
    expect(screen.queryByText('Send project update')).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Search tasks...'), {
      target: { value: 'onboarding' },
    });
    expect(screen.getByText('No tasks found')).toBeTruthy();
  });

  it('moves a board card to the status under the pointer and logs the change', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Board' }));

    const handle = screen.getByRole('button', {
      name: 'Drag Review Q3 design proposal to reorder or change status',
    });
    const doneColumn = document.querySelector('[data-board-status="Done"]');
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(doneColumn);

    fireEvent.pointerDown(handle, {
      pointerId: 7,
      isPrimary: true,
      pointerType: 'mouse',
      button: 0,
      clientX: 20,
      clientY: 20,
    });
    act(() =>
      window.dispatchEvent(
        new TestPointerEvent('pointermove', { pointerId: 7, clientX: 300, clientY: 200 }),
      ),
    );
    act(() =>
      window.dispatchEvent(
        new TestPointerEvent('pointerup', { pointerId: 7, clientX: 300, clientY: 200 }),
      ),
    );

    const taskCard = screen.getByText('Review Q3 design proposal').closest('.board-card');
    expect(within(taskCard).getByLabelText('Change Review Q3 design proposal status').value).toBe(
      'Done',
    );
    expect(screen.getByText('“Review Q3 design proposal” marked as Done')).toBeTruthy();
  });

  it('supports touch pointer input on the board drag handle', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Board' }));
    const handle = screen.getByRole('button', {
      name: 'Drag Send project update to reorder or change status',
    });
    const inProgressColumn = document.querySelector('[data-board-status="In Progress"]');
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(inProgressColumn);

    fireEvent.pointerDown(handle, {
      pointerId: 8,
      isPrimary: true,
      pointerType: 'touch',
      button: 0,
      clientX: 20,
      clientY: 20,
    });
    act(() =>
      window.dispatchEvent(
        new TestPointerEvent('pointermove', {
          pointerId: 8,
          pointerType: 'touch',
          clientX: 280,
          clientY: 220,
        }),
      ),
    );
    act(() =>
      window.dispatchEvent(
        new TestPointerEvent('pointerup', {
          pointerId: 8,
          pointerType: 'touch',
          clientX: 280,
          clientY: 220,
        }),
      ),
    );

    const taskCard = screen.getByText('Send project update').closest('.board-card');
    expect(within(taskCard).getByLabelText('Change Send project update status').value).toBe(
      'In Progress',
    );
  });

  it('reorders cards within the same status column and persists the order', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Board' }));
    const targetCard = screen.getByText('Review Q3 design proposal').closest('[data-board-task]');
    vi.spyOn(targetCard, 'getBoundingClientRect').mockReturnValue({
      top: 200,
      height: 100,
      left: 0,
      right: 300,
      bottom: 300,
      width: 300,
      x: 0,
      y: 200,
      toJSON: () => ({}),
    });
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(targetCard);

    fireEvent.pointerDown(
      screen.getByRole('button', { name: 'Drag Send project update to reorder or change status' }),
      { pointerId: 9, isPrimary: true, pointerType: 'mouse', button: 0, clientX: 20, clientY: 20 },
    );
    act(() =>
      window.dispatchEvent(
        new TestPointerEvent('pointermove', { pointerId: 9, clientX: 200, clientY: 220 }),
      ),
    );
    act(() =>
      window.dispatchEvent(
        new TestPointerEvent('pointerup', { pointerId: 9, clientX: 200, clientY: 220 }),
      ),
    );

    const toDoColumn = document.querySelector('[data-board-status="To Do"]');
    const titles = [...toDoColumn.querySelectorAll('.board-card h4')].map(
      (heading) => heading.textContent,
    );
    expect(titles.slice(0, 2)).toEqual(['Send project update', 'Review Q3 design proposal']);
    const savedTasks = JSON.parse(localStorage.getItem('daymark.tasks'));
    expect(savedTasks.find((task) => task.title === 'Send project update').boardOrder).toBeLessThan(
      savedTasks.find((task) => task.title === 'Review Q3 design proposal').boardOrder,
    );
  });
});
