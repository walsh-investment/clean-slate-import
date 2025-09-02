// Re-export database types for use throughout the application
export type {
  Person,
  Household, 
  HouseholdMember,
  Event,
  Task,
  TaskStatus,
  Message,
  RideOffer,
  TaskChecklistItem,
  MessageRecipient,
  Notification,
  CalendarShare,
  PersonKind
} from './types/database';

// Application view and filter types
export type ViewType = 'all-family' | 'member-overview' | 'calendar-week' | 'calendar-list' | 'tasks-board' | 'ride-requests' | 'messages' | 'settings' | 'ai-chat';
export type TimeFilter = 'today' | 'next7';
export type TypeFilter = 'all' | 'events' | 'tasks';

export interface AppState {
  selectedMember: string;
  timeFilter: TimeFilter;
  typeFilter: TypeFilter;
}

// Component variant types
export type EventVariant = 'assigned' | 'ride-needed' | 'overdue';
export type EventDensity = 'compact' | 'regular';