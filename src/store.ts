import { create } from 'zustand';
import { MemberId, MemberIdOrAll, TimeFilter, TypeFilter } from './types';

interface AppStore {
  selectedMember: MemberIdOrAll;
  timeFilter: TimeFilter;
  typeFilter: TypeFilter;
  
  setSelectedMember: (member: MemberIdOrAll) => void;
  setTimeFilter: (filter: TimeFilter) => void;
  setTypeFilter: (filter: TypeFilter) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  selectedMember: 'all',
  timeFilter: 'next7',
  typeFilter: 'all',
  
  setSelectedMember: (member) => set({ selectedMember: member }),
  setTimeFilter: (filter) => set({ timeFilter: filter }),
  setTypeFilter: (filter) => set({ typeFilter: filter }),
}));