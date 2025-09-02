import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from '@/contexts/AuthContext';
import { HouseholdProvider } from '@/contexts/HouseholdContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthForm } from '@/components/auth/AuthForm';
import { ModalProvider } from '../src/stores/modalProvider';
import { dataClient } from '../src/services/supabaseDataClient';

// Import all screen components
import { AllFamilyFeed } from '../components/screens/AllFamilyFeed';
import { MemberOverview } from '../components/screens/MemberOverview';
import { CalendarWeek } from '../components/screens/CalendarWeek';
import { CalendarList } from '../components/screens/CalendarList';
import { TasksBoard } from '../components/screens/TasksBoard';
import { RideRequests } from '../components/screens/RideRequests';
import { MessagesReminders } from '../components/screens/MessagesReminders';
import { AiChat } from '../src/components/screens/AiChat';
import { Settings } from '../components/screens/Settings';

// Import layout components
import { Sidebar } from '../components/Sidebar';

// Import ModalRenderer directly to avoid potential index export issues
import { ModalRenderer } from '../components/modals/index';

const queryClient = new QueryClient();

const FamilyOrganizerApp = () => {
  // Initialize Supabase connection on app start
  useEffect(() => {
    const initializeNiles = async () => {
      try {
        console.log('Initializing Niles family organizer...');
        await dataClient.initializeData();
        console.log('Niles initialization complete');
      } catch (error) {
        console.error('Niles initialization failed:', error);
      }
    };

    initializeNiles();
  }, []);

  return (
    <ModalProvider>
      <div className="w-[1440px] h-[1024px] mx-auto bg-background flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/auth" element={<AuthForm />} />
            <Route path="/" element={<ProtectedRoute><AllFamilyFeed /></ProtectedRoute>} />
            <Route path="/member/:id" element={<ProtectedRoute><MemberOverview /></ProtectedRoute>} />
            <Route path="/calendar/week" element={<ProtectedRoute><CalendarWeek /></ProtectedRoute>} />
            <Route path="/calendar/list" element={<ProtectedRoute><CalendarList /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TasksBoard /></ProtectedRoute>} />
            <Route path="/rides" element={<ProtectedRoute><RideRequests /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesReminders /></ProtectedRoute>} />
            <Route path="/ai-chat" element={<ProtectedRoute><AiChat /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="*" element={<ProtectedRoute><AllFamilyFeed /></ProtectedRoute>} />
          </Routes>
        </main>
        
        {/* Global Modal Renderer */}
        <ModalRenderer />
      </div>
    </ModalProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Router>
          <HouseholdProvider>
            <FamilyOrganizerApp />
          </HouseholdProvider>
        </Router>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
