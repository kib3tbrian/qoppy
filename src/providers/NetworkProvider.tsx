import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextType {
  isOffline: boolean;
  isSlow: boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  isOffline: false,
  isSlow: false,
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      // If isConnected is false or isInternetReachable is false, we are offline.
      // (isInternetReachable can be null initially)
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);

      // We define "slow" as cellular connections below 4g, or specifically 2g/3g.
      let slow = false;
      if (!offline && state.type === 'cellular' && state.details) {
        if (state.details.cellularGeneration === '2g' || state.details.cellularGeneration === '3g') {
          slow = true;
        }
      }
      setIsSlow(slow);
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={{ isOffline, isSlow }}>
      {children}
    </NetworkContext.Provider>
  );
};
