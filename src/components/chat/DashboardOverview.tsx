import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Calendar, CheckSquare, Car, Clock, Users, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStats {
  upcomingEvents: number;
  pendingTasks: number;
  rideRequests: number;
  activeMembers: number;
}

export const DashboardOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    upcomingEvents: 0,
    pendingTasks: 0,
    rideRequests: 0,
    activeMembers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { household } = useHousehold();

  useEffect(() => {
    const loadDashboardStats = async () => {
      if (!household?.id) return;

      try {
        setIsLoading(true);
        
        // Get upcoming events (next 7 days)
        const { data: events } = await supabase.rpc('exec_sql', {
          query_text: `
            SELECT COUNT(*) as count
            FROM app.calendar_events 
            WHERE household_id = '${household.id}' 
              AND event_date >= CURRENT_DATE 
              AND event_date <= CURRENT_DATE + INTERVAL '7 days'
          `
        });

        // Get pending tasks
        const { data: tasks } = await supabase.rpc('exec_sql', {
          query_text: `
            SELECT COUNT(*) as count
            FROM app.tasks 
            WHERE household_id = '${household.id}' 
              AND status IN ('todo', 'in_progress')
          `
        });

        // Get pending ride requests
        const { data: rides } = await supabase.rpc('exec_sql', {
          query_text: `
            SELECT COUNT(*) as count
            FROM app.ride_requests 
            WHERE household_id = '${household.id}' 
              AND status = 'pending'
          `
        });

        // Get active members count
        const { data: members } = await supabase.rpc('exec_sql', {
          query_text: `
            SELECT COUNT(DISTINCT person_id) as count
            FROM app.calendar_events 
            WHERE household_id = '${household.id}' 
              AND event_date >= CURRENT_DATE - INTERVAL '30 days'
          `
        });

        setStats({
          upcomingEvents: events?.[0]?.count || 0,
          pendingTasks: tasks?.[0]?.count || 0,
          rideRequests: rides?.[0]?.count || 0,
          activeMembers: members?.[0]?.count || 0
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardStats();
  }, [household?.id]);

  const dashboardCards = [
    {
      title: 'Upcoming Events',
      value: stats.upcomingEvents,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      description: 'Next 7 days'
    },
    {
      title: 'Pending Tasks',
      value: stats.pendingTasks,
      icon: CheckSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      description: 'To do & in progress'
    },
    {
      title: 'Ride Requests',
      value: stats.rideRequests,
      icon: Car,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      description: 'Awaiting driver'
    },
    {
      title: 'Active Members',
      value: stats.activeMembers,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      description: 'This month'
    }
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">Family Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-muted/20 border-t border-border">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Family Overview</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardCards.map((card, index) => {
          const Icon = card.icon;
          const hasAlert = card.title === 'Pending Tasks' && card.value > 5;
          
          return (
            <Card key={index} className="relative transition-all duration-200 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("p-2 rounded-lg", card.bgColor)}>
                    <Icon className={cn("h-4 w-4", card.color)} />
                  </div>
                  {hasAlert && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">
                      {card.value}
                    </span>
                    {hasAlert && (
                      <Badge variant="destructive" className="text-xs">
                        High
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};