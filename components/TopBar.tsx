import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Bell, Search, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAppStore } from '../src/store';
import { useModalStore } from '../src/stores/modalStore';
import { familyMembers } from '../constants/family';

export const TopBar: React.FC = () => {
  const location = useLocation();
  const params = useParams();
  const { selectedMember } = useAppStore();
  const { openModal } = useModalStore();

  const getPageTitle = () => {
    const path = location.pathname;
    
    if (path === '/') return 'All Family';
    if (path.startsWith('/member/')) {
      const memberId = params.id;
      const member = familyMembers.find(m => m.id === memberId);
      return member ? `${member.name}'s Overview` : 'Member Overview';
    }
    if (path === '/calendar/week') return 'Calendar Week';
    if (path === '/calendar/list') return 'Calendar List';
    if (path === '/tasks') return 'Tasks Board';
    if (path === '/rides') return 'Ride Requests';
    if (path === '/messages') return 'Messages & Reminders';
    if (path === '/settings') return 'Settings';
    if (path === '/sandbox') return 'Components Sandbox';
    
    return 'Niles';
  };

  const getQuickActions = () => {
    const path = location.pathname;
    
    if (path === '/' || path.startsWith('/member/')) {
      return [
        { label: 'Add Event', action: () => openModal('addEvent') },
        { label: 'Add Task', action: () => openModal('addTask') }
      ];
    }
    
    if (path.startsWith('/calendar/')) {
      return [
        { label: 'Add Event', action: () => openModal('addEvent') }
      ];
    }
    
    if (path === '/tasks') {
      return [
        { label: 'Add Task', action: () => openModal('addTask') }
      ];
    }
    
    if (path === '/rides') {
      return [
        { label: 'Request Ride', action: () => openModal('addRideRequest') }
      ];
    }
    
    if (path === '/messages') {
      return [
        { label: 'Compose', action: () => openModal('sendMessage') },
        { label: 'Add Reminder', action: () => openModal('addReminder') }
      ];
    }
    
    return [];
  };

  const quickActions = getQuickActions();

  return (
    <div className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg text-foreground">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-10 w-64 bg-input-background border-border focus:ring-2 focus:ring-primary focus:border-transparent"
            aria-label="Search events, tasks, and family activities"
          />
        </div>

        {/* Quick Actions */}
        {quickActions.map((action, index) => (
          <Button
            key={index}
            onClick={action.action}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={action.label}
          >
            <Plus className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        ))}

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hover:bg-accent focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="View notifications"
        >
          <Bell className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};