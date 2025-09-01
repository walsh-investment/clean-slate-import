import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Calendar, CheckSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { EventRow } from '../EventRow';
import { TaskCard } from '../TaskCard';
import { familyMembers } from '../../constants/family';
import { useAppStore } from '../../src/store';
import { dataClient } from '../../src/services/dataClient';
import { Event, Task, MemberId } from '../../src/types';
import { isWithinDays } from '../../src/utils/dates';

export const MemberOverview: React.FC = () => {
  const params = useParams();
  const { setSelectedMember } = useAppStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const memberId = params.id as MemberId;
  const member = familyMembers.find(m => m.id === memberId);

  useEffect(() => {
    if (memberId) {
      setSelectedMember(memberId);
      loadMemberData();
    }
  }, [memberId, setSelectedMember]);

  const loadMemberData = async () => {
    try {
      setLoading(true);
      
      // TODO: These will be replaced with Supabase queries
      const [allEvents, allTasks] = await Promise.all([
        dataClient.getEvents(),
        dataClient.getTasks()
      ]);

      // Filter for member's upcoming events (next 14 days)
      const memberEvents = (Array.isArray(allEvents) ? allEvents : [])
        .filter(event => event.member === memberId)
        .filter(event => isWithinDays(event.event_date, 14))
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

      // Filter for member's active tasks
      const memberTasks = (Array.isArray(allTasks) ? allTasks : [])
        .filter(task => task.member === memberId)
        .sort((a, b) => {
          // Sort by status (todo, in-progress, done) then by due date
          const statusOrder = { 'todo': 0, 'in-progress': 1, 'done': 2 };
          if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
          }
          if (a.due_date && b.due_date) {
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          }
          return 0;
        });

      setEvents(memberEvents);
      setTasks(memberTasks);
    } catch (error) {
      console.error('Failed to load member data in MemberOverview:', error);
      // Set empty arrays as fallbacks
      setEvents([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, status: 'todo' | 'in-progress' | 'done') => {
    try {
      // TODO: This will be replaced with Supabase update
      await dataClient.updateTask(taskId, { status });
      
      // Optimistic update
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status } : task
      ));
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleChecklistToggle = async (taskId: string, itemId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task?.checklist) return;

      const updatedChecklist = task.checklist.map(item =>
        item.id === itemId ? { ...item, done: !item.done } : item
      );

      // TODO: This will be replaced with Supabase update
      await dataClient.updateTask(taskId, { checklist: updatedChecklist });
      
      // Optimistic update
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, checklist: updatedChecklist } : t
      ));
    } catch (error) {
      console.error('Failed to update checklist item:', error);
    }
  };

  if (!member) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl mb-2">Member Not Found</h2>
        <p className="text-muted-foreground">The requested family member could not be found.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: `var(--member-${member.id})` }}
            aria-label={`${member.name}'s color`}
          />
          <div>
            <h1 className="text-2xl">{member.name}'s Overview</h1>
            <p className="text-muted-foreground">{member.role}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-primary"
            aria-label={`Add event for ${member.name}`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
          <Button 
            variant="outline"
            className="focus:ring-2 focus:ring-primary"
            aria-label={`Add task for ${member.name}`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Events
              <span className="text-sm text-muted-foreground">({events.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
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

        {/* Tasks & Checklists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Tasks & Checklists
              <span className="text-sm text-muted-foreground">({tasks.filter(t => t.status !== 'done').length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No tasks assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    compact={true}
                    onStatusChange={handleTaskStatusChange}
                    onChecklistToggle={handleChecklistToggle}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};