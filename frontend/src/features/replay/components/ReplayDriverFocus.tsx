import { useMemo } from "react";

import type {
  ReplayDriverColors,
  ReplayFrame,
} from "../replay.types";

interface Props {
  frame: ReplayFrame | null;
  driverColors: ReplayDriverColors;
  frameIndex?: number;
  selectedDrivers?: string[];
  onDriverSelect?: (code: string) => void;
}

interface DriverInfo {
  code: string;
  name: string;
  color: string;
  position: number;
  lap: number;
  speed: number | null;
  tyre: string;
  tyreLife: number | null;
  drs: boolean;
  throttle: number | null;
  brake: number | null;
  inPit: boolean;
}

const DRIVER_NAMES: Record<string, string> = {
  VER: "MAX VERSTAPPEN",
  LEC: "CHARLES LECLERC",
  NOR: "LANDO NORRIS",
  PIA: "OSCAR PIASTRI",
  RUS: "GEORGE RUSSELL",
  HAM: "LEWIS HAMILTON",
  ALO: "FERNANDO ALONSO",
  STR: "LANCE STROLL",
  GAS: "PIERRE GASLY",
  OCO: "ESTEBAN OCON",
  ALB: "ALEX ALBON",
  SAI: "CARLOS SAINZ",
  TSU: "YUKI TSUNODA",
  LAW: "LIAM LAWSON",
  HAD: "ISACK HADJAR",
  BEA: "OLIVER BEARMAN",
  ANT: "KIMI ANTONELLI",
  COL: "FRANCO COLAPINTO",
  BOR: "GABRIEL BORTOLETO",
  HUL: "NICO HULKENBERG",
  PER: "SERGIO PEREZ",
  BOT: "VALTTERI BOTTAS",
  ZHO: "ZHOU GUANYU",
  MAG: "KEVIN MAGNUSSEN",
};

function getColor(
  driverColors: ReplayDriverColors,
  code: string,
) {
  const value = driverColors[code];

  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.color === "string"
  ) {
    return value.color;
  }

  return "var(--color-accent)";
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function makeDriver(
  code: string,
  data: Record<string, unknown>,
  driverColors: ReplayDriverColors,
): DriverInfo {
  return {
    code,

    name:
      DRIVER_NAMES[code] ??
      code,

    color: getColor(
      driverColors,
      code,
    ),

    position:
      numberOrNull(data.position) ??
      999,

    lap:
      numberOrNull(data.lap) ??
      0,

    speed:
      numberOrNull(data.speed),

    tyre:
      data.tyre == null
        ? "—"
        : String(data.tyre).toUpperCase(),

    tyreLife:
      numberOrNull(data.tyre_life),

    drs:
      data.drs === true ||
      data.drs === 1,

    throttle:
      numberOrNull(data.throttle),

    brake:
      numberOrNull(data.brake),

    inPit:
      data.in_pit === true,
  };
}

export default function ReplayDriverFocus({
  frame,
  driverColors,
  selectedDrivers = [],
  onDriverSelect,
}: Props) {



  const availableDrivers = useMemo(() => {
    if (!frame?.drivers) {
      return [];
    }

    return Object.entries(frame.drivers)
      .map(([code, data]) =>
        makeDriver(
          code.toUpperCase(),
          data as Record<string, unknown>,
          driverColors,
        ),
      )
      .sort(
        (a, b) =>
          a.position - b.position,
      );
  }, [
    frame,
    driverColors,
  ]);













  const activeSelectedDrivers = useMemo(
    () =>
      (selectedDrivers ?? [])
        .map((code) =>
          String(code)
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean)
        .slice(0, 3),
    [selectedDrivers],
  );

  const selectedDriverData = useMemo(
    () =>
      activeSelectedDrivers
        .map((code) =>
          availableDrivers.find(
            (driver) =>
              driver.code === code,
          ),
        )
        .filter(
          (
            driver,
          ): driver is DriverInfo =>
            Boolean(driver),
        ),
    [
      activeSelectedDrivers,
      availableDrivers,
    ],
  );

  function selectDriver(code: string) {
    if (!onDriverSelect) {
      return;
    }

    onDriverSelect(
      code
        .trim()
        .toUpperCase(),
    );
  }

  return (
    <section className="replay-driver-focus">

      {            }
      <div className="replay-driver-focus-header">
        <div>
          <span>DRIVER FOCUS</span>
          <strong>SELECT UP TO 3</strong>
        </div>

        <small>
          {activeSelectedDrivers.length}/3
        </small>
      </div>

      {                     }
      <div className="replay-driver-picker">
        {availableDrivers.map(
          (driver) => {
            const active =
              activeSelectedDrivers.includes(
                driver.code,
              );

            return (
              <button
                type="button"
                key={driver.code}
                className={
                  active
                    ? "active"
                    : ""
                }
                aria-pressed={active}
                onClick={() =>
                  selectDriver(
                    driver.code,
                  )
                }
              >
                <span
                  className="replay-picker-dot"
                  style={{
                    background:
                      driver.color,
                  }}
                />

                <span>
                  {driver.code}
                </span>

                <small>
                  P{driver.position}
                </small>
              </button>
            );
          },
        )}
      </div>

      {                           }
      <div className="replay-driver-cards">

        {selectedDriverData.length === 0 && (
          <div className="replay-driver-empty">
            <strong>NO DRIVERS SELECTED</strong>
            <span>
              Click a driver in the leaderboard
              to add them here.
            </span>
          </div>
        )}

        {selectedDriverData.map(
          (driver) => (
            <article
              className="replay-driver-card"
              key={driver.code}
            >

              {                   }
              <div className="replay-driver-card-header">

                <div className="replay-driver-card-identity">

                  <span
                    className="replay-driver-card-code"
                    style={{
                      color:
                        driver.color,
                    }}
                  >
                    {driver.code}
                  </span>

                  <strong>
                    {driver.name}
                  </strong>

                </div>

                <span className="replay-driver-card-position">
                  P{driver.position}
                </span>

              </div>

              {             }
              <div className="replay-driver-metric-row">
                <span>RUNNING</span>
                <strong>
                  LAP {driver.lap}
                </strong>
              </div>

              {           }
              <div className="replay-driver-metric-row">
                <span>SPEED</span>
                <strong>
                  {driver.speed == null
                    ? "—"
                    : `${Math.round(
                        driver.speed,
                      )} KM/H`}
                </strong>
              </div>

              {          }
              <div className="replay-driver-metric-row">
                <span>TYRE</span>
                <strong>
                  {driver.tyre}
                  {" · "}
                  {driver.tyreLife == null
                    ? "—"
                    : `${Math.round(
                        driver.tyreLife,
                      )} LAPS`}
                </strong>
              </div>

              {              }
              <div className="replay-driver-metric-row">
                <span>THROTTLE</span>
                <strong>
                  {driver.throttle == null
                    ? "—"
                    : `${Math.round(
                        driver.throttle,
                      )}%`}
                </strong>
              </div>

              {           }
              <div className="replay-driver-metric-row">
                <span>BRAKE</span>
                <strong>
                  {driver.brake == null
                    ? "—"
                    : `${Math.round(
                        driver.brake,
                      )}%`}
                </strong>
              </div>

              {

                                                                      }

              <div className="replay-selected-telemetry-bars">

                {              }
                <div className="replay-selected-telemetry-row">

                  <span className="replay-selected-telemetry-label">
                    THR
                  </span>

                  <div className="replay-selected-telemetry-track">
                    <div
                      className="replay-selected-telemetry-fill throttle"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            driver.throttle ?? 0,
                          ),
                        )}%`,
                      }}
                    />
                  </div>

                  <span className="replay-selected-telemetry-value">
                    {driver.throttle == null
                      ? "0%"
                      : `${Math.round(
                          driver.throttle,
                        )}%`}
                  </span>

                </div>


                {           }
                <div className="replay-selected-telemetry-row">

                  <span className="replay-selected-telemetry-label">
                    BRK
                  </span>

                  <div className="replay-selected-telemetry-track">
                    <div
                      className="replay-selected-telemetry-fill brake"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            driver.brake ?? 0,
                          ),
                        )}%`,
                      }}
                    />
                  </div>

                  <span className="replay-selected-telemetry-value">
                    {driver.brake == null
                      ? "0%"
                      : `${Math.round(
                          driver.brake,
                        )}%`}
                  </span>

                </div>


                {               }
                <div className="replay-selected-telemetry-row">

                  <span className="replay-selected-telemetry-label">
                    TYRE
                  </span>

                  <div className="replay-selected-telemetry-track">
                    <div
                      className="replay-selected-telemetry-fill tyre"
                      style={{
                        width: `${Math.max(
                          5,
                          Math.min(
                            100,
                            100 -
                              ((driver.tyreLife ?? 0) * 5),
                          ),
                        )}%`,
                      }}
                    />
                  </div>

                  <span className="replay-selected-telemetry-value">
                    {driver.tyreLife == null
                      ? "0 LAPS"
                      : `${Math.round(
                          driver.tyreLife,
                        )} LAPS`}
                  </span>

                </div>

              </div>

            </article>
          ),
        )}

      </div>

    </section>
  );
}
