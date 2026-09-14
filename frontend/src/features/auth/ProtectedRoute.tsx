import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "./auth.store";

export default function ProtectedRoute() {
  const location = useLocation();

  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore(
    (state) => state.isInitialized,
  );

  if (!isInitialized) {
    return (
      <main className="auth-page">
        <div className="auth-page-glow" />

        <section className="auth-card">
          <div className="auth-heading">
            <span className="auth-eyebrow">
              ACCOUNT / SESSION
            </span>

            <h1>Loading session...</h1>

            <p>
              Restoring your F1 Race Replay account.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
}