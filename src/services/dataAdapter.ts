// Adapter service to gradually transition from mock data to real database
// This provides the same interface as the old dataClient but with fallbacks

import { supabase } from '@/integrations/supabase/client';
import { Event, Task, Message, RideOffer } from '@/types';

class DataAdapter {
  async getEvents(member?: string): Promise<Event[]> {
    // For now, return mock data until we have household setup
    try {
      const { events } = await import('../../data/events');
      return member ? events.filter((e: Event) => e.member === member) : events;
    } catch {
      return [];
    }
  }

  async createEvent(event: any): Promise<Event> {
    console.log('Creating event (mock):', event);
    const newEvent: Event = {
      id: crypto.randomUUID(),
      ...event,
      event_date: event.event_date || new Date().toISOString().split('T')[0],
    };
    return newEvent;
  }

  async addEvent(event: Omit<Event, 'id'>): Promise<Event> {
    return this.createEvent(event);
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    console.log('Updating event (mock):', id, updates);
    return { id, ...updates } as Event;
  }

  async deleteEvent(id: string): Promise<void> {
    console.log('Deleting event (mock):', id);
  }

  async getTasks(member?: string): Promise<Task[]> {
    try {
      const { tasks } = await import('../../data/tasks');
      return member ? tasks.filter((t: Task) => t.member === member) : tasks;
    } catch {
      return [];
    }
  }

  async createTask(task: any): Promise<Task> {
    console.log('Creating task (mock):', task);
    const newTask: Task = {
      id: crypto.randomUUID(),
      ...task,
      status: task.status || 'todo',
      priority: task.priority || 'medium',
    };
    return newTask;
  }

  async addTask(task: Omit<Task, 'id'>): Promise<Task> {
    return this.createTask(task);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    console.log('Updating task (mock):', id, updates);
    return { id, ...updates } as Task;
  }

  async deleteTask(id: string): Promise<void> {
    console.log('Deleting task (mock):', id);
  }

  async getMessages(member?: string): Promise<Message[]> {
    try {
      const { messages } = await import('../../data/messages');
      return member ? messages.filter((m: Message) => m.recipients.includes(member as any)) : messages;
    } catch {
      return [];
    }
  }

  async createMessage(message: any): Promise<Message> {
    console.log('Creating message (mock):', message);
    const newMessage: Message = {
      id: crypto.randomUUID(),
      ...message,
      type: message.type || 'message',
      recipients: message.recipients || [],
    };
    return newMessage;
  }

  async addMessage(message: Omit<Message, 'id'>): Promise<Message> {
    return this.createMessage(message);
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message> {
    console.log('Updating message (mock):', id, updates);
    return { id, ...updates } as Message;
  }

  async getRideOffers(member?: string): Promise<RideOffer[]> {
    try {
      const { rideOffers } = await import('../../data/rides');
      return member ? rideOffers.filter((r: RideOffer) => r.offered_by === member) : rideOffers;
    } catch {
      return [];
    }
  }

  async createRideRequest(request: any): Promise<RideOffer> {
    console.log('Creating ride request (mock):', request);
    const newRide: RideOffer = {
      id: crypto.randomUUID(),
      ...request,
      status: request.status || 'proposed',
    };
    return newRide;
  }

  async addRideOffer(offer: Omit<RideOffer, 'id'>): Promise<RideOffer> {
    return this.createRideRequest(offer);
  }

  async updateRideRequest(id: string, updates: any): Promise<RideOffer> {
    console.log('Updating ride request (mock):', id, updates);
    return { id, ...updates } as RideOffer;
  }

  async updateRideOffer(id: string, updates: Partial<RideOffer>): Promise<RideOffer> {
    return this.updateRideRequest(id, updates);
  }

  async getFamilyMembers() {
    try {
      const { FAMILY_MEMBERS } = await import('../../constants/family');
      return FAMILY_MEMBERS;
    } catch {
      return [];
    }
  }

  async initializeData() {
    console.log('Data adapter initialized with mock data fallbacks');
  }
}

export const dataClient = new DataAdapter();