import { Task } from '../src/types';

export const tasks: Task[] = [
  // Tasks related to the busy schedule from the screenshot
  {
    id: 'task-1',
    member: 'tyra',
    title: 'Pack Wyatt\'s soccer gear for Wednesday',
    due_date: '2025-08-13',
    status: 'todo',
    priority: 'medium',
  },
  {
    id: 'task-2',
    member: 'charlie',
    title: 'Confirm Ellis daycare schedule changes',
    due_date: '2025-08-13',
    status: 'todo',
    priority: 'high',
  },
  {
    id: 'task-3',
    member: 'nama',
    title: 'Plan activities for Ellis visit Friday',
    due_date: '2025-08-14',
    status: 'in-progress',
    priority: 'medium',
    checklist: [
      { id: 'check-1', text: 'Prepare lunch menu', done: true },
      { id: 'check-2', text: 'Set up craft activities', done: false },
      { id: 'check-3', text: 'Plan outdoor games', done: false },
    ],
  },
  {
    id: 'task-4',
    member: 'beckett',
    title: 'Pick up lifeguard certification renewal',
    due_date: '2025-08-13',
    status: 'todo',
    priority: 'high',
  },
  {
    id: 'task-5',
    member: 'tyra',
    title: 'Coordinate violin lesson schedule with teacher',
    due_date: '2025-08-14',
    status: 'in-progress',
    priority: 'medium',
  },
  {
    id: 'task-6',
    member: 'adelaide',
    title: 'Pack overnight bag for Lucy\'s playdate',
    due_date: '2025-08-14',
    status: 'todo',
    priority: 'low',
  },
  {
    id: 'task-7',
    member: 'charlie',
    title: 'Plan Suncadia trip logistics',
    due_date: '2025-08-15',
    status: 'in-progress',
    priority: 'high',
    checklist: [
      { id: 'check-4', text: 'Book accommodations', done: true },
      { id: 'check-5', text: 'Plan activities', done: true },
      { id: 'check-6', text: 'Pack car snacks', done: false },
      { id: 'check-7', text: 'Check weather forecast', done: false },
    ],
  },
  {
    id: 'task-8',
    member: 'wyatt',
    title: 'Complete math homework before community center',
    due_date: '2025-08-14',
    status: 'in-progress',
    priority: 'high',
  },
  {
    id: 'task-9',
    member: 'ellis',
    title: 'Practice reading for school',
    due_date: '2025-08-15',
    status: 'todo',
    priority: 'medium',
  },
  {
    id: 'task-10',
    member: 'tyra',
    title: 'Schedule car maintenance',
    due_date: '2025-08-16',
    status: 'todo',
    priority: 'medium',
  },
  {
    id: 'task-11',
    member: 'pops',
    title: 'Prepare grandfather stories for Ellis visit',
    due_date: '2025-08-15',
    status: 'done',
    priority: 'low',
  },
  {
    id: 'task-12',
    member: 'charlie',
    title: 'Review family calendar for next week',
    due_date: '2025-08-13',
    status: 'done',
    priority: 'medium',
    checklist: [
      { id: 'check-8', text: 'Check for conflicts', done: true },
      { id: 'check-9', text: 'Update shared calendar', done: true },
      { id: 'check-10', text: 'Send reminders to family', done: true },
    ],
  },
];

// Legacy exports for backwards compatibility
export const URGENT_TASKS = tasks.filter(task => task.priority === 'high' && task.status !== 'done').slice(0, 3);
export const ALL_TASKS = tasks;