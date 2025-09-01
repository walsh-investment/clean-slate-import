export const FAMILY_MEMBERS = [
  { id: 'charlie' as const, name: 'Charlie', color: '#00BCD4', avatar: 'CW', role: 'Dad' },
  { id: 'tyra' as const, name: 'Tyra', color: '#D24CE1', avatar: 'TW', role: 'Mom' },
  { id: 'nama' as const, name: 'Nama', color: '#F4C542', avatar: 'NW', role: 'Grandmother' },
  { id: 'pops' as const, name: 'Pops', color: '#7CC576', avatar: 'PW', role: 'Grandfather' },
  { id: 'wyatt' as const, name: 'Wyatt', color: '#FF8A65', avatar: 'WW', role: 'Son (12)' },
  { id: 'adelaide' as const, name: 'Adelaide', color: '#9575CD', avatar: 'AW', role: 'Daughter (9)' },
  { id: 'ellis' as const, name: 'Ellis', color: '#4DD0E1', avatar: 'EW', role: 'Son (7)' },
  { id: 'beckett' as const, name: 'Beckett', color: '#F06292', avatar: 'BW', role: 'Son (5)' },
];

// Export with lowercase name for component imports
export const familyMembers = FAMILY_MEMBERS;

export const MEMBER_NAMES = {
  charlie: 'Charlie',
  tyra: 'Tyra',
  nama: 'Nama',
  pops: 'Pops',
  wyatt: 'Wyatt',
  adelaide: 'Adelaide',
  ellis: 'Ellis',
  beckett: 'Beckett',
} as const;

export const MEMBER_COLORS = {
  charlie: '#00BCD4',
  tyra: '#D24CE1',
  nama: '#F4C542',
  pops: '#7CC576',
  wyatt: '#FF8A65',
  adelaide: '#9575CD',
  ellis: '#4DD0E1',
  beckett: '#F06292',
} as const;

export const VIEW_TITLES = {
  'all-family': 'All Family Feed',
  'member-overview': 'Member Overview',
  'calendar-week': 'Calendar Week',
  'calendar-list': 'Calendar List',
  'tasks-board': 'Tasks Board',
  'ride-requests': 'Ride Requests',
  'messages': 'Messages & Reminders',
  'settings': 'Settings',
} as const;