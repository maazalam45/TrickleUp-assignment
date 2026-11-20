import { dateOffset } from '../utils/dates.js';

export const seedTasks = [
  {
    id: 't1',
    workspace: 'personal',
    title: 'Plan a weekend getaway',
    description: 'Find somewhere quiet for a couple of days off.',
    priority: 'Medium',
    status: 'In Progress',
    dueDate: dateOffset(2),
    createdAt: Date.now() - 100000,
  },
  {
    id: 't2',
    workspace: 'work',
    title: 'Review Q3 design proposal',
    description: 'Leave feedback on the latest product direction.',
    priority: 'High',
    status: 'To Do',
    dueDate: dateOffset(1),
    createdAt: Date.now() - 200000,
  },
  {
    id: 't3',
    workspace: 'work',
    title: 'Send project update',
    description: 'Share this week’s progress with the team.',
    priority: 'Medium',
    status: 'To Do',
    dueDate: dateOffset(4),
    createdAt: Date.now() - 300000,
  },
  {
    id: 't4',
    workspace: 'personal',
    title: 'Pick up groceries',
    description: 'Oat milk, fresh fruit, and something for dinner.',
    priority: 'Low',
    status: 'Done',
    dueDate: dateOffset(0),
    createdAt: Date.now() - 400000,
  },
  {
    id: 't5',
    workspace: 'work',
    title: 'Update onboarding checklist',
    description: 'Add the new account setup steps.',
    priority: 'Low',
    status: 'In Progress',
    dueDate: dateOffset(6),
    createdAt: Date.now() - 500000,
  },
];

export const seedActivity = [
  { id: 'a1', text: '“Pick up groceries” completed', time: Date.now() - 3600000, type: 'done' },
  { id: 'a2', text: '“Plan a weekend getaway” updated', time: Date.now() - 7200000, type: 'edit' },
  {
    id: 'a3',
    text: '“Update onboarding checklist” created',
    time: Date.now() - 86400000,
    type: 'create',
  },
];
