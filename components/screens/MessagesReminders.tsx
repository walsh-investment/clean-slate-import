import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MessageSquare, Bell, Send, Plus, AlertCircle, Clock, Check } from 'lucide-react';

export function MessagesReminders() {
  const [newMessage, setNewMessage] = useState('');
  const [newReminder, setNewReminder] = useState('');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'announcement': return <Bell className="w-4 h-4" />;
      case 'reminder': return <Clock className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Messages & Reminders</h2>
          <p className="text-sm text-muted-foreground">
            Stay connected with family communications
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => console.log('Add Reminder clicked')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Reminder
          </Button>
          <Button 
            size="sm" 
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-primary"
            onClick={() => console.log('Send Message clicked')}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Send Message
          </Button>
        </div>
      </div>

      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {/* Quick Send */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <Textarea
                    placeholder="Send a message to the family..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="urgent" />
                    <label htmlFor="urgent" className="text-sm">Mark as urgent</label>
                  </div>
                  <Button size="sm">
                    <Send className="w-3 h-3 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Messages will appear here once the backend is connected</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          {/* Quick Create Reminder */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Input
                  placeholder="Create a reminder..."
                  value={newReminder}
                  onChange={(e) => setNewReminder(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <select className="text-sm border rounded px-2 py-1">
                      <option>Assign to...</option>
                      <option>Family Member 1</option>
                      <option>Family Member 2</option>
                    </select>
                    <select className="text-sm border rounded px-2 py-1">
                      <option>Priority</option>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                  <Button size="sm">
                    <Plus className="w-3 h-3 mr-1" />
                    Create
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reminders List */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Reminders will appear here once the backend is connected</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center text-muted-foreground">
                  <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Completed reminders will appear here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}