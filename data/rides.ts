import { RideOffer } from '../src/types';

export const rideOffers: RideOffer[] = [
  // Wednesday, August 13th rides
  {
    id: 'offer-1',
    event_id: 'event-1', // Ellis daycare drop off
    offered_by: 'charlie',
    status: 'accepted',
  },
  {
    id: 'offer-2',
    event_id: 'event-4', // Adelaide community center pick up
    offered_by: 'charlie', // Note: Using Charlie since Kathleen isn't in our member types
    status: 'accepted',
  },
  {
    id: 'offer-3',
    event_id: 'event-5', // Wyatt soccer drop off
    offered_by: 'nama',
    status: 'accepted',
  },
  {
    id: 'offer-4',
    event_id: 'event-6', // Ellis daycare pick up
    offered_by: 'charlie',
    status: 'accepted',
  },
  {
    id: 'offer-5',
    event_id: 'event-7', // Wyatt soccer pick up
    offered_by: 'beckett',
    status: 'accepted',
  },
  // Thursday, August 14th rides
  {
    id: 'offer-6',
    event_id: 'event-8', // Ellis daycare drop off
    offered_by: 'charlie',
    status: 'accepted',
  },
  {
    id: 'offer-7',
    event_id: 'event-9', // Wyatt community center drop off
    offered_by: 'charlie',
    status: 'accepted',
  },
  {
    id: 'offer-8',
    event_id: 'event-15', // Wyatt violin lesson
    offered_by: 'tyra',
    status: 'accepted',
  },
  // Friday, August 15th rides
  {
    id: 'offer-9',
    event_id: 'event-16', // Ellis day with Nama and Pops
    offered_by: 'nama',
    status: 'accepted',
  },
  {
    id: 'offer-10',
    event_id: 'event-17', // Wyatt community center drop off
    offered_by: 'charlie',
    status: 'accepted',
  },
  {
    id: 'offer-11',
    event_id: 'event-19', // Wyatt community center pick up
    offered_by: 'beckett',
    status: 'accepted',
  },
  // Future ride needs - events that still need drivers assigned
  {
    id: 'offer-12',
    event_id: 'event-13', // Wyatt community center pick up (Thursday)
    offered_by: 'tyra',
    status: 'proposed',
  },
  {
    id: 'offer-13',
    event_id: 'event-14', // Ellis daycare pick up (Thursday)
    offered_by: 'charlie',
    status: 'proposed',
  },
];

// Updated data structure for RideRequests component
export const RIDE_REQUESTS = [
  {
    id: 'request-1',
    title: 'Wyatt Community Center Pick Up',
    event: 'Wyatt Community Center Pick Up',
    time: '3:00 PM Thursday',
    member: 'Wyatt',
    requester: 'wyatt',
    requesterColor: 'var(--member-wyatt)',
    requesterAvatar: 'WW',
    location: 'Community Center',
    pickup: 'Home',
    destination: 'Community Center',
    date: '2024-08-15',
    pickupTime: '3:00 PM',
    dropoffTime: '5:00 PM',
    status: 'pending',
    color: 'var(--member-wyatt)',
    notes: 'Pick up after activities',
    driver: null,
    driverColor: null,
    driverAvatar: null,
  },
  {
    id: 'request-2',
    title: 'Ellis Daycare Pick Up',
    event: 'Ellis Daycare Pick Up',
    time: '5:00 PM Thursday',
    member: 'Ellis',
    requester: 'ellis',
    requesterColor: 'var(--member-ellis)',
    requesterAvatar: 'EW',
    location: 'Ellis Daycare',
    pickup: 'Ellis Daycare',
    destination: 'Home',
    date: '2024-08-15',
    pickupTime: '5:00 PM',
    dropoffTime: '5:30 PM',
    status: 'pending',
    color: 'var(--member-ellis)',
    notes: 'Regular pickup time',
    driver: null,
    driverColor: null,
    driverAvatar: null,
  },
];

export const AVAILABLE_DRIVERS = [
  { name: 'Charlie', color: 'var(--member-charlie)', avatar: 'CW', available: true },
  { name: 'Tyra', color: 'var(--member-tyra)', avatar: 'TW', available: true },
  { name: 'Nama', color: 'var(--member-nama)', avatar: 'NW', available: false },
  { name: 'Pops', color: 'var(--member-pops)', avatar: 'PW', available: true },
  { name: 'Beckett', color: 'var(--member-beckett)', avatar: 'BW', available: true }, // Beckett has driver's license
];