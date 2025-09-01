import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CheckSquare, Plus, X, Calendar, User } from 'lucide-react';
import { useModalStore } from '../../src/stores/modalProvider';
import { familyMembers } from '../../constants/family';
import { dataClient } from '../../src/services/supabaseDataClient';
import { toast } from '../ui/simple-toast';
import { MemberId } from '../../src/types';

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export function TaskModal() {
  const { 
    activeModal, 
    modalData, 
    taskFormData, 
    setTaskFormData, 
    closeModal, 
    resetFormData 
  } = useModalStore();

  const isOpen = activeModal === 'addTask' || activeModal === 'editTask';
  const isEditing = activeModal === 'editTask';
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  useEffect(() => {
    if (isOpen && isEditing && modalData) {
      // Pre-populate form with existing task data
      setTaskFormData({
        id: modalData.id,
        title: modalData.title,
        description: modalData.description || '',
        member: modalData.member,
        due_date: modalData.due_date || '',
        priority: modalData.priority,
        status: modalData.status,
        category: modalData.category || ''
      });
      setChecklist(modalData.checklist || []);
    } else if (isOpen && !isEditing) {
      // Reset form for new task
      setTaskFormData({
        title: '',
        description: '',
        member: 'charlie',
        priority: 'medium',
        status: 'todo',
        category: ''
      });
      setChecklist([]);
    }
  }, [isOpen, isEditing, modalData, setTaskFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskFormData.title || !taskFormData.member) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const taskData = {
        ...taskFormData,
        checklist: checklist.length > 0 ? checklist : undefined
      };

      if (isEditing && taskFormData.id) {
        await dataClient.updateTask(taskFormData.id, taskData);
        toast.success('Task updated successfully');
      } else {
        await dataClient.createTask(taskData);
        toast.success('Task created successfully');
      }
      
      closeModal();
      resetFormData();
      setChecklist([]);
      
      // Trigger a refresh of the current page
      window.location.reload();
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error('Failed to save task. Please try again.');
    }
  };

  const handleClose = () => {
    closeModal();
    resetFormData();
    setChecklist([]);
    setNewChecklistItem('');
  };

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: newChecklistItem.trim(),
      done: false
    };
    
    setChecklist([...checklist, newItem]);
    setNewChecklistItem('');
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item => 
      item.id === id ? { ...item, done: !item.done } : item
    ));
  };

  const getMemberColor = (memberId: MemberId) => {
    return `var(--member-${memberId})`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            {isEditing ? 'Edit Task' : 'Add New Task'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-sm font-medium">
              Task Title *
            </Label>
            <Input
              id="task-title"
              placeholder="Enter task title"
              value={taskFormData.title}
              onChange={(e) => setTaskFormData({ title: e.target.value })}
              required
            />
          </div>

          {/* Assigned To & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assigned To *</Label>
              <Select 
                value={taskFormData.member} 
                onValueChange={(value: MemberId) => setTaskFormData({ member: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {familyMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getMemberColor(member.id) }}
                        />
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Select 
                value={taskFormData.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high') => setTaskFormData({ priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Low
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      High
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="due-date" className="text-sm font-medium">
                Due Date
              </Label>
              <Input
                id="due-date"
                type="date"
                value={taskFormData.due_date}
                onChange={(e) => setTaskFormData({ due_date: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select 
                value={taskFormData.status} 
                onValueChange={(value: 'todo' | 'in-progress' | 'done') => setTaskFormData({ status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Select 
              value={taskFormData.category || 'none'} 
              onValueChange={(value) => setTaskFormData({ category: value === 'none' ? '' : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                <SelectItem value="household">Household</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="errands">Errands</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Task details (optional)"
              value={taskFormData.description}
              onChange={(e) => setTaskFormData({ description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Checklist</Label>
            
            {/* Add new checklist item */}
            <div className="flex gap-2">
              <Input
                placeholder="Add checklist item"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
              />
              <Button 
                type="button" 
                size="sm" 
                onClick={addChecklistItem}
                disabled={!newChecklistItem.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Existing checklist items */}
            {checklist.length > 0 && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleChecklistItem(item.id)}
                      className="rounded"
                    />
                    <span className={`flex-1 text-sm ${item.done ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeChecklistItem(item.id)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isEditing ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}