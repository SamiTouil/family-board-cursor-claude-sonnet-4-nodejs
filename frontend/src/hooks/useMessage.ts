import { useState, useEffect, useCallback } from 'react';

export interface Message {
  type: 'success' | 'error';
  text: string;
}

/**
 * Custom hook for displaying messages with auto-dismiss functionality
 * @param autoDismissDelay - Delay in milliseconds before auto-dismissing (default: 5000ms)
 * @returns [message, setMessage] - Current message and setter function
 */
export function useMessage(autoDismissDelay: number = 5000): [Message | null, (message: Message | null) => void] {
  const [message, setMessageState] = useState<Message | null>(null);

  // Clear message after delay
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessageState(null);
      }, autoDismissDelay);

      // Cleanup timer if message changes or component unmounts
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message, autoDismissDelay]);

  // Wrapper to ensure we always get a new object reference
  // This ensures the effect runs even if setting the same message
  const setMessage = useCallback((newMessage: Message | null) => {
    if (newMessage) {
      // Create a new object to trigger the effect
      setMessageState({ ...newMessage });
    } else {
      setMessageState(null);
    }
  }, []);

  return [message, setMessage];
}