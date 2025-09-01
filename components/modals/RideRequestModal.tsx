import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Car, MapPin, Clock, User } from 'lucide-react';
import { useModalStore } from '../../src/stores/modalProvider';
import { familyMembers } from '../../constants/family';
import { dataClient } from '../../src/services/supabaseDataClient';
import { toast } from '../ui/simple-toast';
import { MemberId } from '../../src/types';

export function RideRequestModal() {
  const { 
    activeModal, 
    modalData, 
    rideRequestFormData, 
    setRideRequestFormData, 
    closeModal, 
    resetFormData 
  } = useModalStore();

  const isOpen = activeModal === 'addRideRequest' || activeModal === 'editRideRequest';
  const isEditing = activeModal === 'editRideRequest';

  useEffect(() => {
    if (isOpen && isEditing && modalData) {
      // Pre-populate form with existing ride request data
      setRideRequestFormData({
        id: modalData.id,
        title: modalData.title,
        requester: modalData.requester,
        destination: modalData.destination,
        pickup_location: modalData.pickup_location || '',
        pickup_time: modalData.pickup_time,
        return_time: modalData.return_time || '',
        event_date: modalData.event_date,
        notes: modalData.notes || '',
        status: modalData.status,
        driver_name: modalData.driver_name
      });
    } else if (isOpen && !isEditing) {
      // Reset form for new ride request
      const today = new Date().toISOString().split('T')[0];
      setRideRequestFormData({
        title: '',
        requester: 'charlie',
        destination: '',
        pickup_location: '',
        pickup_time: '',
        return_time: '',
        event_date: today,
        notes: '',
        status: 'pending'
      });
    }
  }, [isOpen, isEditing, modalData, setRideRequestFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rideRequestFormData.title || !rideRequestFormData.destination || !rideRequestFormData.pickup_time) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      if (isEditing && rideRequestFormData.id) {
        await dataClient.updateRideRequest(rideRequestFormData.id, rideRequestFormData);
        toast.success('Ride request updated successfully');
      } else {
        await dataClient.createRideRequest(rideRequestFormData);
        toast.success('Ride request created successfully');
      }
      
      closeModal();
      resetFormData();
      
      // Trigger a refresh of the current page
      window.location.reload();
    } catch (error) {
      console.error('Failed to save ride request:', error);
      toast.error('Failed to save ride request. Please try again.');
    }
  };

  const handleClose = () => {
    closeModal();
    resetFormData();
  };

  const getMemberColor = (memberId: MemberId) => {
    return `var(--member-${memberId})`;
  };

  // Filter for family members who can drive (adults)
  const availableDrivers = familyMembers.filter(member => 
    ['charlie', 'tyra', 'nama', 'pops'].includes(member.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            {isEditing ? 'Edit Ride Request' : 'Request a Ride'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Request Title */}
          <div className="space-y-2">
            <Label htmlFor="ride-title" className="text-sm font-medium">
              Event/Trip Title *
            </Label>
            <Input
              id="ride-title"
              placeholder="e.g., Soccer Practice, School Pickup"
              value={rideRequestFormData.title}
              onChange={(e) => setRideRequestFormData({ title: e.target.value })}
              required
            />
          </div>

          {/* Requester */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Requesting For *</Label>
            <Select 
              value={rideRequestFormData.requester} 
              onValueChange={(value: MemberId) => setRideRequestFormData({ requester: value })}
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

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="ride-date" className="text-sm font-medium">
              Date *
            </Label>
            <Input
              id="ride-date"
              type="date"
              value={rideRequestFormData.event_date}
              onChange={(e) => setRideRequestFormData({ event_date: e.target.value })}
              required
            />
          </div>

          {/* Pickup Location */}
          <div className="space-y-2">
            <Label htmlFor="pickup-location" className="text-sm font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Pickup Location
            </Label>
            <Input
              id="pickup-location"
              placeholder="e.g., Home, School"
              value={rideRequestFormData.pickup_location}
              onChange={(e) => setRideRequestFormData({ pickup_location: e.target.value })}
            />
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination" className="text-sm font-medium flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Destination *
            </Label>
            <Input
              id="destination"
              placeholder="Where to?"
              value={rideRequestFormData.destination}
              onChange={(e) => setRideRequestFormData({ destination: e.target.value })}
              required
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pickup-time" className="text-sm font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Pickup Time *
              </Label>
              <Input
                id="pickup-time"
                type="time"
                value={rideRequestFormData.pickup_time}
                onChange={(e) => setRideRequestFormData({ pickup_time: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-time" className="text-sm font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Return Time
              </Label>
              <Input
                id="return-time"
                type="time"
                value={rideRequestFormData.return_time}
                onChange={(e) => setRideRequestFormData({ return_time: e.target.value })}
              />
            </div>
          </div>

          {/* Driver Assignment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <User className="w-3 h-3" />
              Assign Driver (Optional)
            </Label>
            <Select 
              value={rideRequestFormData.driver_name || 'none'} 
              onValueChange={(value) => setRideRequestFormData({ driver_name: value === 'none' ? undefined : value as MemberId })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Driver will be assigned later" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No driver assigned</SelectItem>
                {availableDrivers.map((member) => (
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

          {/* Status */}
          {isEditing && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select 
                value={rideRequestFormData.status} 
                onValueChange={(value: 'pending' | 'confirmed' | 'completed') => setRideRequestFormData({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      Pending
                    </span>
                  </SelectItem>
                  <SelectItem value="confirmed">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Confirmed
                    </span>
                  </SelectItem>
                  <SelectItem value="completed">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Completed
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Additional details, special instructions, etc."
              value={rideRequestFormData.notes}
              onChange={(e) => setRideRequestFormData({ notes: e.target.value })}
              rows={2}
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
              {isEditing ? 'Update Request' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}