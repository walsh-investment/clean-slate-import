import React from 'react';
import { Clock, MapPin, Car } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Event, EventVariant, EventDensity, MemberId } from '../src/types';
import { familyMembers } from '../constants/family';
import { formatDate, formatTime, isOverdue } from '../src/utils/dates';

interface EventRowProps {
  event: Event;
  variant?: EventVariant;
  density?: EventDensity;
  onDriverAssign?: (eventId: string, driverId: MemberId | 'ride-needed') => void;
  onRequestRide?: (eventId: string) => void;
}

export const EventRow: React.FC<EventRowProps> = ({ 
  event, 
  variant,
  density = 'regular',
  onDriverAssign,
  onRequestRide 
}) => {
  // Compute variant from event data if not explicitly provided
  const computedVariant: EventVariant = variant || (() => {
    if (isOverdue(event.event_date)) return 'overdue';
    if (!event.driver_name) return 'ride-needed';
    return 'assigned';
  })();

  const member = familyMembers.find(m => m.id === event.member);
  const driver = event.driver_name ? familyMembers.find(m => m.id === event.driver_name) : null;
  
  const isCompact = density === 'compact';
  const rowPadding = isCompact ? 'p-3' : 'p-4';
  const textSize = isCompact ? 'text-sm' : 'text-base';
  const subtextSize = isCompact ? 'text-xs' : 'text-sm';

  const getStatusBadge = () => {
    switch (computedVariant) {
      case 'ride-needed':
        return (
          <Badge 
            variant="destructive" 
            className="bg-danger text-white"
            aria-label="Transportation needed"
          >
            Ride Needed
          </Badge>
        );
      case 'assigned':
        return driver ? (
          <Badge 
            variant="secondary" 
            className="bg-success/10 text-success border-success/20"
            aria-label={`Driver assigned: ${driver.name}`}
          >
            {driver.name} driving
          </Badge>
        ) : null;
      case 'overdue':
        return (
          <Badge 
            variant="destructive" 
            className="bg-danger text-white"
            aria-label="Event is overdue"
          >
            Overdue
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={`
        bg-card border border-border rounded-lg ${rowPadding} 
        flex items-center justify-between hover:bg-accent/50 transition-colors
        ${computedVariant === 'overdue' ? 'border-danger/30' : ''}
      `}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Member color chip */}
        <div 
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: `var(--member-${event.member})` }}
          aria-label={`${member?.name || 'Unknown member'}'s event`}
        />
        
        {/* Event details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className={`${textSize} text-foreground truncate`}>
              {event.title}
            </h3>
            {getStatusBadge()}
          </div>
          
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className={subtextSize}>
                {event.start_time && event.end_time 
                  ? `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`
                  : formatDate(event.event_date)
                }
              </span>
            </div>
            
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className={`${subtextSize} truncate max-w-40`}>
                  {event.location}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {computedVariant === 'ride-needed' && onRequestRide && (
          <Button
            variant="outline"
            size={isCompact ? "sm" : "default"}
            onClick={() => onRequestRide(event.id)}
            className="focus:ring-2 focus:ring-primary"
            aria-label={`Request ride for ${event.title}`}
          >
            <Car className="w-4 h-4 mr-2" />
            Request Ride
          </Button>
        )}
        
        {(computedVariant === 'assigned' || computedVariant === 'ride-needed') && onDriverAssign && (
          <Button
            variant="outline"
            size={isCompact ? "sm" : "default"}
            onClick={() => onDriverAssign(event.id, 'ride-needed')}
            className="focus:ring-2 focus:ring-primary"
            aria-label={driver ? `Change driver for ${event.title}` : `Assign driver for ${event.title}`}
          >
            {driver ? "Change Driver" : "I'll Drive"}
          </Button>
        )}
      </div>
    </div>
  );
};