import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Car, Clock, MapPin, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { useModalStore } from '../../src/stores/modalProvider';
import { dataClient } from '../../src/services/supabaseDataClient';

export function RideRequests() {
  const { openModal } = useModalStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleAssignDriver = (request: any) => {
    openModal('assignDriver', {
      rideRequestId: request.id,
      eventTitle: request.event,
      requesterName: request.requester,
      pickupTime: request.pickupTime,
      destination: request.destination
    });
  };

  const handleEditRequest = (request: any) => {
    openModal('editRideRequest', request);
  };

  const handleIllDrive = async (requestId: string) => {
    try {
      // This will be implemented with real backend data
      console.log('Assigning driver to ride request:', requestId);
    } catch (error) {
      console.error('Failed to assign driver:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Ride Requests</h2>
          <p className="text-sm text-muted-foreground">
            Coordinate transportation for family activities
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={() => openModal('addRideRequest')}
        >
          <Plus className="w-4 h-4 mr-1" />
          Request Ride
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Active Requests */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ride requests will appear here once the backend is connected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Drivers */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center text-muted-foreground">
                <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Available drivers will appear here</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Pending Requests</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Confirmed Rides</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Miles</span>
                  <span className="font-medium">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}