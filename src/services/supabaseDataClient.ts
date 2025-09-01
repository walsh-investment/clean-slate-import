import { supabase } from '@/integrations/supabase/client';
import { Event, Task, Person, Household, RideOffer } from '@/types/database';

// Legacy compatibility layer - maintains existing interface while preparing for database migration
class SupabaseDataClient {
  async getEvents(personId?: string): Promise<any[]> {
    try {
      // TODO: Connect to app schema when types are updated
      // For now, use mock data with plans to connect to real DB
      const { events } = await import('../../data/events');
      return personId ? events.filter((e: any) => e.member === personId) : events;
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return [];
    }
  }

  async createEvent(event: any): Promise<any> {
    try {
      console.log('Creating event (mock):', event);
      const newEvent = {
        id: crypto.randomUUID(),
        ...event,
        event_date: event.event_date || new Date().toISOString().split('T')[0],
      };
      return newEvent;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  async updateEvent(id: string, updates: any): Promise<any> {
    try {
      console.log('Updating event (mock):', id, updates);
      return { id, ...updates };
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      console.log('Deleting event (mock):', id);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  async getTasks(personId?: string): Promise<any[]> {
    try {
      // TODO: Connect to app schema when types are updated
      const { tasks } = await import('../../data/tasks');
      return personId ? tasks.filter((t: any) => t.member === personId) : tasks;
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  }

  async createTask(task: any): Promise<any> {
    try {
      console.log('Creating task (mock):', task);
      const newTask = {
        id: crypto.randomUUID(),
        ...task,
        status: task.status || 'todo',
      };
      return newTask;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(id: string, updates: any): Promise<any> {
    try {
      console.log('Updating task (mock):', id, updates);
      return { id, ...updates };
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      console.log('Deleting task (mock):', id);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  async getPeople(householdId?: string): Promise<any[]> {
    try {
      // TODO: Connect to app schema when types are updated
      const { FAMILY_MEMBERS } = await import('../../constants/family');
      return FAMILY_MEMBERS;
    } catch (error) {
      console.error('Failed to fetch people:', error);
      return [];
    }
  }

  async createPerson(person: any): Promise<any> {
    try {
      console.log('Creating person (mock):', person);
      const newPerson = {
        id: crypto.randomUUID(),
        ...person,
      };
      return newPerson;
    } catch (error) {
      console.error('Failed to create person:', error);
      throw error;
    }
  }

  // Households
  async getHouseholds(): Promise<any[]> {
    try {
      // Mock household data
      return [
        {
          id: crypto.randomUUID(),
          name: 'Niles Family',
          created_at: new Date().toISOString()
        }
      ];
    } catch (error) {
      console.error('Failed to fetch households:', error);
      return [];
    }
  }

  // Family Feed View (API schema)
  async getFamilyFeedNext7Days(): Promise<any[]> {
    try {
      const events = await this.getEvents();
      // Filter to next 7 days
      const today = new Date();
      const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      return events.filter((event: any) => {
        const eventDate = new Date(event.event_date);
        return eventDate >= today && eventDate <= next7Days;
      });
    } catch (error) {
      console.error('Failed to fetch family feed:', error);
      return [];
    }
  }

  // Member Events View (API schema)
  async getMemberEventsNext14Days(personId?: string): Promise<any[]> {
    try {
      const events = await this.getEvents(personId);
      // Filter to next 14 days
      const today = new Date();
      const next14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      return events.filter((event: any) => {
        const eventDate = new Date(event.event_date);
        return eventDate >= today && eventDate <= next14Days;
      });
    } catch (error) {
      console.error('Failed to fetch member events:', error);
      return [];
    }
  }

  async getRideOffers(personId?: string): Promise<any[]> {
    try {
      // TODO: Connect to app schema when types are updated
      const { rideOffers } = await import('../../data/rides');
      return personId ? rideOffers.filter((r: any) => r.offered_by === personId) : rideOffers;
    } catch (error) {
      console.error('Failed to fetch ride offers:', error);
      return [];
    }
  }

  async createRideOffer(offer: any): Promise<any> {
    try {
      console.log('Creating ride offer (mock):', offer);
      const newOffer = {
        id: crypto.randomUUID(),
        ...offer,
        status: offer.status || 'proposed',
      };
      return newOffer;
    } catch (error) {
      console.error('Failed to create ride offer:', error);
      throw error;
    }
  }

  async updateRideOffer(id: string, updates: any): Promise<any> {
    try {
      console.log('Updating ride offer (mock):', id, updates);
      return { id, ...updates };
    } catch (error) {
      console.error('Failed to update ride offer:', error);
      throw error;
    }
  }

  async getMessages(personId?: string): Promise<any[]> {
    try {
      // TODO: Connect to app schema when types are updated
      const { messages } = await import('../../data/messages');
      return personId ? messages.filter((m: any) => m.recipients.includes(personId)) : messages;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return [];
    }
  }

  async createMessage(message: any): Promise<any> {
    try {
      console.log('Creating message (mock):', message);
      const newMessage = {
        id: crypto.randomUUID(),
        ...message,
        type: message.type || 'message',
        recipients: message.recipients || [],
      };
      return newMessage;
    } catch (error) {
      console.error('Failed to create message:', error);
      throw error;
    }
  }

  async updateMessage(id: string, updates: any): Promise<any> {
    try {
      console.log('Updating message (mock):', id, updates);
      return { id, ...updates };
    } catch (error) {
      console.error('Failed to update message:', error);
      throw error;
    }
  }

  // Compatibility methods to maintain existing interface
  async addEvent(event: any): Promise<any> {
    return this.createEvent(event);
  }

  async addTask(task: any): Promise<any> {
    return this.createTask(task);
  }

  async addRideOffer(offer: any): Promise<any> {
    return this.createRideOffer(offer);
  }

  async addMessage(message: any): Promise<any> {
    return this.createMessage(message);
  }

  async createRideRequest(request: any): Promise<any> {
    return this.createRideOffer(request);
  }

  async updateRideRequest(id: string, updates: any): Promise<any> {
    return this.updateRideOffer(id, updates);
  }

  async getFamilyMembers(): Promise<any[]> {
    return this.getPeople();
  }

  async initializeData(): Promise<void> {
    console.log('Supabase data client initialized with mock data fallbacks');
  }
}

export const dataClient = new SupabaseDataClient();