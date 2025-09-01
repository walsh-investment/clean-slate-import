import { Event, Task, Message, RideOffer } from '../types';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Supabase-backed data client for Niles family organizer
class SupabaseDataClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-84035cd9`;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }
    return response.json();
  }

  // Events
  async getEvents(member?: string): Promise<Event[]> {
    try {
      const url = member ? `${this.baseUrl}/events?member=${member}` : `${this.baseUrl}/events`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      const result = await this.handleResponse(response);
      return result.events || [];
    } catch (error) {
      console.error('Failed to fetch events:', error);
      // Fallback to mock data if server is unavailable
      try {
        const { events } = await import('../../data/events');
        return events || [];
      } catch {
        return [];
      }
    }
  }

  async createEvent(event: any): Promise<Event> {
    try {
      const response = await fetch(`${this.baseUrl}/events`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(event)
      });
      
      const result = await this.handleResponse(response);
      return result.event;
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  async addEvent(event: Omit<Event, 'id'>): Promise<Event> {
    return this.createEvent(event);
  }

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    try {
      const response = await fetch(`${this.baseUrl}/events/${id}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(updates)
      });
      
      const result = await this.handleResponse(response);
      return result.event;
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/events/${id}`, {
        method: 'DELETE',
        headers: this.headers
      });
      
      await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  // Tasks
  async getTasks(member?: string): Promise<Task[]> {
    try {
      const url = member ? `${this.baseUrl}/tasks?member=${member}` : `${this.baseUrl}/tasks`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      const result = await this.handleResponse(response);
      return result.tasks || [];
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      // Fallback to mock data if server is unavailable
      try {
        const { tasks } = await import('../../data/tasks');
        return tasks || [];
      } catch {
        return [];
      }
    }
  }

  async createTask(task: any): Promise<Task> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(task)
      });
      
      const result = await this.handleResponse(response);
      return result.task;
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }

  async addTask(task: Omit<Task, 'id'>): Promise<Task> {
    return this.createTask(task);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(updates)
      });
      
      const result = await this.handleResponse(response);
      return result.task;
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${id}`, {
        method: 'DELETE',
        headers: this.headers
      });
      
      await this.handleResponse(response);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  // Messages
  async getMessages(member?: string): Promise<Message[]> {
    try {
      const url = member ? `${this.baseUrl}/messages?member=${member}` : `${this.baseUrl}/messages`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      const result = await this.handleResponse(response);
      return result.messages || [];
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Fallback to mock data if server is unavailable
      try {
        const { messages } = await import('../../data/messages');
        return messages || [];
      } catch {
        return [];
      }
    }
  }

  async createMessage(message: any): Promise<Message> {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(message)
      });
      
      const result = await this.handleResponse(response);
      return result.message;
    } catch (error) {
      console.error('Failed to create message:', error);
      throw error;
    }
  }

  async addMessage(message: Omit<Message, 'id'>): Promise<Message> {
    return this.createMessage(message);
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/${id}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(updates)
      });
      
      const result = await this.handleResponse(response);
      return result.message;
    } catch (error) {
      console.error('Failed to update message:', error);
      throw error;
    }
  }

  // Ride Offers/Requests
  async getRideOffers(member?: string): Promise<RideOffer[]> {
    try {
      const url = member ? `${this.baseUrl}/rides?member=${member}` : `${this.baseUrl}/rides`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      const result = await this.handleResponse(response);
      return result.rides || [];
    } catch (error) {
      console.error('Failed to fetch ride offers:', error);
      // Fallback to mock data if server is unavailable
      try {
        const { rideOffers } = await import('../../data/rides');
        return rideOffers || [];
      } catch {
        return [];
      }
    }
  }

  async createRideRequest(request: any): Promise<RideOffer> {
    try {
      const response = await fetch(`${this.baseUrl}/rides`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(request)
      });
      
      const result = await this.handleResponse(response);
      return result.ride;
    } catch (error) {
      console.error('Failed to create ride request:', error);
      throw error;
    }
  }

  async addRideOffer(offer: Omit<RideOffer, 'id'>): Promise<RideOffer> {
    return this.createRideRequest(offer);
  }

  async updateRideRequest(id: string, updates: any): Promise<RideOffer> {
    try {
      const response = await fetch(`${this.baseUrl}/rides/${id}`, {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify(updates)
      });
      
      const result = await this.handleResponse(response);
      return result.ride;
    } catch (error) {
      console.error('Failed to update ride request:', error);
      throw error;
    }
  }

  async updateRideOffer(id: string, updates: Partial<RideOffer>): Promise<RideOffer> {
    return this.updateRideRequest(id, updates);
  }

  // Family members
  async getFamilyMembers() {
    try {
      const response = await fetch(`${this.baseUrl}/family`, {
        method: 'GET',
        headers: this.headers
      });
      
      const result = await this.handleResponse(response);
      return result.family || [];
    } catch (error) {
      console.error('Failed to fetch family members:', error);
      // Fallback to static data
      return [
        { id: 'charlie', name: 'Charlie', role: 'Parent', color: '#3B82F6' },
        { id: 'tyra', name: 'Tyra', role: 'Parent', color: '#EF4444' },
        { id: 'nama', name: 'Nama', role: 'Grandparent', color: '#8B5CF6' },
        { id: 'pops', name: 'Pops', role: 'Grandparent', color: '#059669' },
        { id: 'wyatt', name: 'Wyatt', role: 'Child', color: '#F59E0B' },
        { id: 'beckett', name: 'Beckett', role: 'Child', color: '#10B981' },
        { id: 'ellis', name: 'Ellis', role: 'Child', color: '#F97316' },
        { id: 'adelaide', name: 'Adelaide', role: 'Child', color: '#EC4899' }
      ];
    }
  }

  // Initialize sample data
  async initializeData() {
    try {
      const response = await fetch(`${this.baseUrl}/init-data`, {
        method: 'POST',
        headers: this.headers
      });
      
      await this.handleResponse(response);
      console.log('Niles database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize data:', error);
    }
  }
}

export const dataClient = new SupabaseDataClient();