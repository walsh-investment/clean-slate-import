import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Car, User, CheckCircle } from 'lucide-react';
import { useModalStore } from '../../src/stores/modalProvider';
import { familyMembers } from '../../constants/family';
import { dataClient } from '../../src/services/supabaseDataClient';
import { toast } from '../ui/simple-toast';
import { MemberId } from '../../src/types';

interface AssignDriverData {
  rideRequestId: string;
  eventTitle: string;
  requesterName: string;
  pickupTime: string;
  destination: string;
}

export function AssignDriverModal() {
  const { activeModal, modalData, closeModal } = useModalStore();
  const [selectedDriver, setSelectedDriver] = useState<MemberId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isOpen = activeModal === 'assignDriver';
  const data = modalData as AssignDriverData;

  // Filter for family members who can drive (adults)
  const availableDrivers = familyMembers.filter(member => 
    ['charlie', 'tyra', 'nama', 'pops'].includes(member.id)
  );

  const handleAssignDriver = async () => {
    if (!selectedDriver || !data?.rideRequestId) {
      toast.error('Please select a driver');
      return;
    }

    setIsSubmitting(true);
    try {
      await dataClient.updateRideRequest(data.rideRequestId, {
        driver_name: selectedDriver,
        status: 'confirmed'
      });
      
      toast.success('Driver assigned successfully');
      closeModal();
      
      // Trigger a refresh of the current page
      window.location.reload();
    } catch (error) {
      console.error('Failed to assign driver:', error);
      toast.error('Failed to assign driver. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIllDrive = async () => {
    // Assign current user as driver (for demo, we'll use Charlie)
    setSelectedDriver('charlie');
    
    if (!data?.rideRequestId) return;

    setIsSubmitting(true);
    try {
      await dataClient.updateRideRequest(data.rideRequestId, {
        driver_name: 'charlie',
        status: 'confirmed'
      });
      
      toast.success("You're now the assigned driver!");
      closeModal();
      
      // Trigger a refresh of the current page
      window.location.reload();
    } catch (error) {
      console.error('Failed to assign driver:', error);
      toast.error('Failed to assign driver. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedDriver(null);
    closeModal();
  };

  const getMemberColor = (memberId: MemberId) => {
    return `var(--member-${memberId})`;
  };

  const getMemberInitials = (memberId: MemberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    return member ? member.name.split(' ').map(n => n[0]).join('').toUpperCase() : memberId.slice(0, 2).toUpperCase();
  };

  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Assign Driver
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Ride Request Details */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">{data.eventTitle}</h4>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>Requesting for: {data.requesterName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Car className="w-3 h-3" />
                <span>To: {data.destination}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Pickup: {data.pickupTime}</span>
              </div>
            </div>
          </div>

          {/* Quick Action */}
          <div className="text-center">
            <Button 
              onClick={handleIllDrive}
              disabled={isSubmitting}
              className="bg-success text-white hover:bg-success/90 w-full"
            >
              <Car className="w-4 h-4 mr-2" />
              I'll Drive
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Assign yourself as the driver
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or assign someone else</span>
            </div>
          </div>

          {/* Driver Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Driver</Label>
            <div className="space-y-2">
              {availableDrivers.map((driver) => (
                <div
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedDriver === driver.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <Avatar 
                    className="w-8 h-8" 
                    style={{ backgroundColor: getMemberColor(driver.id) }}
                  >
                    <AvatarFallback className="text-white text-sm">
                      {getMemberInitials(driver.id)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-sm text-muted-foreground">{driver.role}</p>
                  </div>
                  {selectedDriver === driver.id && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignDriver}
              disabled={!selectedDriver || isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Driver'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}