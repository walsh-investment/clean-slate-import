import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MemberId } from '../types';

export interface EventFormData {
  id?: string;
  title: string;
  description?: string;
  member: MemberId;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  driver_name?: MemberId;
  source?: 'manual' | 'email';
}

export interface TaskFormData {
  id?: string;
  title: string;
  description?: string;
  member: MemberId;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  category?: string;
  checklist?: Array<{ id: string; text: string; done: boolean }>;
}

export interface RideRequestFormData {
  id?: string;
  title: string;
  requester: MemberId;
  destination: string;
  pickup_location?: string;
  pickup_time: string;
  return_time?: string;
  event_date: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed';
  driver_name?: MemberId;
}

export interface MessageFormData {
  type: 'message' | 'announcement' | 'reminder';
  title?: string;
  content: string;
  recipients: MemberId[];
  urgent?: boolean;
  priority?: 'low' | 'medium' | 'high';
  due_time?: string;
}

type ModalType =
  | 'addEvent'
  | 'editEvent'
  | 'addTask'
  | 'editTask'
  | 'addRideRequest'
  | 'editRideRequest'
  | 'assignDriver'
  | 'sendMessage'
  | 'addReminder'
  | 'editReminder'
  | 'confirmDelete'
  | 'memberSelect'
  | null;

interface ModalContextType {
  // Modal state
  activeModal: ModalType;
  modalData: any;
  
  // Form data
  eventFormData: EventFormData;
  taskFormData: TaskFormData;
  rideRequestFormData: RideRequestFormData;
  messageFormData: MessageFormData;
  
  // Actions
  openModal: (type: ModalType, data?: any) => void;
  closeModal: () => void;
  setEventFormData: (data: Partial<EventFormData>) => void;
  setTaskFormData: (data: Partial<TaskFormData>) => void;
  setRideRequestFormData: (data: Partial<RideRequestFormData>) => void;
  setMessageFormData: (data: Partial<MessageFormData>) => void;
  resetFormData: () => void;
}

const initialEventFormData: EventFormData = {
  title: '',
  description: '',
  member: 'charlie',
  event_date: new Date().toISOString().split('T')[0],
  start_time: '',
  end_time: '',
  location: '',
  source: 'manual'
};

const initialTaskFormData: TaskFormData = {
  title: '',
  description: '',
  member: 'charlie',
  priority: 'medium',
  status: 'todo',
  category: ''
};

const initialRideRequestFormData: RideRequestFormData = {
  title: '',
  requester: 'charlie',
  destination: '',
  pickup_location: '',
  pickup_time: '',
  return_time: '',
  event_date: new Date().toISOString().split('T')[0],
  notes: '',
  status: 'pending'
};

const initialMessageFormData: MessageFormData = {
  type: 'message',
  title: '',
  content: '',
  recipients: [],
  urgent: false,
  priority: 'medium'
};

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<any>(null);
  const [eventFormData, setEventFormDataState] = useState<EventFormData>(initialEventFormData);
  const [taskFormData, setTaskFormDataState] = useState<TaskFormData>(initialTaskFormData);
  const [rideRequestFormData, setRideRequestFormDataState] = useState<RideRequestFormData>(initialRideRequestFormData);
  const [messageFormData, setMessageFormDataState] = useState<MessageFormData>(initialMessageFormData);

  const openModal = (type: ModalType, data?: any) => {
    setActiveModal(type);
    setModalData(data);
  };

  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  const setEventFormData = (data: Partial<EventFormData>) => {
    setEventFormDataState(prev => ({ ...prev, ...data }));
  };

  const setTaskFormData = (data: Partial<TaskFormData>) => {
    setTaskFormDataState(prev => ({ ...prev, ...data }));
  };

  const setRideRequestFormData = (data: Partial<RideRequestFormData>) => {
    setRideRequestFormDataState(prev => ({ ...prev, ...data }));
  };

  const setMessageFormData = (data: Partial<MessageFormData>) => {
    setMessageFormDataState(prev => ({ ...prev, ...data }));
  };

  const resetFormData = () => {
    setEventFormDataState(initialEventFormData);
    setTaskFormDataState(initialTaskFormData);
    setRideRequestFormDataState(initialRideRequestFormData);
    setMessageFormDataState(initialMessageFormData);
  };

  const value: ModalContextType = {
    activeModal,
    modalData,
    eventFormData,
    taskFormData,
    rideRequestFormData,
    messageFormData,
    openModal,
    closeModal,
    setEventFormData,
    setTaskFormData,
    setRideRequestFormData,
    setMessageFormData,
    resetFormData
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalStore() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalStore must be used within a ModalProvider');
  }
  return context;
}