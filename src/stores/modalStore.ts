import { MemberId } from '../types';

export interface EventFormData {
  id?: string;
  title: string;
  description?: string;
  member: MemberId;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  driver_name?: MemberId;
  source?: 'manual' | 'email';
}

export interface TaskFormData {
  id?: string;
  title: string;
  description?: string;
  member: MemberId;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  category?: string;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
}

export interface RideRequestFormData {
  id?: string;
  title: string;
  requester: MemberId;
  destination: string;
  pickup_location?: string;
  pickup_time: string;
  return_time?: string;
  event_date: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed';
  driver_name?: MemberId;
}

export interface MessageFormData {
  type: 'message' | 'announcement' | 'reminder';
  title?: string;
  content: string;
  recipients: MemberId[];
  urgent?: boolean;
  priority?: 'low' | 'medium' | 'high';
  due_time?: string;
}

export type ModalType =
  | 'addEvent'
  | 'editEvent'
  | 'addTask'
  | 'editTask'
  | 'addRideRequest'
  | 'editRideRequest'
  | 'assignDriver'
  | 'sendMessage'
  | 'addReminder'
  | 'editReminder'
  | 'confirmDelete'
  | 'memberSelect'
  | null;