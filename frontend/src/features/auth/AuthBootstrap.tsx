import { useEffect } from "react";
import { useAuthStore } from "./auth.store";

export default function AuthBootstrap() {
  const restoreSession = useAuthStore(
    (state) => state.restoreSession,
  );

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  return null;
}