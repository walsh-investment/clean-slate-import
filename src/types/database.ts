// Database types matching the actual NilesDB app schema
export type PersonKind = 'parent' | 'grandparent' | 'child' | 'other';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Person {
  id: string;
  household_id: string;
  display_name: string;
  kind: PersonKind;
  user_id?: string;
  color_hex: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_at: string;
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
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  driver_person_id?: string;
  ride_needed?: boolean;
  source: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  household_id: string;
  person_id: string;
  title: string;
  status: TaskStatus;
  due_date?: string;
  created_by?: string;
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

export interface CalendarShare {
  id: string;
  household_id: string;
  name: string;
  person_ids: string[];
  shared_with: string[];
  token: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  household_id: string;
  person_id: string;
  type: string;
  title: string;
  content?: string;
  is_read: boolean;
  created_at: string;
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