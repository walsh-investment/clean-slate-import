import { supabase } from '@/integrations/supabase/client';
import { Event, Task, Person, Household, RideOffer } from '@/types/database';

class SupabaseDataClient {
  async getEvents(personId?: string): Promise<any[]> {
    try {
      let query = 'SELECT * FROM app.events';
      
      if (personId) {
        query += ` WHERE person_id = '${personId}'`;
      }
      
      query += ' ORDER BY event_date ASC';
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch events:', error);
      return [];
    }
  }

  async createEvent(event: any): Promise<any> {
    try {
      const query = `
        INSERT INTO app.events (household_id, person_id, title, event_date, start_time, end_time, location, notes, source, created_by) 
        VALUES ('${event.household_id || ''}', '${event.person_id || ''}', '${event.title}', '${event.event_date || new Date().toISOString().split('T')[0]}', 
                '${event.start_time || ''}', '${event.end_time || ''}', '${event.location || ''}', '${event.notes || ''}', 
                '${event.source || 'manual'}', '${event.created_by || ''}') 
        RETURNING *`;
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  }

  async updateEvent(id: string, updates: any): Promise<any> {
    try {
      const setClause = Object.keys(updates)
        .map(key => `${key} = '${updates[key]}'`)
        .join(', ');
      
      const query = `UPDATE app.events SET ${setClause} WHERE id = '${id}' RETURNING *`;
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('exec_sql' as any, {
        query_text: `DELETE FROM app.events WHERE id = '${id}'`
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete event:', error);
      throw error;
    }
  }

  async getTasks(personId?: string): Promise<any[]> {
    try {
      let query = 'SELECT * FROM app.tasks';
      
      if (personId) {
        query += ` WHERE person_id = '${personId}'`;
      }
      
      query += ' ORDER BY created_at DESC';
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  }

  async createTask(task: any): Promise<any> {
    try {
      const query = `
        INSERT INTO app.tasks (household_id, person_id, title, status, due_date, created_by) 
        VALUES ('${task.household_id || ''}', '${task.person_id || ''}', '${task.title}', '${task.status || 'todo'}', 
                '${task.due_date || ''}', '${task.created_by || ''}') 
        RETURNING *`;
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(id: string, updates: any): Promise<any> {
    try {
      const setClause = Object.keys(updates)
        .map(key => `${key} = '${updates[key]}'`)
        .join(', ');
      
      const query = `UPDATE app.tasks SET ${setClause} WHERE id = '${id}' RETURNING *`;
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('exec_sql' as any, {
        query_text: `DELETE FROM app.tasks WHERE id = '${id}'`
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  }

  async getPeople(householdId?: string): Promise<any[]> {
    try {
      let query = 'SELECT * FROM app.people WHERE is_active = true';
      
      if (householdId) {
        query += ` AND household_id = '${householdId}'`;
      }
      
      query += ' ORDER BY display_name ASC';
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch people:', error);
      return [];
    }
  }

  async createPerson(person: any): Promise<any> {
    try {
      const query = `
        INSERT INTO app.people (household_id, display_name, kind, color_hex, is_active) 
        VALUES ('${person.household_id || ''}', '${person.display_name}', '${person.kind || 'other'}', 
                '${person.color_hex || '#3B82F6'}', ${person.is_active !== false}) 
        RETURNING *`;
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Failed to create person:', error);
      throw error;
    }
  }

  // Households
  async getHouseholds(): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: 'SELECT * FROM app.households ORDER BY created_at DESC'
      });
      
      if (error) throw error;
      return Array.isArray(data) ? data : [];
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
      let query = 'SELECT * FROM app.ride_offers';
      
      if (personId) {
        query += ` WHERE offered_by_person_id = '${personId}'`;
      }
      
      query += ' ORDER BY created_at DESC';
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch ride offers:', error);
      return [];
    }
  }

  async createRideOffer(offer: any): Promise<any> {
    try {
      const query = `
        INSERT INTO app.ride_offers (household_id, event_id, offered_by_person_id, status, notes) 
        VALUES ('${offer.household_id || ''}', '${offer.event_id || ''}', '${offer.offered_by_person_id || ''}', 
                '${offer.status || 'proposed'}', '${offer.notes || ''}') 
        RETURNING *`;
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Failed to create ride offer:', error);
      throw error;
    }
  }

  async updateRideOffer(id: string, updates: any): Promise<any> {
    try {
      const setClause = Object.keys(updates)
        .map(key => `${key} = '${updates[key]}'`)
        .join(', ');
      
      const query = `UPDATE app.ride_offers SET ${setClause} WHERE id = '${id}' RETURNING *`;
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Failed to update ride offer:', error);
      throw error;
    }
  }

  async getMessages(personId?: string): Promise<any[]> {
    try {
      let query = `
        SELECT m.*, mr.person_id as recipient_person_id, mr.status as recipient_status
        FROM app.messages m
        LEFT JOIN app.message_recipients mr ON m.id = mr.message_id`;
      
      if (personId) {
        query += ` WHERE mr.person_id = '${personId}'`;
      }
      
      query += ' ORDER BY m.created_at DESC';
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return [];
    }
  }

  async createMessage(message: any): Promise<any> {
    try {
      const query = `
        INSERT INTO app.messages (household_id, from_person_id, title, content, type, priority, due_time) 
        VALUES ('${message.household_id || ''}', '${message.from_person_id || ''}', '${message.title || ''}', 
                '${message.content}', '${message.type || 'message'}', '${message.priority || 'medium'}', 
                '${message.due_time || ''}') 
        RETURNING *`;
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Failed to create message:', error);
      throw error;
    }
  }

  async updateMessage(id: string, updates: any): Promise<any> {
    try {
      const setClause = Object.keys(updates)
        .map(key => `${key} = '${updates[key]}'`)
        .join(', ');
      
      const query = `UPDATE app.messages SET ${setClause} WHERE id = '${id}' RETURNING *`;
      
      const { data, error } = await supabase.rpc('exec_sql' as any, {
        query_text: query
      });
      
      if (error) throw error;
      return data?.[0];
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
    console.log('Supabase data client initialized with real backend connection');
  }
}

export const dataClient = new SupabaseDataClient();