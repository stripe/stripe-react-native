import type { InitialState } from '@react-navigation/native';
import { useEffect, useState } from 'react';

const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';

// In-memory storage for navigation state
let memoryStorage: Record<string, string> = {};

// Simple in-memory storage adapter
const storage = {
  async getItem(key: string): Promise<string | null> {
    return memoryStorage[key] || null;
  },
  async setItem(key: string, value: string): Promise<void> {
    memoryStorage[key] = value;
  },
};

export function useNavigationPersistence() {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState<InitialState | undefined>();

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await storage.getItem(PERSISTENCE_KEY);
        const state = savedStateString
          ? JSON.parse(savedStateString)
          : undefined;

        if (state !== undefined) {
          setInitialState(state);
        }
      } catch (error) {
        console.error('Failed to restore navigation state:', error);
      } finally {
        setIsReady(true);
      }
    };

    if (!isReady) {
      restoreState();
    }
  }, [isReady]);

  const onStateChange = async (state: InitialState | undefined) => {
    try {
      await storage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save navigation state:', error);
    }
  };

  return {
    isReady,
    initialState,
    onStateChange,
  };
}
