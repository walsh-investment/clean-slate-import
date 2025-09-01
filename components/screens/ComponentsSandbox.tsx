import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { EventRow } from '../EventRow';
import { TaskCard } from '../TaskCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { familyMembers } from '../../constants/family';
import { Event, Task, EventVariant, EventDensity, TaskStatus } from '../../src/types';

export const ComponentsSandbox: React.FC = () => {
  // Sample data for component previews
  const sampleEvent: Event = {
    id: 'sample-event',
    event_date: '2024-08-15',
    start_time: '10:00',
    end_time: '11:30',
    member: 'charlie',
    title: 'Soccer Practice',
    location: 'Athletic Fields',
    source: 'ui'
  };

  const sampleRideNeededEvent: Event = {
    ...sampleEvent,
    id: 'ride-needed-event',
    title: 'Piano Lesson',
    location: 'Music Academy'
  };

  const sampleOverdueEvent: Event = {
    ...sampleEvent,
    id: 'overdue-event',
    event_date: '2024-08-10',
    title: 'Doctor Appointment',
    location: 'Family Health Center'
  };

  const sampleTask: Task = {
    id: 'sample-task',
    member: 'tyra',
    title: 'Complete math homework',
    due_date: '2024-08-16',
    status: 'todo'
  };

  const sampleTaskWithChecklist: Task = {
    id: 'checklist-task',
    member: 'wyatt',
    title: 'Prepare for camping trip',
    due_date: '2024-08-20',
    status: 'in-progress',
    checklist: [
      { id: 'item-1', label: 'Pack sleeping bag', done: true },
      { id: 'item-2', label: 'Prepare snacks', done: false },
      { id: 'item-3', label: 'Check weather forecast', done: false }
    ]
  };

  const eventVariants: { variant: EventVariant; label: string; event: Event }[] = [
    { variant: 'assigned', label: 'Assigned', event: { ...sampleEvent, driver_name: 'nama' } },
    { variant: 'ride-needed', label: 'Ride Needed', event: sampleRideNeededEvent },
    { variant: 'overdue', label: 'Overdue', event: sampleOverdueEvent }
  ];

  const eventDensities: EventDensity[] = ['compact', 'regular'];
  
  const taskStatuses: { status: TaskStatus; label: string }[] = [
    { status: 'todo', label: 'To Do' },
    { status: 'in-progress', label: 'In Progress' },
    { status: 'done', label: 'Done' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl mb-2">Components Sandbox</h1>
        <p className="text-muted-foreground">
          Preview all component variants and states for development and testing.
        </p>
      </div>

      {/* Event Row Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Event Row Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {eventVariants.map(({ variant, label, event }) => (
            <div key={variant}>
              <h4 className="mb-3">{label}</h4>
              <div className="space-y-2">
                {eventDensities.map((density) => (
                  <div key={density} className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      {density}
                    </span>
                    <EventRow event={event} variant={variant} density={density} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Task Card Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Task Card Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {taskStatuses.map(({ status, label }) => (
            <div key={status}>
              <h4 className="mb-3">{label}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                    Basic Task
                  </span>
                  <TaskCard task={{ ...sampleTask, status }} />
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                    With Checklist
                  </span>
                  <TaskCard task={{ ...sampleTaskWithChecklist, status }} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Member Color Chips */}
      <Card>
        <CardHeader>
          <CardTitle>Member Color Chips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {familyMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: `var(--member-${member.id})` }}
                />
                <span className="text-sm">{member.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Status Badges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2">Task Status</h4>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                To Do
              </Badge>
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                In Progress
              </Badge>
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                Done
              </Badge>
            </div>
          </div>
          
          <div>
            <h4 className="mb-2">Ride Status</h4>
            <div className="flex gap-2">
              <Badge variant="destructive" className="bg-danger text-white">
                Ride Needed
              </Badge>
              <Badge variant="secondary" className="bg-info/10 text-info border-info/20">
                Ride Offered
              </Badge>
              <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                Ride Assigned
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Button States */}
      <Card>
        <CardHeader>
          <CardTitle>Button States</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-primary">
              Primary
            </Button>
            <Button variant="secondary" className="focus:ring-2 focus:ring-primary">
              Secondary
            </Button>
            <Button variant="outline" className="focus:ring-2 focus:ring-primary">
              Outline
            </Button>
            <Button variant="ghost" className="focus:ring-2 focus:ring-primary">
              Ghost
            </Button>
            <Button variant="destructive" className="focus:ring-2 focus:ring-destructive">
              Destructive
            </Button>
          </div>
          
          <div className="flex gap-2 items-center">
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};