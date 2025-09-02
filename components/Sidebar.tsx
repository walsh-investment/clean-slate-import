import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, CheckSquare, Car, MessageSquare, Settings, Users, Clock, List, LogOut, Bot } from 'lucide-react';
import { familyMembers } from '../constants/family';
import { useAppStore } from '../src/store';
import { useAuth } from '../src/contexts/AuthContext';
import { MemberId } from '../src/types';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { selectedMember, setSelectedMember } = useAppStore();
  const { signOut, user } = useAuth();

  const navigationItems = [
    { 
      id: 'all-family', 
      label: 'All Family', 
      icon: Users, 
      path: '/' 
    },
    { 
      id: 'calendar-week', 
      label: 'Calendar Week', 
      icon: Calendar, 
      path: '/calendar/week' 
    },
    { 
      id: 'calendar-list', 
      label: 'Calendar List', 
      icon: List, 
      path: '/calendar/list' 
    },
    { 
      id: 'tasks-board', 
      label: 'Tasks Board', 
      icon: CheckSquare, 
      path: '/tasks' 
    },
    { 
      id: 'ride-requests', 
      label: 'Ride Requests', 
      icon: Car, 
      path: '/rides' 
    },
    { 
      id: 'messages', 
      label: 'Messages & Reminders', 
      icon: MessageSquare, 
      path: '/messages' 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      path: '/settings' 
    }
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const isMemberPath = location.pathname.startsWith('/member/');
  const currentMemberId = isMemberPath ? location.pathname.split('/')[2] : null;

  const handleMemberClick = (memberId: MemberId) => {
    setSelectedMember(memberId);
  };

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl text-sidebar-foreground">Niles</h1>
        <p className="text-sm text-sidebar-foreground/60">Walsh Family Organizer</p>
        {user && (
          <p className="text-xs text-sidebar-foreground/40 mt-1">
            Welcome, {user.user_metadata?.display_name || user.email}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto">
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                  focus:outline-none focus:ring-2 focus:ring-sidebar-ring
                  ${active 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Family Members */}
        <div className="px-4 pb-4">
          <div className="mb-3">
            <h3 className="text-xs uppercase tracking-wider text-sidebar-foreground/60 px-3">
              Family Members
            </h3>
          </div>
          <div className="space-y-1">
            {familyMembers.map((member) => {
              const isSelected = currentMemberId === member.id;
              
              return (
                <Link
                  key={member.id}
                  to={`/member/${member.id}`}
                  onClick={() => handleMemberClick(member.id)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                    focus:outline-none focus:ring-2 focus:ring-sidebar-ring
                    ${isSelected 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    }
                  `}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `var(--member-${member.id})` }}
                  />
                  <span className="text-sm">{member.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
};