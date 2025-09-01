import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { MessageSquare, Bell, Clock, User, AlertTriangle } from 'lucide-react';
import { useModalStore } from '../../src/stores/modalProvider';
import { familyMembers } from '../../constants/family';
import { dataClient } from '../../src/services/supabaseDataClient';
import { toast } from '../ui/simple-toast';
import { MemberId } from '../../src/types';

export function MessageModal() {
  const { 
    activeModal, 
    modalData, 
    messageFormData, 
    setMessageFormData, 
    closeModal, 
    resetFormData 
  } = useModalStore();

  const isOpen = activeModal === 'sendMessage' || activeModal === 'addReminder' || activeModal === 'editReminder';
  const isReminder = activeModal === 'addReminder' || activeModal === 'editReminder';
  const isEditing = activeModal === 'editReminder';
  
  const [selectedRecipients, setSelectedRecipients] = useState<MemberId[]>([]);

  useEffect(() => {
    if (isOpen && isEditing && modalData) {
      // Pre-populate form with existing reminder data
      setMessageFormData({
        type: 'reminder',
        title: modalData.title || '',
        content: modalData.content || '',
        recipients: modalData.recipients || [],
        urgent: modalData.urgent || false,
        priority: modalData.priority || 'medium',
        due_time: modalData.due_time || ''
      });
      setSelectedRecipients(modalData.recipients || []);
    } else if (isOpen && !isEditing) {
      // Reset form for new message/reminder
      setMessageFormData({
        type: isReminder ? 'reminder' : 'message',
        title: '',
        content: '',
        recipients: [],
        urgent: false,
        priority: 'medium'
      });
      setSelectedRecipients([]);
    }
  }, [isOpen, isEditing, isReminder, modalData, setMessageFormData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageFormData.content || selectedRecipients.length === 0) {
      toast.error('Please fill in required fields and select recipients');
      return;
    }

    try {
      const messageData = {
        ...messageFormData,
        recipients: selectedRecipients
      };

      if (isEditing && modalData?.id) {
        // Update existing reminder
        await dataClient.updateMessage(modalData.id, messageData);
        toast.success('Reminder updated successfully');
      } else {
        // Create new message or reminder
        await dataClient.createMessage(messageData);
        toast.success(isReminder ? 'Reminder created successfully' : 'Message sent successfully');
      }
      
      closeModal();
      resetFormData();
      setSelectedRecipients([]);
      
      // Trigger a refresh of the current page
      window.location.reload();
    } catch (error) {
      console.error('Failed to save message:', error);
      toast.error('Failed to save message. Please try again.');
    }
  };

  const handleClose = () => {
    closeModal();
    resetFormData();
    setSelectedRecipients([]);
  };

  const toggleRecipient = (memberId: MemberId) => {
    setSelectedRecipients(prev => {
      const isSelected = prev.includes(memberId);
      if (isSelected) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const selectAllRecipients = () => {
    const allMemberIds = familyMembers.map(m => m.id);
    setSelectedRecipients(allMemberIds);
  };

  const clearAllRecipients = () => {
    setSelectedRecipients([]);
  };

  const getMemberColor = (memberId: MemberId) => {
    return `var(--member-${memberId})`;
  };

  const getModalTitle = () => {
    if (isEditing) return 'Edit Reminder';
    if (isReminder) return 'Add Reminder';
    return 'Send Message';
  };

  const getModalIcon = () => {
    if (isReminder) return <Bell className="w-5 h-5" />;
    return <MessageSquare className="w-5 h-5" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getModalIcon()}
            {getModalTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Message Type */}
          {!isEditing && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type</Label>
              <Select 
                value={messageFormData.type} 
                onValueChange={(value: 'message' | 'announcement' | 'reminder') => 
                  setMessageFormData({ type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-3 h-3" />
                      Message
                    </span>
                  </SelectItem>
                  <SelectItem value="announcement">
                    <span className="flex items-center gap-2">
                      <Bell className="w-3 h-3" />
                      Announcement
                    </span>
                  </SelectItem>
                  <SelectItem value="reminder">
                    <span className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Reminder
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title (for reminders and announcements) */}
          {(messageFormData.type === 'reminder' || messageFormData.type === 'announcement') && (
            <div className="space-y-2">
              <Label htmlFor="message-title" className="text-sm font-medium">
                Title
              </Label>
              <Input
                id="message-title"
                placeholder="Enter title"
                value={messageFormData.title}
                onChange={(e) => setMessageFormData({ title: e.target.value })}
              />
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="message-content" className="text-sm font-medium">
              {messageFormData.type === 'reminder' ? 'Reminder Details *' : 'Message *'}
            </Label>
            <Textarea
              id="message-content"
              placeholder={
                messageFormData.type === 'reminder' 
                  ? "What needs to be remembered?" 
                  : "Type your message..."
              }
              value={messageFormData.content}
              onChange={(e) => setMessageFormData({ content: e.target.value })}
              rows={3}
              required
            />
          </div>

          {/* Due Time (for reminders) */}
          {messageFormData.type === 'reminder' && (
            <div className="space-y-2">
              <Label htmlFor="due-time" className="text-sm font-medium flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due Time
              </Label>
              <Input
                id="due-time"
                type="datetime-local"
                value={messageFormData.due_time}
                onChange={(e) => setMessageFormData({ due_time: e.target.value })}
              />
            </div>
          )}

          {/* Priority */}
          {messageFormData.type === 'reminder' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority</Label>
              <Select 
                value={messageFormData.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high') => setMessageFormData({ priority: value })}
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
          )}

          {/* Recipients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1">
                <User className="w-3 h-3" />
                Send To *
              </Label>
              <div className="flex gap-1">
                <Button 
                  type="button" 
                  size="sm" 
                  variant="ghost" 
                  onClick={selectAllRecipients}
                  className="h-6 text-xs"
                >
                  All
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="ghost" 
                  onClick={clearAllRecipients}
                  className="h-6 text-xs"
                >
                  None
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
              {familyMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`recipient-${member.id}`}
                    checked={selectedRecipients.includes(member.id)}
                    onCheckedChange={() => toggleRecipient(member.id)}
                  />
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getMemberColor(member.id) }}
                    />
                    <Label 
                      htmlFor={`recipient-${member.id}`} 
                      className="text-sm cursor-pointer"
                    >
                      {member.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Urgent checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="urgent"
              checked={messageFormData.urgent}
              onCheckedChange={(checked) => setMessageFormData({ urgent: !!checked })}
            />
            <Label htmlFor="urgent" className="text-sm flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-orange-500" />
              Mark as urgent
            </Label>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isEditing ? 'Update' : (isReminder ? 'Create Reminder' : 'Send Message')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}