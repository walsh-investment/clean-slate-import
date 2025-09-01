import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MessageSquare, Bell, Send, Plus, AlertCircle, Clock, Check } from 'lucide-react';
import { MESSAGES, REMINDERS } from '../../data/messages';
import { getPriorityColor } from '../../utils/colors';
// import { useModalStore } from '../../src/stores/modalStore';

export function MessagesReminders() {
  // const { openModal } = useModalStore();
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
              <div className="space-y-4">
                {MESSAGES.map((message) => (
                  <div key={message.id} 
                       className={`p-4 rounded-lg border ${message.urgent ? 'border-warning bg-warning/10' : 'bg-card'}`}>
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8" style={{ backgroundColor: message.senderColor }}>
                        <AvatarFallback className="text-white text-xs">
                          {message.senderAvatar}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{message.sender}</span>
                            <div className="flex items-center space-x-1">
                              {getTypeIcon(message.type)}
                              <Badge variant="outline" className="text-xs">
                                {message.type}
                              </Badge>
                              {message.urgent && (
                                <Badge variant="outline" className="text-xs border-warning text-warning">
                                  Urgent
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                        </div>
                        
                        <p className="text-sm">{message.content}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            To: {message.recipients.join(', ')}
                          </div>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="ghost" className="h-6 text-xs">
                              Reply
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs">
                              Forward
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                      <option>Charlie</option>
                      <option>Tyra</option>
                      <option>Nama</option>
                      <option>Pops</option>
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
                <div className="space-y-3">
                  {REMINDERS.filter(r => r.status === 'pending').map((reminder) => (
                    <div key={reminder.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{reminder.title}</h4>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ 
                            borderColor: getPriorityColor(reminder.priority), 
                            color: getPriorityColor(reminder.priority) 
                          }}
                        >
                          {reminder.priority}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-5 h-5" style={{ backgroundColor: reminder.assignedColor }}>
                            <AvatarFallback className="text-white text-xs">
                              {reminder.assignedAvatar}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {reminder.assignedTo}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {reminder.dueTime}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-end mt-2 space-x-1">
                        <Button size="sm" variant="ghost" className="h-6 text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Complete
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-xs">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {REMINDERS.filter(r => r.status === 'completed').map((reminder) => (
                    <div key={reminder.id} className="p-3 rounded-lg border bg-muted/30 opacity-75">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm line-through">{reminder.title}</h4>
                        <Badge variant="outline" className="text-xs border-success text-success">
                          Done
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-5 h-5" style={{ backgroundColor: reminder.assignedColor }}>
                            <AvatarFallback className="text-white text-xs">
                              {reminder.assignedAvatar}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {reminder.assignedTo}
                          </span>
                        </div>
                        <Check className="w-4 h-4 text-success" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}