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
          <p className="replay-tagline">
            Relive every lap, every overtake, every second.
          </p>
        </Reveal>



        <section className="replay-race-meta">
          <div>
            <strong>{year}</strong>
            <span>RACE</span>
            <span>RACE</span>
          </div>

          <div className="replay-race-lap">
            LAP <strong>--</strong> / 78
          </div>

          <div className="replay-clock">0:00:00 / 0:00:00</div>
        </section>

        <Reveal delay="short">
          <section className="replay-selector-drawer" style={{ padding: "12px 16px" }}>
            <div className="replay-selector-inner" style={{ borderTop: "none", padding: 0 }}>
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
          </section>
        </Reveal>
      </div>
    </PageContainer>
  );
}