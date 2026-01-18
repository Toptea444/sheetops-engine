import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'performanceTracker_userId';
const USER_NAME_KEY = 'performanceTracker_userName';
const DAILY_TARGET_KEY = 'performanceTracker_dailyTarget';
const WEEKLY_TARGET_KEY = 'performanceTracker_weeklyTarget';

interface UserIdentity {
  userId: string | null;
  userName: string | null;
  dailyTarget: number;
  weeklyTarget: number;
}

export function useUserIdentity() {
  const [identity, setIdentity] = useState<UserIdentity>({
    userId: null,
    userName: null,
    dailyTarget: 0,
    weeklyTarget: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load identity from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem(STORAGE_KEY);
    const storedUserName = localStorage.getItem(USER_NAME_KEY);
    const storedDailyTarget = localStorage.getItem(DAILY_TARGET_KEY);
    const storedWeeklyTarget = localStorage.getItem(WEEKLY_TARGET_KEY);

    setIdentity({
      userId: storedUserId,
      userName: storedUserName,
      dailyTarget: storedDailyTarget ? parseFloat(storedDailyTarget) : 0,
      weeklyTarget: storedWeeklyTarget ? parseFloat(storedWeeklyTarget) : 0,
    });
    setIsLoading(false);
  }, []);

  const setUserId = useCallback((userId: string, userName?: string) => {
    localStorage.setItem(STORAGE_KEY, userId);
    if (userName) {
      localStorage.setItem(USER_NAME_KEY, userName);
    }
    setIdentity(prev => ({
      ...prev,
      userId,
      userName: userName || prev.userName,
    }));
  }, []);

  const setUserName = useCallback((userName: string) => {
    localStorage.setItem(USER_NAME_KEY, userName);
    setIdentity(prev => ({ ...prev, userName }));
  }, []);

  const setDailyTarget = useCallback((target: number) => {
    localStorage.setItem(DAILY_TARGET_KEY, target.toString());
    setIdentity(prev => ({ ...prev, dailyTarget: target }));
  }, []);

  const setWeeklyTarget = useCallback((target: number) => {
    localStorage.setItem(WEEKLY_TARGET_KEY, target.toString());
    setIdentity(prev => ({ ...prev, weeklyTarget: target }));
  }, []);

  const clearIdentity = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    localStorage.removeItem(DAILY_TARGET_KEY);
    localStorage.removeItem(WEEKLY_TARGET_KEY);
    setIdentity({
      userId: null,
      userName: null,
      dailyTarget: 0,
      weeklyTarget: 0,
    });
  }, []);

  const isValidUserId = useCallback((id: string): boolean => {
    // Format: NGDS----, GHAS----, etc. (4 letters + alphanumeric)
    const pattern = /^[A-Za-z]{4}[A-Za-z0-9-]+$/;
    return pattern.test(id.trim());
  }, []);

  return {
    ...identity,
    isLoading,
    setUserId,
    setUserName,
    setDailyTarget,
    setWeeklyTarget,
    clearIdentity,
    isValidUserId,
    hasIdentity: !!identity.userId,
  };
}
