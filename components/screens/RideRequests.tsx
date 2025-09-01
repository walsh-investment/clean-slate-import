import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Car, Clock, MapPin, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { RIDE_REQUESTS, AVAILABLE_DRIVERS } from '../../data/rides';
import { getStatusColor } from '../../utils/colors';
import { useModalStore } from '../../src/stores/modalProvider';
import { dataClient } from '../../src/services/dataClient';

export function RideRequests() {
  const { openModal } = useModalStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-[#10B981]" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-[#F59E0B]" />;
      default:
        return <Clock className="w-4 h-4 text-[#64748B]" />;
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
      await dataClient.updateRideRequest(requestId, {
        driver_name: 'charlie', // In a real app, this would be the current user
        status: 'confirmed'
      });
      // Trigger refresh
      window.location.reload();
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
          className="bg-[#3B82F6] hover:bg-[#2563EB]"
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
              <div className="space-y-4">
                {RIDE_REQUESTS.map((request) => (
                  <Card key={request.id} className="bg-accent/20">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Avatar className="w-8 h-8" style={{ backgroundColor: request.requesterColor }}>
                          <AvatarFallback className="text-white text-sm">
                            {request.requesterAvatar}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{request.event}</h4>
                              <p className="text-sm text-muted-foreground">{request.requester}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(request.status)}
                              <Badge 
                                variant="outline"
                                style={{ 
                                  borderColor: getStatusColor(request.status), 
                                  color: getStatusColor(request.status) 
                                }}
                              >
                                {request.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                              <div className="flex items-center text-muted-foreground">
                                <MapPin className="w-3 h-3 mr-1" />
                                From: {request.pickup}
                              </div>
                              <div className="flex items-center text-muted-foreground">
                                <MapPin className="w-3 h-3 mr-1" />
                                To: {request.destination}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center text-muted-foreground">
                                <Clock className="w-3 h-3 mr-1" />
                                Pickup: {request.date} {request.pickupTime}
                              </div>
                              <div className="flex items-center text-muted-foreground">
                                <Clock className="w-3 h-3 mr-1" />
                                Return: {request.dropoffTime}
                              </div>
                            </div>
                          </div>
                          
                          {request.notes && (
                            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                              {request.notes}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between pt-2">
                            {request.driver ? (
                              <div className="flex items-center space-x-2">
                                <Avatar className="w-5 h-5" style={{ backgroundColor: request.driverColor }}>
                                  <AvatarFallback className="text-white text-xs">
                                    {request.driverAvatar}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">Driver: {request.driver}</span>
                              </div>
                            ) : (
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  className="bg-[#10B981] hover:bg-[#059669]"
                                  onClick={() => handleIllDrive(request.id)}
                                >
                                  <Car className="w-3 h-3 mr-1" />
                                  I'll Drive
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleAssignDriver(request)}
                                >
                                  Assign Driver
                                </Button>
                              </div>
                            )}
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleEditRequest(request)}
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
              <div className="space-y-3">
                {AVAILABLE_DRIVERS.map((driver) => (
                  <div key={driver.name} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6" style={{ backgroundColor: driver.color }}>
                        <AvatarFallback className="text-white text-xs">
                          {driver.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{driver.name}</span>
                    </div>
                    <Badge 
                      variant={driver.available ? "default" : "secondary"}
                      className="text-xs"
                      style={{ 
                        backgroundColor: driver.available ? '#10B981' : '#94A3B8',
                        color: 'white'
                      }}
                    >
                      {driver.available ? 'Available' : 'Busy'}
                    </Badge>
                  </div>
                ))}
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
                  <span className="font-medium">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Confirmed Rides</span>
                  <span className="font-medium">6</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Miles</span>
                  <span className="font-medium">84</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}