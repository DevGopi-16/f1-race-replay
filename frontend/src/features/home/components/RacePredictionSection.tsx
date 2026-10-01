import { useState } from "react";

import { useHomeDrivers, type HomeDriver } from "../home.api";

interface RacePredictionSectionProps {
  eventName: string;
}

function driverCode(driver: HomeDriver): string {
  return driver.code;
}

function driverHeadshot(driver: HomeDriver): string {
  const filename = driver.driverId
    .replace(/^max_/, "")
    .replace(/^arvid_/, "")
    .toLowerCase();
  return `/images/drivers/headshots/${filename}.png`;
}

function teamName(driver: HomeDriver): string {
  const filename = driver.teamLogo.split("/").pop() ?? "";
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function moveDriver(
  current: string[],
  index: number,
  direction: -1 | 1,
): string[] {
  const target = index + direction;
  if (target < 0 || target >= current.length) return current;

  const next = [...current];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function RacePredictionSection({
  eventName,
}: RacePredictionSectionProps) {
  const query = useHomeDrivers();
  const drivers = query.data ?? [];
  const [picks, setPicks] = useState<string[] | null>(null);
  const selected = picks ?? drivers.slice(0, 3).map((driver) => driver.driverId);
  const selectedDrivers = selected
    .map((id) => drivers.find((driver) => driver.driverId === id))
    .filter((driver): driver is HomeDriver => driver !== undefined);

  function toggleDriver(id: string) {
    setPicks((current) => {
      const currentPicks = current ?? selected;
      if (currentPicks.includes(id)) {
        return currentPicks.filter((pickedId) => pickedId !== id);
      }
      if (currentPicks.length >= 3) return currentPicks;
      return [...currentPicks, id];
    });
  }

  return (
    <section className="home-prediction" aria-labelledby="home-prediction-title">
      <header className="home-prediction-heading">
        <div className="home-prediction-title-wrap">
          <div className="home-prediction-kicker">
            <span>01</span>
            <strong>QUALIFYING</strong>
            <i />
            <small>RACE PHASE</small>
          </div>
          <h2 id="home-prediction-title">MAKE THE CALL.</h2>
        </div>
        <p>
          Move three drivers into order. Your P1 is also your pole call for this
          preview.
        </p>
      </header>

      {query.isLoading && (
        <p className="home-prediction-message" role="status">
          Loading this season’s driver roster…
        </p>
      )}

      {query.isError && (
        <p className="home-prediction-message" role="alert">
          Driver picks are temporarily unavailable.
        </p>
      )}

      {!query.isLoading && !query.isError && drivers.length === 0 && (
        <p className="home-prediction-message">
          No drivers are available to preview.
        </p>
      )}
      
      {drivers.length > 0 && (
        <div className="home-prediction-board">
          <section className="home-prediction-podium" aria-label="Predicted podium">
            <header>
              <span>PREDICTED PODIUM</span>
              <span>
                {new Date().getFullYear()} POINTS ORDER · {eventName.toUpperCase()}
              </span>
            </header>

            <div className="home-prediction-slots">
              {[0, 1, 2].map((position) => {
                const driver = selectedDrivers[position];

                return (
                  <div
                    className={`home-prediction-slot${driver ? "" : " is-empty"}`}
                    key={position}
                  >
                    <span className="home-prediction-place">P{position + 1}</span>
                    <strong className="home-prediction-order">
                      {String(position + 1).padStart(2, "0")}
                    </strong>
                    {driver ? (
                      <>
                        <div className="home-prediction-portrait">
                          <img
                            className="home-prediction-driver-image"
                            src={driverHeadshot(driver)}
                            alt=""
                          />
                        </div>
                        <div className="home-prediction-driver-info">
                          <strong>{driver.givenName} {driver.familyName}</strong>
                          <span>
                            {driver.teamLogo && (
                              <img src={driver.teamLogo} alt="" />
                            )}
                            {teamName(driver)}
                          </span>
                          <small className="home-prediction-driver-points">
                            P{driver.position ?? "—"} · {driver.points} PTS
                          </small>
                        </div>
                        {position === 0 && (
                          <span className="home-prediction-pole">POLE</span>
                        )}
                      </>
                    ) : (
                      <span className="home-prediction-empty">
                        Choose a driver
                      </span>
                    )}
                    <div className="home-prediction-controls">
                      <button
                        type="button"
                        aria-label={`Move P${position + 1} up`}
                        disabled={!driver || position === 0}
                        onClick={() =>
                          setPicks(moveDriver(selected, position, -1))
                        }
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move P${position + 1} down`}
                        disabled={!driver || position === selectedDrivers.length - 1}
                        onClick={() =>
                          setPicks(moveDriver(selected, position, 1))
                        }
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="home-prediction-pool" aria-label="Choose drivers">
            <header className="home-prediction-pool-header">
              <h3>PUT ON POLE</h3>
              <div>
                <span aria-live="polite">{selected.length} / 3 PICKS</span>
                <button
                  type="button"
                  disabled={selected.length === 0}
                  onClick={() => setPicks([])}
                >
                  RESET
                </button>
              </div>
            </header>
            <div className="home-prediction-driver-grid">
              {drivers.map((driver) => {
                const isSelected = selected.includes(driver.driverId);
                return (
                  <button
                    type="button"
                    className={`home-prediction-driver${isSelected ? " is-selected" : ""}`}
                    key={driver.driverId}
                    aria-pressed={isSelected}
                    disabled={!isSelected && selected.length >= 3}
                    onClick={() => toggleDriver(driver.driverId)}
                  >
                    <span>
                      {driverCode(driver)}
                      <small>{driver.number}</small>
                    </span>
                    <span>
                      {teamName(driver)} · {driver.points} PTS
                    </span>
                    {driver.teamLogo && (
                      <img src={driver.teamLogo} alt="" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
            <p>
              No account needed for the preview. Picks are not saved.
            </p>
          </section>
        </div>
      )}
    </section>
  );
}
