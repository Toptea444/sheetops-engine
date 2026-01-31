import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'performanceTracker_userId';
const USER_NAME_KEY = 'performanceTracker_userName';
const DAILY_TARGET_KEY = 'performanceTracker_dailyTarget';
const CYCLE_TARGETS_KEY = 'performanceTracker_cycleTargets';
const IDENTITY_CONFIRMED_KEY = 'performanceTracker_identityConfirmed';

interface UserIdentity {
  userId: string | null;
  userName: string | null;
  dailyTarget: number;
  cycleTargets: Record<string, number>;
  identityConfirmed: boolean;
}

export function useUserIdentity() {
  const [identity, setIdentity] = useState<UserIdentity>({
    userId: null,
    userName: null,
    dailyTarget: 0,
    cycleTargets: {},
    identityConfirmed: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load identity from localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem(STORAGE_KEY);
    const storedUserName = localStorage.getItem(USER_NAME_KEY);
    const storedDailyTarget = localStorage.getItem(DAILY_TARGET_KEY);
    const storedCycleTargets = localStorage.getItem(CYCLE_TARGETS_KEY);
    const storedIdentityConfirmed = localStorage.getItem(IDENTITY_CONFIRMED_KEY);

    setIdentity({
      userId: storedUserId,
      userName: storedUserName,
      dailyTarget: storedDailyTarget ? parseFloat(storedDailyTarget) : 0,
      cycleTargets: storedCycleTargets ? JSON.parse(storedCycleTargets) : {},
      identityConfirmed: storedIdentityConfirmed === 'true',
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

  const setCycleTarget = useCallback((target: number, cycleKey: string) => {
    setIdentity(prev => {
      const newCycleTargets = { ...prev.cycleTargets, [cycleKey]: target };
      localStorage.setItem(CYCLE_TARGETS_KEY, JSON.stringify(newCycleTargets));
      return { ...prev, cycleTargets: newCycleTargets };
    });
  }, []);

  const getCycleTarget = useCallback((cycleKey: string): number => {
    return identity.cycleTargets[cycleKey] || 0;
  }, [identity.cycleTargets]);

  const confirmIdentity = useCallback(() => {
    localStorage.setItem(IDENTITY_CONFIRMED_KEY, 'true');
    setIdentity(prev => ({ ...prev, identityConfirmed: true }));
  }, []);

  const clearIdentity = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    localStorage.removeItem(DAILY_TARGET_KEY);
    localStorage.removeItem(CYCLE_TARGETS_KEY);
    localStorage.removeItem(IDENTITY_CONFIRMED_KEY);
    setIdentity({
      userId: null,
      userName: null,
      dailyTarget: 0,
      cycleTargets: {},
      identityConfirmed: false,
    });
  }, []);

  const isValidUserId = useCallback((id: string): boolean => {
    // Format: NGDS----, GHAS----, etc. (4 letters + alphanumeric)
    const pattern = /^[A-Za-z]{4}[A-Za-z0-9-]+$/;
    return pattern.test(id.trim());
  }, []);

  return {
    userId: identity.userId,
    userName: identity.userName,
    dailyTarget: identity.dailyTarget,
    cycleTargets: identity.cycleTargets,
    identityConfirmed: identity.identityConfirmed,
    isLoading,
    setUserId,
    setUserName,
    setDailyTarget,
    setCycleTarget,
    getCycleTarget,
    confirmIdentity,
    clearIdentity,
    isValidUserId,
    hasIdentity: !!identity.userId,
  };
}
