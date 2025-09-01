// Import new database types with aliases to avoid conflicts
import * as DB from './types/database';

// Maintain legacy types for backward compatibility during transition
export type MemberId = 'charlie' | 'tyra' | 'nama' | 'pops' | 'wyatt' | 'adelaide' | 'ellis' | 'beckett' | 'kathleen';
export type MemberIdOrAll = MemberId | 'all';

// Legacy interfaces for backward compatibility (temporary)
export interface Event {
  id: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  member: MemberId;
  title: string;
  location?: string;
  driver_name?: MemberId;
  source: 'email' | 'manual';
}

export interface Task {
  id: string;
  member: MemberId;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  category?: string;
  checklist?: {
    id: string;
    text: string;
    done: boolean;
  }[];
}

export interface RideOffer {
  id: string;
  event_id: string;
  offered_by: MemberId;
  status: 'proposed' | 'accepted' | 'declined';
}

export interface RideRequest {
  id: string;
  title: string;
  requester: MemberId;
  requesterColor?: string;
  requesterAvatar?: string;
  destination: string;
  pickup: string;
  pickup_location?: string;
  pickup_time: string;
  pickupTime?: string;
  return_time?: string;
  dropoffTime?: string;
  event_date: string;
  date?: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed';
  driver?: MemberId;
  driver_name?: MemberId;
  driverColor?: string;
  driverAvatar?: string;
}

export interface Message {
  id: string;
  type: 'message' | 'announcement' | 'reminder';
  title?: string;
  content: string;
  to?: MemberId[];
  recipients: MemberId[];
  subject?: string;
  body?: string;
  urgent?: boolean;
  priority?: 'low' | 'medium' | 'high';
  due_time?: string;
  status?: 'pending' | 'sent' | 'error';
  sent_at?: string;
}

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

// Re-export database types with DB prefix for new code
export {
  type Person as DBPerson,
  type Household as DBHousehold,
  type HouseholdMember as DBHouseholdMember,
  type Event as DBEvent,
  type Task as DBTask,
  type Message as DBMessage,
  type RideOffer as DBRideOffer,
  type TaskChecklistItem,
  type MessageRecipient
} from './types/database';