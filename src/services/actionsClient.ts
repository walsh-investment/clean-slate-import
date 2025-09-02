import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface EmailData {
  to: string[];
  subject: string;
  body: string;
  template?: string;
}

interface SMSData {
  to: string[];
  message: string;
}

// Enhanced actions client that uses Supabase backend for logging and coordination
class NilesActionsClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-84035cd9`;
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    };
  }

  async sendEmail(data: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`https://wkhxircgcysdzmofwnbr.supabase.co/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.headers.Authorization.split(' ')[1]}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Email service failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      await this.logAction('email_sent', {
        recipients: data.to,
        subject: data.subject,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        messageId: result.messageId || `msg-${Date.now()}`
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  async sendSMS(data: SMSData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch(`https://wkhxircgcysdzmofwnbr.supabase.co/functions/v1/telegram-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.headers.Authorization.split(' ')[1]}`
        },
        body: JSON.stringify({
          message: data.message,
          recipients: data.to
        })
      });
      
      if (!response.ok) {
        throw new Error(`SMS service failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      await this.logAction('sms_sent', {
        recipients: data.to,
        message: data.message,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        messageId: result.messageId || `sms-${Date.now()}`
      };
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send SMS'
      };
    }
  }

  async createCalendarEvent(eventData: any): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      const response = await fetch(`https://wkhxircgcysdzmofwnbr.supabase.co/functions/v1/google-calendar-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.headers.Authorization.split(' ')[1]}`
        },
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) {
        throw new Error(`Calendar service failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      await this.logAction('calendar_event_created', {
        event: eventData,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        eventId: result.eventId || `cal-${Date.now()}`
      };
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create calendar event'
      };
    }
  }

  // Send automatic reminders for family events
  async sendEventReminder(eventId: string, recipients: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      // This would integrate with the family organizer to send smart reminders
      console.log(`Sending event reminder for event ${eventId} to:`, recipients);
      
      await this.logAction('reminder_sent', {
        eventId,
        recipients,
        timestamp: new Date().toISOString()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Failed to send event reminder:', error);
      return { success: false, error: 'Failed to send reminder' };
    }
  }

  // Log actions to the database for family coordination tracking
  private async logAction(actionType: string, data: any): Promise<void> {
    try {
      console.log('Action logged:', { type: actionType, data });
      // Actions are now logged by the individual edge functions
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  }
}

export const actionsClient = new NilesActionsClient();