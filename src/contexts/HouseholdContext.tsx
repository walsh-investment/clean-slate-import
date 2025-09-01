import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { FAMILY_MEMBERS } from '../../constants/family';

interface HouseholdContextType {
  household: { id: string; name: string } | null;
  people: typeof FAMILY_MEMBERS;
  loading: boolean;
  refreshHousehold: () => Promise<void>;
  refreshPeople: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextType | undefined>(undefined);

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
};

export const HouseholdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);
  const [people] = useState(FAMILY_MEMBERS);
  const [loading, setLoading] = useState(true);

  const refreshHousehold = async () => {
    if (!user) {
      setHousehold(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // For now, create a default household for the authenticated user
      setHousehold({
        id: user.id,
        name: 'Walsh Family'
      });
    } catch (error) {
      console.error('Error in refreshHousehold:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshPeople = async () => {
    // People are static for now
  };

  useEffect(() => {
    refreshHousehold();
  }, [user]);

  const value = {
    household,
    people,
    loading,
    refreshHousehold,
    refreshPeople,
  };

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>;
};