import React from 'react';
import { useModalStore } from '../../src/stores/modalProvider';
import { EventModal } from './EventModal';
import { TaskModal } from './TaskModal';
import { RideRequestModal } from './RideRequestModal';
import { MessageModal } from './MessageModal';
import { AssignDriverModal } from './AssignDriverModal';
import { ConfirmationModal } from './ConfirmationModal';

export function ModalRenderer() {
  const { activeModal } = useModalStore();

  if (!activeModal) return null;

  const renderModal = () => {
    switch (activeModal) {
      case 'addEvent':
      case 'editEvent':
        return <EventModal />;
      case 'addTask':
      case 'editTask':
        return <TaskModal />;
      case 'addRideRequest':
      case 'editRideRequest':
        return <RideRequestModal />;
      case 'sendMessage':
      case 'addReminder':
      case 'editReminder':
        return <MessageModal />;
      case 'assignDriver':
        return <AssignDriverModal />;
      case 'confirmDelete':
        return <ConfirmationModal />;
      default:
        return null;
    }
  };

  return renderModal();
}

// Re-export individual modals if needed elsewhere
export { EventModal } from './EventModal';
export { TaskModal } from './TaskModal';
export { RideRequestModal } from './RideRequestModal';
export { MessageModal } from './MessageModal';
export { AssignDriverModal } from './AssignDriverModal';
export { ConfirmationModal } from './ConfirmationModal';