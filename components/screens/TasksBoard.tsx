import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Plus, MoreHorizontal, Clock, User, CheckSquare } from 'lucide-react';
import { useAppStore } from '../../src/store';
import { dataClient } from '../../src/services/dataAdapter';
import { Task, MemberId, MemberIdOrAll } from '../../src/types';
import { familyMembers } from '../../constants/family';
import { useModalStore } from '../../src/stores/modalProvider';

const TASK_STATUSES = ['todo', 'in-progress', 'done'] as const;
const STATUS_LABELS = {
  'todo': 'To Do',
  'in-progress': 'In Progress', 
  'done': 'Done'
} as const;

export function TasksBoard() {
  const params = useParams();
  const { selectedMember } = useAppStore();
  const { openModal } = useModalStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine if we're viewing a specific member's tasks
  const currentMemberId: MemberIdOrAll = (params.id as MemberId) || selectedMember;
  const isIndividualView = currentMemberId !== 'all';

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const allTasks = await dataClient.getTasks();
      
      // Filter tasks for current member if individual view
      const filteredTasks = (allTasks || []).filter(task => {
        if (isIndividualView) {
          return task.member === (currentMemberId as MemberId);
        }
        return true;
      });

      setTasks(filteredTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: 'todo' | 'in-progress' | 'done') => {
    try {
      await dataClient.updateTask(taskId, { status: newStatus });
      
      // Optimistic update
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      ));
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    openModal('editTask', task);
  };

  const handleAddTask = (status?: 'todo' | 'in-progress' | 'done') => {
    const defaultMember: MemberId = isIndividualView 
      ? (currentMemberId as MemberId) 
      : 'charlie';
    openModal('addTask', { 
      member: defaultMember,
      status: status || 'todo'
    });
  };

  const getMemberName = (memberId: MemberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    return member?.name || memberId;
  };

  const getMemberColor = (memberId: MemberId) => {
    return `var(--member-${memberId})`;
  };

  const getMemberInitials = (memberId: MemberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    return member ? member.name.split(' ').map(n => n[0]).join('').toUpperCase() : memberId.slice(0, 2).toUpperCase();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getTasksByStatus = (status: typeof TASK_STATUSES[number]) => {
    return tasks.filter(task => task.status === status);
  };

  const currentMember = familyMembers.find(m => m.id === currentMemberId);
  const pageTitle = isIndividualView && currentMember 
    ? `${currentMember.name}'s Tasks`
    : 'Family Tasks Board';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Board Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isIndividualView && currentMember && (
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: getMemberColor(currentMember.id) }}
              aria-label={`${currentMember.name}'s color`}
            />
          )}
          <div>
            <h1 className="text-2xl">{pageTitle}</h1>
            <p className="text-sm text-muted-foreground">
              {isIndividualView 
                ? `Manage ${currentMember?.name}'s tasks and projects`
                : 'Manage tasks across all family members'
              }
            </p>
          </div>
        </div>
        <Button 
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-primary"
          aria-label="Create new task"
          onClick={() => handleAddTask()}
        >
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] overflow-hidden">
        {TASK_STATUSES.map((status) => {
          const statusTasks = getTasksByStatus(status);
          return (
            <Card key={status} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CheckSquare className="w-4 h-4" />
                    {STATUS_LABELS[status]}
                  </CardTitle>
                  <div className="flex items-center space-x-1">
                    <Badge variant="secondary" className="text-xs">
                      {statusTasks.length}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      aria-label={`Add task to ${STATUS_LABELS[status]}`}
                      onClick={() => handleAddTask(status)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pt-0">
                <div className="space-y-3">
                  {statusTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No {STATUS_LABELS[status].toLowerCase()} tasks</p>
                    </div>
                  ) : (
                    statusTasks.map((task) => (
                      <Card 
                        key={task.id} 
                        className="group cursor-pointer hover:shadow-sm transition-shadow"
                        onClick={() => handleEditTask(task)}
                      >
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                aria-label="Task options"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTask(task);
                                }}
                              >
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </div>
                            
                            {task.checklist && task.checklist.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {task.checklist.filter(item => item.done).length}/{task.checklist.length} completed
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{formatDate(task.due_date)}</span>
                              </div>
                              
                              {!isIndividualView && (
                                <div className="flex items-center space-x-1">
                                  <Avatar 
                                    className="w-5 h-5" 
                                    style={{ backgroundColor: getMemberColor(task.member) }}
                                  >
                                    <AvatarFallback className="text-white text-xs">
                                      {getMemberInitials(task.member)}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              )}
                            </div>

                            {/* Status change buttons */}
                            <div className="flex gap-1 mt-2">
                              {TASK_STATUSES.filter(s => s !== status).map(newStatus => (
                                <Button
                                  key={newStatus}
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskStatusChange(task.id, newStatus);
                                  }}
                                >
                                  Move to {STATUS_LABELS[newStatus]}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}