import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

// Nothing external to subscribe to — we only care about server vs client.
const subscribe = () => () => {};

export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true, // on the client (after hydration)
    () => false, // during server render / hydration
  );

  const colorScheme = useRNColorScheme();
  return hasHydrated ? colorScheme : "light";
}
