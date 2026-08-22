import { Navigate, Route, Routes } from "react-router-dom";

import AppShell from "../components/layout/AppShell";
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";

import Button from "../components/ui/Button";
import Divider from "../components/ui/Divider";
import SectionLabel from "../components/ui/SectionLabel";

import PageTransition from "../components/motion/PageTransition";
import Reveal from "../components/motion/Reveal";
import HomePage from "../features/home/HomePage";
import ReplayPage from "../features/replay/ReplayPage";
import DriversPage from "../pages/DriversPage";
import DriverDetailPage from "../pages/DriverDetailPage";

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
      <Route element={<AppShell />}>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/replay"
          element={<ReplayPage />}
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

        {/* <Route
          path="/drivers"
          element={<DriversPage />}
        />

        <Route
          path="/drivers/:code"
          element={<DriversPage />}
        /> */}

        <Route
          path="/drivers"
          element={<DriversPage />}
        />

        <Route
          path="/drivers/:code"
          element={<DriverDetailPage />}
        />

        <Route
          path="/constructors"
          element={
            <FoundationPage
              eyebrow="04 / Teams"
              title="Constructors"
              description="Compare constructor performance, strategy and season progression."
            />
          }
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

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}
