import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { AlertTriangle, Trash2, Check } from 'lucide-react';
import { useModalStore } from '../../src/stores/modalProvider';
import { toast } from '../ui/simple-toast';

interface ConfirmationData {
  type: 'delete' | 'confirm' | 'warning';
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => Promise<void> | void;
  variant?: 'destructive' | 'default';
}

export function ConfirmationModal() {
  const { activeModal, modalData, closeModal } = useModalStore();
  
  const isOpen = activeModal === 'confirmDelete';
  const data = modalData as ConfirmationData;

  if (!data) return null;

  const handleConfirm = async () => {
    try {
      await data.onConfirm();
      closeModal();
      toast.success('Action completed successfully');
    } catch (error) {
      console.error('Confirmation action failed:', error);
      toast.error('Action failed. Please try again.');
    }
  };

  const handleCancel = () => {
    closeModal();
  };

  const getIcon = () => {
    switch (data.type) {
      case 'delete':
        return <Trash2 className="w-5 h-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'confirm':
      default:
        return <Check className="w-5 h-5 text-success" />;
    }
  };

  const getButtonVariant = () => {
    if (data.variant === 'destructive' || data.type === 'delete') {
      return 'destructive';
    }
    return 'default';
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {getIcon()}
            {data.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {data.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {data.cancelText || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              getButtonVariant() === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {data.confirmText || 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Helper function to open confirmation dialogs
export const openConfirmationDialog = (
  openModal: (type: any, data: any) => void,
  options: {
    type?: 'delete' | 'confirm' | 'warning';
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => Promise<void> | void;
    variant?: 'destructive' | 'default';
  }
) => {
  openModal('confirmDelete', {
    type: options.type || 'confirm',
    title: options.title,
    description: options.description,
    confirmText: options.confirmText,
    cancelText: options.cancelText,
    onConfirm: options.onConfirm,
    variant: options.variant
  });
};