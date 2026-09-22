import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../components/layout/PageContainer";
import Reveal from "../../components/motion/Reveal";

import ReplaySelector from "./components/ReplaySelector";

import type { ReplaySessionType } from "./replay.types";

import "./replay.css";

export default function ReplaySelectPage() {
  const navigate = useNavigate();

  const [year, setYear] = useState(2026);
  const [grandPrix, setGrandPrix] = useState("");
  const [sessionType, setSessionType] = useState<ReplaySessionType>("R");
  const [fps, setFps] = useState(8);

  const handleLoadReplay = () => {
    if (!grandPrix) {
      return;
    }

    const params = new URLSearchParams({
      year: String(year),
      grandPrix,
      sessionType,
      fps: String(fps),
    });

    navigate(`/replay/live?${params.toString()}`);
  };

  return (
    <PageContainer className="replay-page" wide>
      <div className="replay-shell">
        <Reveal>
          <header className="replay-header">
            <div className="replay-header-brand">
              <span className="replay-brand-mark" />
              <strong>F1 RACE REPLAY</strong>
            </div>

            <div className="replay-header-session">
              <span>{year}</span>
              <i>·</i>
              <strong>RACE</strong>
              <i>·</i>
              <span>{sessionType === "R" ? "RACE" : sessionType === "S" ? "SPRINT" : sessionType}</span>
            </div>

             <div className="replay-live">
              <span />
              SELECT REPLAY
            </div>
          </header>
        </Reveal>

        <Reveal delay="short">
          <section className="replay-intro">
            <div className="replay-intro-copy">
              <span className="replay-kicker">
                <i />
                ARCHIVE / RACE CONTROL
              </span>
              <h1>Relive the race.</h1>
              <p>
                Reconstruct every lap, overtake, and split-second decision
                from the official race archive.
              </p>
            </div>
            <div className="replay-intro-mark" aria-hidden="true">
              <span>REPLAY</span>
              <strong>01</strong>
              <i />
            </div>
          </section>
        </Reveal>

        <Reveal delay="short">
          <section className="replay-command-panel">
            <div className="replay-command-heading">
              <div>
                <span className="replay-kicker">01 / SELECT ARCHIVE</span>
                <h2>Configure your replay</h2>
              </div>
              <span className="replay-command-status">
                <i />
                DATA READY
              </span>
            </div>

            <div className="replay-selector-inner">
              <ReplaySelector
                grandPrix={grandPrix}
                onGrandPrixChange={setGrandPrix}
                year={year}
                sessionType={sessionType}
                fps={fps}
                onYearChange={setYear}
                onSessionChange={setSessionType}
                onFpsChange={setFps}
                onLoadReplay={handleLoadReplay}
                loading={false}
              />
            </div>

            <div className="replay-selection-summary">
              <div>
                <span>SELECTED SEASON</span>
                <strong>{year}</strong>
              </div>
              <div>
                <span>GRAND PRIX</span>
                <strong>{grandPrix || "Choose an event"}</strong>
              </div>
              <div>
                <span>SESSION FORMAT</span>
                <strong>{sessionType === "R" ? "Race" : sessionType === "S" ? "Sprint" : sessionType}</strong>
              </div>
              <div>
                <span>PLAYBACK</span>
                <strong>{fps} FPS</strong>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delay="medium">
          <section className="replay-empty-state">
            <div className="replay-empty-grid" aria-hidden="true" />
            <div className="replay-empty-content">
              <span className="replay-kicker">02 / LIVE VIEWER</span>
              <strong>Load an archive to enter race control.</strong>
              <p>
                Track position, timing, telemetry, and driver focus will
                appear here once a replay is loaded.
              </p>
            </div>
            <span className="replay-empty-index">NO SESSION LOADED</span>
          </section>
        </Reveal>
      </div>
    </PageContainer>
  );
}