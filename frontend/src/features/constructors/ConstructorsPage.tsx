import { useEffect, useMemo, useState } from "react";

import { RefreshCw } from "lucide-react";

import { getConstructorsPanel } from "./constructors.api";

import type { ConstructorTeam } from "./constructors.types";

import ConstructorHero from "./components/ConstructorHero";
import ConstructorStandings from "./components/ConstructorStandings";
import ConstructorProfile from "./components/ConstructorProfile";


import "./constructors.css";

export type SortMode = "points" | "wins" | "name";

const YEAR = 2026;

type NextRoundInfo = {
  round?: number;
  country?: string;
  name?: string;
  date_range?: string;
} | null;

function formatNextRound(nextRound: NextRoundInfo) {
  if (!nextRound) {
    return { title: "TBD", sub: "" };
  }

  return {
    title: nextRound.name ?? "TBD",
    sub: nextRound.date_range ?? "",
  };
}

function ConstructorsPage() {
  const [teams, setTeams] = useState<ConstructorTeam[]>([]);

  const [totalPoints, setTotalPoints] = useState(0);

  const [racesCompleted, setRacesCompleted] = useState(0);

  const [totalRounds, setTotalRounds] = useState(0);

  const [nextRound, setNextRound] = useState<NextRoundInfo>(null);





  const [selectedTeam, setSelectedTeam] =
    useState<ConstructorTeam | null>(null);

  const [sortMode, setSortMode] =
    useState<SortMode>("points");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const data = await getConstructorsPanel(YEAR);

      console.log("next_round data:", data.next_round);

      const nextTeams = data.teams ?? [];



      setTeams(nextTeams);

      setTotalPoints(
        data.total_points ?? 0,
      );

      setRacesCompleted(
        data.races_completed ?? 0,
      );

      setTotalRounds(
        data.total_rounds ?? 0,
      );

      setNextRound(
        data.next_round ?? null,
      );













      setSelectedTeam((current) => {
        if (!current) {
          return null;
        }

        return (
          nextTeams.find(
            (team) => team.id === current.id,
          ) ?? null
        );
      });
    } catch (err) {
      console.error(
        "[ConstructorsPage]",
        err,
      );

      setError(
        "Unable to load constructor championship data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      window.scrollTo({ top: 50, left: 0, behavior: "auto" });
    }
  }, [selectedTeam?.id]);

  const sortedTeams = useMemo(() => {
    const result = [...teams];

    if (sortMode === "wins") {
      return result.sort(
        (a, b) =>
          b.wins - a.wins ||
          b.points - a.points,
      );
    }

    if (sortMode === "name") {
      return result.sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }

    return result.sort(
      (a, b) =>
        a.position - b.position,
    );
  }, [teams, sortMode]);

  const leader =
    teams.find(
      (team) => team.position === 1,
    ) ??
    sortedTeams[0] ??
    null;







  if (loading) {
    return (
      <main className="constructors-page">
        <section className="constructors-loading">
          <div className="constructors-loading-line" />

          <div className="constructors-loading-title" />

          <div className="constructors-loading-grid">
            {Array.from({ length: 6 }).map(
              (_, index) => (
                <div
                  className="constructor-skeleton"
                  key={index}
                />
              ),
            )}
          </div>
        </section>
      </main>
    );
  }







  if (error) {
    return (
      <main className="constructors-page">
        <section className="constructors-error">
          <span>
            CONSTRUCTOR DATA
          </span>

          <h1>
            Championship unavailable
          </h1>

          <p>{error}</p>

          <button
            type="button"
            onClick={() => void load()}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </section>
      </main>
    );
  }













  if (selectedTeam) {
    return (
      <main className="constructors-page">
        <ConstructorProfile
          team={selectedTeam}
          teams={teams}
          year={YEAR}
          racesCompleted={racesCompleted}
          onBack={() => {



            setSelectedTeam(null);




            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        />
      </main>
    );
  }















  const nextRoundDisplay = formatNextRound(nextRound);

  return (
    <main className="constructors-page">
      <ConstructorHero
        year={YEAR}
        leader={leader}
        racesCompleted={racesCompleted}
        totalRounds={totalRounds}
      />


            <section className="constructors-stat-strip">
        <div className="constructors-stat-card">
          <span className="constructors-stat-label">Total Points</span>
          <strong>{totalPoints.toLocaleString("en-US")}</strong>
          <span className="constructors-stat-sub">All Teams</span>
        </div>

        <div className="constructors-stat-card">
          <span className="constructors-stat-label">Races Completed</span>
          <strong>{racesCompleted}</strong>
          <span className="constructors-stat-sub">{totalRounds} Total Rounds</span>
        </div>

        <div className="constructors-stat-card">
          <span className="constructors-stat-label">Teams</span>
          <strong>{teams.length}</strong>
          <span className="constructors-stat-sub">Constructors</span>
        </div>

        <div className="constructors-stat-card">
          <span className="constructors-stat-label">Next Round</span>
          <strong>{nextRoundDisplay.title}</strong>
          <span className="constructors-stat-sub">{nextRoundDisplay.sub}</span>
        </div>
      </section>

      <ConstructorStandings
        teams={sortedTeams}
        sortMode={sortMode}
        onSortChange={setSortMode}
        onSelectTeam={setSelectedTeam}
      />
    </main>
  );
}

export default ConstructorsPage;