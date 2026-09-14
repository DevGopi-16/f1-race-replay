import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "../components/layout/AppShell";
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";
import Button from "../components/ui/Button";
import Divider from "../components/ui/Divider";
import SectionLabel from "../components/ui/SectionLabel";
import PageTransition from "../components/motion/PageTransition";
import Reveal from "../components/motion/Reveal";
import CalendarPage from "../features/schedule/CalendarPage";

import HomePage from "../features/home/HomePage";
import ConstructorsPage from "../features/constructors/ConstructorsPage";
import ReplayPage from "../features/replay/ReplayPage";


import LoginPage from "../features/auth/LoginPage";
import RegisterPage from "../features/auth/RegisterPage";
import ProfilePage from "../features/auth/ProfilePage";
import ProtectedRoute from "../features/auth/ProtectedRoute";
import DiscordCallbackPage from "../features/auth/DiscordCallbackPage";
import XCallbackPage from "../features/auth/XCallbackPage";

import DriversPage from "../pages/DriversPage";
import DriverDetailPage from "../pages/DriverDetailPage";
import AnalyticsPage from "../features/analytics/AnalyticsPage";

function FoundationPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <PageTransition>
      <PageContainer>
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={
            <Reveal delay="medium">
              <Button variant="outline">
                Explore
              </Button>
            </Reveal>
          }
        />

        <Reveal delay="short">
          <section className="page-section">
            <SectionLabel number="01">
              Architecture
            </SectionLabel>

            <div className="page-space-sm" />

            <div className="page-grid page-grid-2">
              <div>
                <h2 className="page-section-title">
                  Built for
                  <br />
                  every lap.
                </h2>
              </div>

              <div>
                <p className="body-lg">
                  The new F1 Race Replay experience is
                  being rebuilt around cinematic presentation,
                  real telemetry and intelligent data systems.
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delay="medium">
          <section className="page-section">
            <Divider />

            <div className="page-space-sm" />

            <div className="page-section-header">
              <div>
                <SectionLabel number="02">
                  Next generation
                </SectionLabel>

                <div className="page-space-sm" />

                <h2 className="page-section-title">
                  Every detail.
                </h2>
              </div>

              <p className="page-section-description">
                This page is currently a React architecture
                foundation. Real F1 functionality will be
                migrated into this system progressively.
              </p>
            </div>
          </section>
        </Reveal>
      </PageContainer>
    </PageTransition>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      <Route
        path="/discord/callback"
        element={<DiscordCallbackPage />}
      />

      <Route
        path="/x/callback"
        element={<XCallbackPage />}
      />

      <Route element={<AppShell />}>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/sessions"
          element={
            <FoundationPage
              eyebrow="02 / Sessions"
              title="Sessions"
              description="Explore every practice, qualifying, sprint and race session."
            />
          }
        />

        <Route
          path="/constructors"
          element={<ConstructorsPage />}
        />

        <Route
          path="/calendar"
          element={<CalendarPage />}
        />
        
        <Route
          path="/telemetry"
          element={
            <FoundationPage
              eyebrow="05 / Telemetry"
              title="Telemetry"
              description="Dive into speed, throttle, braking, gears, tyres and track position."
            />
          }
        />


        <Route
          path="/timing"
          element={
            <FoundationPage
              eyebrow="06 / Timing"
              title="Timing"
              description="Follow live-style race timing, gaps, positions and sector performance."
            />
          }
        />

        <Route
          path="/analytics"
          element={<AnalyticsPage />}
        />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/replay"
            element={<ReplayPage />}
          />

          <Route
            path="/drivers"
            element={<DriversPage />}
          />

          <Route
            path="/drivers/:code"
            element={<DriverDetailPage />}
          />

          <Route
            path="/profile"
            element={<ProfilePage />}
          />

          <Route
            path="/settings"
            element={
              <FoundationPage
                eyebrow="07 / Settings"
                title="Settings"
                description="Configure your F1 Race Replay experience."
              />
            }
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}