import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAppStore } from '../../src/store';
import { dataClient } from '../../src/services/dataClient';
import { Event, MemberId, MemberIdOrAll } from '../../src/types';
import { familyMembers } from '../../constants/family';
// import { useModalStore } from '../../src/stores/modalStore';

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timeSlots = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'
];

export function CalendarWeek() {
  const params = useParams();
  const { selectedMember } = useAppStore();
  // const { openModal } = useModalStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState('August 10-16, 2025');

  // Determine if we're viewing a specific member's calendar
  const currentMemberId: MemberIdOrAll = (params.id as MemberId) || selectedMember;
  const isIndividualView = currentMemberId !== 'all';

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await dataClient.getEvents();
      
      // Filter events for current week and member if individual view
      const filteredEvents = (allEvents || []).filter(event => {
        if (isIndividualView) {
          return event.member === (currentMemberId as MemberId);
        }
        return true;
      });

      setEvents(filteredEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getMemberName = (memberId: MemberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    return member?.name || memberId;
  };

  const getMemberColor = (memberId: MemberId) => {
    return `var(--member-${memberId})`;
  };

  const getEventPosition = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    const isPM = time.includes('PM');
    const adjustedHour = isPM && hour !== 12 ? hour + 12 : hour === 12 && !isPM ? 0 : hour;
    return Math.max(0, adjustedHour - 6);
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getEventDuration = (startTime?: string, endTime?: string) => {
    if (!startTime || !endTime) return 1; // Default 1 hour
    
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0.5, diffHours); // Minimum 30 minutes
  };

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    return daysOfWeek[date.getDay()];
  };

  const getEventsForDayAndTimeSlot = (day: string, timeIndex: number) => {
    return events.filter(event => {
      const eventDay = getDayOfWeek(event.event_date);
      if (eventDay !== day || !event.start_time) return false;
      
      const eventTimeIndex = getEventPosition(formatTime(event.start_time));
      return eventTimeIndex === timeIndex;
    });
  };

  const currentMember = familyMembers.find(m => m.id === currentMemberId);
  const pageTitle = isIndividualView && currentMember 
    ? `${currentMember.name}'s Weekly Calendar`
    : 'Family Weekly Calendar';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {isIndividualView && currentMember && (
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: getMemberColor(currentMember.id) }}
              aria-label={`${currentMember.name}'s color`}
            />
          )}
          <h1 className="text-2xl">{pageTitle}</h1>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" aria-label="Previous week">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-lg">{currentWeek}</span>
            <Button variant="ghost" size="sm" aria-label="Next week">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline">Today</Button>
          <Button 
            size="sm" 
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-primary"
            aria-label="Add new event"
            onClick={() => console.log('Add Event clicked')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <div className="min-w-[800px]">
            {/* Header Row */}
            <div className="grid grid-cols-8 border-b">
              <div className="p-4 border-r bg-muted/30">
                <span className="text-sm text-muted-foreground">Time</span>
              </div>
              {daysOfWeek.map((day, index) => (
                <div key={day} className="p-4 border-r last:border-r-0 text-center">
                  <div className="font-medium">{day}</div>
                  <div className="text-sm text-muted-foreground">
                    {10 + index}
                  </div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="relative">
              {timeSlots.map((time, timeIndex) => (
                <div key={time} className="grid grid-cols-8 border-b last:border-b-0 min-h-[60px]">
                  <div className="p-2 border-r bg-muted/30 flex items-start">
                    <span className="text-xs text-muted-foreground">{time}</span>
                  </div>
                  {daysOfWeek.map((day) => (
                    <div key={`${day}-${time}`} className="border-r last:border-r-0 relative p-1">
                      {/* Events for this day and time slot */}
                      {getEventsForDayAndTimeSlot(day, timeIndex).map((event) => (
                        <div
                          key={event.id}
                          className="absolute inset-x-1 rounded text-white text-xs p-1 cursor-pointer hover:opacity-80"
                          style={{
                            backgroundColor: getMemberColor(event.member),
                            height: `${getEventDuration(event.start_time, event.end_time) * 60 - 4}px`,
                            zIndex: 10,
                          }}
                          title={`${event.title} - ${getMemberName(event.member)} - ${formatTime(event.start_time)}`}
                        >
                          <div className="font-medium truncate">{event.title}</div>
                          <div className="opacity-90 truncate">{getMemberName(event.member)}</div>
                          {event.location && (
                            <div className="opacity-80 truncate text-[10px]">{event.location}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend - Only show in all-family view */}
      {!isIndividualView && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Family Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getMemberColor(member.id) }}
                  />
                  <span className="text-sm">{member.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}