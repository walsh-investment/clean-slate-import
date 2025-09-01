// Database types matching the Supabase schema
export interface Person {
  id: string;
  household_id: string;
  name: string;
  role?: string;
  color?: string;
  avatar?: string;
  birth_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  person_id: string;
  role: 'admin' | 'parent' | 'member';
  created_at: string;
}

export interface Event {
  id: string;
  household_id: string;
  person_id: string;
  title: string;
  description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  driver_person_id?: string;
  source: 'email' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  household_id: string;
  assigned_to_person_id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  category?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskChecklistItem {
  id: string;
  task_id: string;
  text: string;
  is_done: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  household_id: string;
  from_person_id: string;
  title?: string;
  content: string;
  type: 'message' | 'announcement' | 'reminder';
  priority?: 'low' | 'medium' | 'high';
  due_time?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRecipient {
  id: string;
  message_id: string;
  person_id: string;
  status: 'pending' | 'sent' | 'read' | 'error';
  sent_at?: string;
  read_at?: string;
}

export interface RideOffer {
  id: string;
  household_id: string;
  event_id: string;
  offered_by_person_id: string;
  status: 'proposed' | 'accepted' | 'declined';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Legacy types for compatibility - will be phased out
export type MemberId = string;
export type MemberIdOrAll = MemberId | 'all';
export type ViewType = 'all-family' | 'member-overview' | 'calendar-week' | 'calendar-list' | 'tasks-board' | 'ride-requests' | 'messages' | 'settings';
export type TimeFilter = 'today' | 'next7';
export type TypeFilter = 'all' | 'events' | 'tasks';

export interface AppState {
  selectedMember: MemberIdOrAll;
  timeFilter: TimeFilter;
  typeFilter: TypeFilter;
}

// Component variant types
export type EventVariant = 'assigned' | 'ride-needed' | 'overdue';
export type EventDensity = 'compact' | 'regular';
export type TaskStatus = 'todo' | 'in-progress' | 'done';