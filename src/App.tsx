import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from '@/contexts/AuthContext';
import { HouseholdProvider } from '@/contexts/HouseholdContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ModalProvider } from '../src/stores/modalProvider';
import { dataClient } from '../src/services/dataAdapter';

// Import all screen components
import { AllFamilyFeed } from '../components/screens/AllFamilyFeed';
import { MemberOverview } from '../components/screens/MemberOverview';
import { CalendarWeek } from '../components/screens/CalendarWeek';
import { CalendarList } from '../components/screens/CalendarList';
import { TasksBoard } from '../components/screens/TasksBoard';
import { RideRequests } from '../components/screens/RideRequests';
import { MessagesReminders } from '../components/screens/MessagesReminders';
import { Settings } from '../components/screens/Settings';

// Import layout components
import { Sidebar } from '../components/Sidebar';

// Import ModalRenderer directly to avoid potential index export issues
import { ModalRenderer } from '../components/modals/index';

const queryClient = new QueryClient();

const FamilyOrganizerApp = () => {
  // Initialize Supabase connection and setup data on app start
  useEffect(() => {
    const initializeNiles = async () => {
      try {
        console.log('Initializing Niles family organizer with Supabase backend...');
        await dataClient.initializeData();
        console.log('Niles initialization complete');
      } catch (error) {
        console.warn('Niles initialization failed, falling back to mock data:', error);
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
            {/* Main Dashboard */}
            <Route path="/" element={<AllFamilyFeed />} />
            
            {/* Member Overview Pages */}
            <Route path="/member/:id" element={<MemberOverview />} />
            
            {/* Calendar Views */}
            <Route path="/calendar/week" element={<CalendarWeek />} />
            <Route path="/calendar/list" element={<CalendarList />} />
            
            {/* Tasks & Activities */}
            <Route path="/tasks" element={<TasksBoard />} />
            <Route path="/rides" element={<RideRequests />} />
            
            {/* Communication */}
            <Route path="/messages" element={<MessagesReminders />} />
            
            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
            
            {/* Fallback */}
            <Route path="*" element={<AllFamilyFeed />} />
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
          <ProtectedRoute>
            <HouseholdProvider>
              <FamilyOrganizerApp />
            </HouseholdProvider>
          </ProtectedRoute>
        </Router>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
