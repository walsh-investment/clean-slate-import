import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Clock, MapPin, User, Filter, Search, Plus } from 'lucide-react';
import { useAppStore } from '../../src/store';
import { dataClient } from '../../src/services/supabaseDataClient';
import { Event, MemberId, MemberIdOrAll } from '../../src/types';
import { familyMembers } from '../../constants/family';
// import { useModalStore } from '../../src/stores/modalStore';

export function CalendarList() {
  const params = useParams();
  const { selectedMember } = useAppStore();
  // const { openModal } = useModalStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterDate, setFilterDate] = useState('all');

  // Determine if we're viewing a specific member's calendar
  const currentMemberId: MemberIdOrAll = (params.id as MemberId) || selectedMember;
  const isIndividualView = currentMemberId !== 'all';

  useEffect(() => {
    loadEvents();
  }, []);

  // Set initial filter when viewing individual member
  useEffect(() => {
    if (isIndividualView) {
      setFilterMember(currentMemberId as MemberId);
    }
  }, [isIndividualView, currentMemberId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await dataClient.getEvents();
      setEvents(allEvents || []);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesMember = filterMember === 'all' || event.member === filterMember;
    
    // Date filtering
    let matchesDate = true;
    if (filterDate !== 'all') {
      const eventDate = new Date(event.event_date);
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      switch (filterDate) {
        case 'today':
          const eventStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
          matchesDate = eventStart.getTime() === todayStart.getTime();
          break;
        case 'week':
          const weekFromNow = new Date(todayStart);
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          matchesDate = eventDate >= todayStart && eventDate < weekFromNow;
          break;
        case 'month':
          const monthFromNow = new Date(todayStart);
          monthFromNow.setMonth(monthFromNow.getMonth() + 1);
          matchesDate = eventDate >= todayStart && eventDate < monthFromNow;
          break;
      }
    }
    
    return matchesSearch && matchesMember && matchesDate;
  }).sort((a, b) => {
    // Sort by date, then by start time
    const dateA = new Date(a.event_date);
    const dateB = new Date(b.event_date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    
    // If same date, sort by start time
    const timeA = a.start_time || '00:00';
    const timeB = b.start_time || '00:00';
    return timeA.localeCompare(timeB);
  });

  const currentMember = familyMembers.find(m => m.id === currentMemberId);
  const pageTitle = isIndividualView && currentMember 
    ? `${currentMember.name}'s Calendar`
    : 'Family Calendar';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="space-y-4">
            <div className="h-16 bg-muted rounded"></div>
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
          {isIndividualView && currentMember && (
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: getMemberColor(currentMember.id) }}
              aria-label={`${currentMember.name}'s color`}
            />
          )}
          <h1 className="text-2xl">{pageTitle}</h1>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-primary"
          aria-label="Add new event"
          onClick={() => console.log('Add Event clicked')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                aria-label="Search events"
              />
            </div>
            
            {/* Only show member filter in all-family view */}
            {!isIndividualView && (
              <Select value={filterMember} onValueChange={setFilterMember}>
                <SelectTrigger className="w-48" aria-label="Filter by member">
                  <SelectValue placeholder="Filter by member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {familyMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Select value={filterDate} onValueChange={setFilterDate}>
              <SelectTrigger className="w-48" aria-label="Filter by date range">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Next 7 Days</SelectItem>
                <SelectItem value="month">Next 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Events ({filteredEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No events found matching your criteria</p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getMemberColor(event.member) }}
                      aria-label={`${getMemberName(event.member)}'s event`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4>{event.title}</h4>
                        {event.driver_name && (
                          <Badge variant="outline" className="text-xs">
                            Driver: {getMemberName(event.driver_name)}
                          </Badge>
                        )}
                        {event.source === 'email' && (
                          <Badge variant="secondary" className="text-xs">
                            Email
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {getMemberName(event.member)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(event.event_date)}
                        </span>
                        {event.start_time && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(event.start_time)}
                            {event.end_time && ` - ${formatTime(event.end_time)}`}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}