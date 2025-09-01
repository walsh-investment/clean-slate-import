import React, { useState } from 'react';
import { Check, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Task, TaskStatus, MemberId } from '../src/types';
import { familyMembers } from '../constants/family';
import { formatDate, isOverdue } from '../src/utils/dates';

interface TaskCardProps {
  task: Task;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onChecklistToggle?: (taskId: string, itemId: string) => void;
  compact?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onStatusChange,
  onChecklistToggle,
  compact = false 
}) => {
  const [showChecklist, setShowChecklist] = useState(false);
  const member = familyMembers.find(m => m.id === task.member);
  const hasChecklist = task.checklist && task.checklist.length > 0;
  const completedItems = task.checklist?.filter(item => item.done).length || 0;
  const totalItems = task.checklist?.length || 0;
  const isTaskOverdue = task.due_date && isOverdue(task.due_date);

  const getStatusBadge = () => {
    switch (task.status) {
      case 'todo':
        return (
          <Badge 
            variant="secondary" 
            className="bg-slate-100 text-slate-700"
            aria-label="Task status: to do"
          >
            To Do
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge 
            variant="secondary" 
            className="bg-warning/10 text-warning border-warning/20"
            aria-label="Task status: in progress"
          >
            In Progress
          </Badge>
        );
      case 'done':
        return (
          <Badge 
            variant="secondary" 
            className="bg-success/10 text-success border-success/20"
            aria-label="Task status: completed"
          >
            Done
          </Badge>
        );
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (onStatusChange) {
      onStatusChange(task.id, newStatus);
    }
  };

  const handleChecklistItemToggle = (itemId: string) => {
    if (onChecklistToggle) {
      onChecklistToggle(task.id, itemId);
    }
  };

  return (
    <div 
      className={`
        bg-card border border-border rounded-lg p-4 space-y-3
        ${isTaskOverdue && task.status !== 'done' ? 'border-danger/30' : ''}
        ${task.status === 'done' ? 'opacity-75' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: `var(--member-${task.member})` }}
            aria-label={`${member?.name || 'Unknown member'}'s task`}
          />
          
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm text-foreground ${task.status === 'done' ? 'line-through' : ''}`}>
              {task.title}
            </h3>
            
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge()}
              
              {task.due_date && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className={isTaskOverdue && task.status !== 'done' ? 'text-danger' : ''}>
                    Due {formatDate(task.due_date)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {task.status !== 'done' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleStatusChange('done')}
              className="p-1 h-auto focus:ring-2 focus:ring-primary"
              aria-label={`Mark "${task.title}" as complete`}
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          
          {hasChecklist && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowChecklist(!showChecklist)}
              className="p-1 h-auto focus:ring-2 focus:ring-primary"
              aria-label={`${showChecklist ? 'Hide' : 'Show'} checklist for "${task.title}"`}
              aria-expanded={showChecklist}
            >
              {showChecklist ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Checklist Progress */}
      {hasChecklist && (
        <div className="text-xs text-muted-foreground">
          {completedItems} of {totalItems} completed
        </div>
      )}

      {/* Checklist Items */}
      {hasChecklist && showChecklist && (
        <div className="space-y-2 pt-2 border-t border-border">
          {task.checklist!.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Checkbox
                id={`checklist-${task.id}-${item.id}`}
                checked={item.done}
                onCheckedChange={() => handleChecklistItemToggle(item.id)}
                className="focus:ring-2 focus:ring-primary"
                aria-describedby={`checklist-${task.id}-${item.id}-label`}
              />
              <label
                id={`checklist-${task.id}-${item.id}-label`}
                htmlFor={`checklist-${task.id}-${item.id}`}
                className={`text-xs flex-1 cursor-pointer ${item.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}
              >
                {item.text}
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Status Actions */}
      {!compact && task.status !== 'done' && (
        <div className="flex gap-2 pt-2 border-t border-border">
          {task.status === 'todo' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange('in-progress')}
              className="text-xs focus:ring-2 focus:ring-primary"
              aria-label={`Start working on "${task.title}"`}
            >
              Start
            </Button>
          )}
          
          {task.status === 'in-progress' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('todo')}
                className="text-xs focus:ring-2 focus:ring-primary"
                aria-label={`Move "${task.title}" back to to-do`}
              >
                Move to To Do
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange('done')}
                className="text-xs focus:ring-2 focus:ring-primary"
                aria-label={`Complete "${task.title}"`}
              >
                Complete
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
};