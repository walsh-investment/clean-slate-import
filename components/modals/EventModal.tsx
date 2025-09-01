import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { useModalStore } from '../../src/stores/modalProvider';
import { familyMembers } from '../../constants/family';
import { dataClient } from '../../src/services/dataClient';
import { toast } from '../ui/simple-toast';
import { MemberId } from '../../src/types';

export function EventModal() {
  const { 
    activeModal, 
    modalData, 
    eventFormData, 
    setEventFormData, 
    closeModal, 
    resetFormData 
  } = useModalStore();

  const isOpen = activeModal === 'addEvent' || activeModal === 'editEvent';
  const isEditing = activeModal === 'editEvent';

  useEffect(() => {
    if (isOpen && isEditing && modalData) {
      // Pre-populate form with existing event data
      setEventFormData({
        id: modalData.id,
        title: modalData.title,
        description: modalData.description || '',
        member: modalData.member,
        event_date: modalData.event_date,
        start_time: modalData.start_time || '',
        end_time: modalData.end_time || '',
        location: modalData.location || '',
        driver_name: modalData.driver_name || '',
        source: modalData.source || 'manual'
      });
    } else if (isOpen && !isEditing) {
      // Reset form for new event
      const today = new Date().toISOString().split('T')[0];
      setEventFormData({
        title: '',
        description: '',
        member: 'charlie',
        event_date: today,
        start_time: '',
        end_time: '',
        location: '',
        source: 'manual'
      });
    }
  }, [isOpen, isEditing, modalData, setEventFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventFormData.title || !eventFormData.member) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      if (isEditing && eventFormData.id) {
        await dataClient.updateEvent(eventFormData.id, eventFormData);
        toast.success('Event updated successfully');
      } else {
        await dataClient.createEvent(eventFormData);
        toast.success('Event created successfully');
      }
      
      closeModal();
      resetFormData();
      
      // Trigger a refresh of the current page
      window.location.reload();
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error('Failed to save event. Please try again.');
    }
  };

  const handleClose = () => {
    closeModal();
    resetFormData();
  };

  const getMemberColor = (memberId: MemberId) => {
    return `var(--member-${memberId})`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {isEditing ? 'Edit Event' : 'Add New Event'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title" className="text-sm font-medium">
              Event Title *
            </Label>
            <Input
              id="event-title"
              placeholder="Enter event title"
              value={eventFormData.title}
              onChange={(e) => setEventFormData({ title: e.target.value })}
              required
            />
          </div>

          {/* Family Member */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Family Member *</Label>
            <Select 
              value={eventFormData.member} 
              onValueChange={(value: MemberId) => setEventFormData({ member: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {familyMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getMemberColor(member.id) }}
                      />
                      {member.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="event-date" className="text-sm font-medium">
                Date *
              </Label>
              <Input
                id="event-date"
                type="date"
                value={eventFormData.event_date}
                onChange={(e) => setEventFormData({ event_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-time" className="text-sm font-medium">
                Start Time
              </Label>
              <Input
                id="start-time"
                type="time"
                value={eventFormData.start_time}
                onChange={(e) => setEventFormData({ start_time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time" className="text-sm font-medium">
                End Time
              </Label>
              <Input
                id="end-time"
                type="time"
                value={eventFormData.end_time}
                onChange={(e) => setEventFormData({ end_time: e.target.value })}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Location
            </Label>
            <Input
              id="location"
              placeholder="Event location"
              value={eventFormData.location}
              onChange={(e) => setEventFormData({ location: e.target.value })}
            />
          </div>

          {/* Driver */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <User className="w-3 h-3" />
              Driver (Optional)
            </Label>
            <Select 
              value={eventFormData.driver_name || 'none'} 
              onValueChange={(value) => setEventFormData({ driver_name: value === 'none' ? undefined : value as MemberId })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No driver needed</SelectItem>
                {familyMembers
                  .filter(member => ['charlie', 'tyra', 'nama', 'pops'].includes(member.id))
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getMemberColor(member.id) }}
                        />
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Event details (optional)"
              value={eventFormData.description}
              onChange={(e) => setEventFormData({ description: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isEditing ? 'Update Event' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}