import { useEffect, useRef } from 'react';

interface UsePollingOptions {
  interval: number; // milliseconds
  enabled?: boolean; // whether polling is active
  immediate?: boolean; // run immediately on start
}


export const usePolling = (
  callback: () => Promise<void> | void,
  options: UsePollingOptions
) => {
  const { interval, enabled = true, immediate = true } = options;
  const savedCallback = useRef(callback);
  const intervalRef = useRef<number | undefined>(undefined);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the polling
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      return savedCallback.current();
    };

    if (immediate) {
      tick();
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = window.setInterval(tick, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [interval, enabled, immediate]);

  // Cleanup function
  const stop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  };

  return { stop };
};
