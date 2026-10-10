import { useState, useEffect } from 'react';

// Returns true when the browser has network access.
// Uses the native online/offline events. Note: navigator.onLine reports
// LAN connectivity, not internet reachability — but for branch deployment
// where the local microservices ARE the network, this is exactly right.
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online',  on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}
