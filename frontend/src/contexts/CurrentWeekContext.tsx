import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CurrentWeekContextType {
  currentWeekStart: string; // ISO date string (YYYY-MM-DD) for the Monday of the week
  setCurrentWeekStart: (weekStart: string) => void;
  isCurrentWeek: () => boolean;
}

const CurrentWeekContext = createContext<CurrentWeekContextType | undefined>(undefined);

export const useCurrentWeek = () => {
  const context = useContext(CurrentWeekContext);
  if (context === undefined) {
    throw new Error('useCurrentWeek must be used within a CurrentWeekProvider');
  }
  return context;
};

interface CurrentWeekProviderProps {
  children: ReactNode;
}

export const CurrentWeekProvider: React.FC<CurrentWeekProviderProps> = ({ children }) => {
  // Initialize with the current week's Monday
  const getMonday = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0]!;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
    return getMonday(new Date());
  });

  const isCurrentWeek = () => {
    const actualCurrentWeek = getMonday(new Date());
    return currentWeekStart === actualCurrentWeek;
  };

  return (
    <CurrentWeekContext.Provider value={{ currentWeekStart, setCurrentWeekStart, isCurrentWeek }}>
      {children}
    </CurrentWeekContext.Provider>
  );
};