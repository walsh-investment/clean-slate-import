import React, { useEffect, useState } from 'react';
import { EventRow } from '../EventRow';
import { TaskCard } from '../TaskCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Filter, Calendar, CheckSquare, Car, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../src/store';
import { dataClient } from '../../src/services/supabaseDataClient';
import { Event, Task, Message } from '../../src/types';
import { isToday, isWithinDays } from '../../src/utils/dates';

export function AllFamilyFeed() {
  const { selectedMember = 'all', timeFilter = 'next7', typeFilter = 'all' } = useAppStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedMember, timeFilter, typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // TODO: These will be replaced with Supabase queries
      const [allEvents, allTasks, allMessages] = await Promise.all([
        dataClient.getEvents(),
        dataClient.getTasks(),
        dataClient.getMessages()
      ]);

      // Filter data based on store filters
      let filteredEvents = Array.isArray(allEvents) ? allEvents : [];
      let filteredTasks = Array.isArray(allTasks) ? allTasks : [];

      // Filter by member
      if (selectedMember !== 'all') {
        filteredEvents = filteredEvents.filter(event => event.person_id === selectedMember);
        filteredTasks = filteredTasks.filter(task => task.person_id === selectedMember);
      }

      // Filter by time
      if (timeFilter === 'today') {
        filteredEvents = filteredEvents.filter(event => isToday(event.event_date));
        filteredTasks = filteredTasks.filter(task => task.due_date && isToday(task.due_date));
      } else if (timeFilter === 'next7') {
        filteredEvents = filteredEvents.filter(event => isWithinDays(event.event_date, 7));
        filteredTasks = filteredTasks.filter(task => task.due_date && isWithinDays(task.due_date, 7));
      }

      // Filter by type
      if (typeFilter === 'events') {
        filteredTasks = [];
      } else if (typeFilter === 'tasks') {
        filteredEvents = [];
      }

      setEvents(filteredEvents.slice(0, 5)); // Show first 5
      setTasks(filteredTasks.filter(task => task.status !== 'done').slice(0, 5)); // Show first 5 active
      setMessages(allMessages.slice(0, 3)); // Show first 3
    } catch (error) {
      console.error('Failed to load data in AllFamilyFeed:', error);
      // Set empty arrays as fallbacks
      setEvents([]);
      setTasks([]);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const todayEvents = events.filter(event => isToday(event.event_date));
  const activeTasks = tasks.filter(task => task.status !== 'done');
  const rideRequests = events.filter(event => !event.driver_person_id);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-12"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Events</p>
                <p className="text-2xl">{todayEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-5 h-5 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Active Tasks</p>
                <p className="text-2xl">{activeTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Car className="w-5 h-5 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Ride Requests</p>
                <p className="text-2xl">{rideRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-info" />
              <div>
                <p className="text-sm text-muted-foreground">Messages</p>
                <p className="text-2xl">{messages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Events</CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="focus:ring-2 focus:ring-primary"
                aria-label="Filter events"
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="focus:ring-2 focus:ring-primary"
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map(event => (
                  <EventRow 
                    key={event.id} 
                    event={event} 
                    density="compact"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Active Tasks</CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                className="focus:ring-2 focus:ring-primary"
                aria-label="Filter tasks"
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="focus:ring-2 focus:ring-primary"
              >
                View Board
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    compact={true}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}