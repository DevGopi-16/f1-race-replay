import { useMemo, useState } from "react";

import type {
  ReplayDriverData,
  ReplayFrame,
  ReplayDriverColors,
  ReplayDriverStatus,
} from "../replay.types";

function driverImageUrl(codeValue: string): string {
  const code = String(codeValue ?? "")
    .trim()
    .toUpperCase();

  const aliases: Record<string, string> = {
    VER: "verstappen",
    NOR: "norris",
    LEC: "leclerc",
    RUS: "russell",
    PIA: "piastri",
    HAM: "hamilton",
    ANT: "antonelli",
    ALO: "alonso",
    STR: "stroll",
    GAS: "gasly",
    COL: "colapinto",
    OCO: "ocon",
    BEA: "bearman",
    LAW: "lawson",
    LIN: "lindblad",
    ALB: "albon",
    SAI: "sainz",
    HUL: "hulkenberg",
    BOR: "bortoleto",
    PER: "perez",
    BOT: "bottas",
    HAD: "hadjar",
    TSU: "tsunoda",
  };

  const filename = aliases[code];

  if (!filename) {
    return "";
  }

  return `/images/drivers/headshots/${filename}.png`;
}

interface ReplayLeaderboardProps {
  frame: ReplayFrame | null;



driverColors?: ReplayDriverColors;
  driverStatuses?: Record<string, ReplayDriverStatus>;
  selectedDrivers?: string[];
  onDriverSelect?: (code: string) => void;

}

interface DriverEntry {
  code: string;
  position: number;
  lap: number;
  color: string;
  inPit: boolean;
  tyre: string;
  tyreLife: number;
  intervalGap: string;
  leaderGap: string;
  hasTelemetry: boolean;
  relDist: number | null;
  status: string;
}

const FULL_2026_GRID: string[] = [];

const DRIVER_NAMES: Record<string, string> = {
  VER: "VERSTAPPEN",
  NOR: "NORRIS",
  LEC: "LECLERC",
  RUS: "RUSSELL",
  PIA: "PIASTRI",
  HAM: "HAMILTON",
  ANT: "ANTONELLI",
  ALO: "ALONSO",
  STR: "STROLL",
  GAS: "GASLY",
  COL: "COLAPINTO",
  OCO: "OCON",
  BEA: "BEARMAN",
  LAW: "LAWSON",
  LIN: "LINDBLAD",
  ALB: "ALBON",
  SAI: "SAINZ",
  HUL: "HULKENBERG",
  BOR: "BORTOLETO",
  PER: "PEREZ",
  BOT: "BOTTAS",
  HAD: "HADJAR",
};

function getDriverInfo(
  driverColors: ReplayDriverColors | undefined,
  code: string,
) {
  const value = driverColors?.[code];

  if (typeof value === "string") {
    return {
      color: value,
    };
  }

  if (value && typeof value === "object") {
    return {
      color:
        typeof value.color === "string"
          ? value.color
          : "var(--color-accent)",
    };
  }

  return {
    color: "var(--color-accent)",
  };
}

function numberValue(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normaliseCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function getStatusLabel(
  status: ReplayDriverStatus | undefined,
): string {
  if (!status) {
    return "";
  }

  if (status.did_not_start) {
    return "DNS";
  }

  if (status.disqualified) {
    return "DSQ";
  }

  if (status.retired) {
    return "RET";
  }

  return "";
}









function formatSeconds(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `+${value.toFixed(3)}`;
}

export default function ReplayLeaderboard({
  frame,
  driverColors,
  driverStatuses,
  selectedDrivers = [],
  onDriverSelect,
}: ReplayLeaderboardProps) {
  const [gapMode, setGapMode] = useState<"interval" | "leader">(
    "interval",
  );

  const drivers = useMemo<DriverEntry[]>(() => {
    const frameDrivers = frame?.drivers ?? {};

    const telemetry = new Map(
      Object.entries(frameDrivers).map(([rawCode, data]) => [
        normaliseCode(rawCode),
        data,
      ]),
    );

    const statusCodes = Object.keys(driverStatuses ?? {})
      .map(normaliseCode);

    const frameCodes = Object.keys(frameDrivers)
      .map(normaliseCode);

    const codes = [
      ...statusCodes,
      ...frameCodes.filter(
        (code) => !statusCodes.includes(code),
      ),
    ];

    const liveDrivers: DriverEntry[] = [];

    for (const [index, code] of codes.entries()) {
      const data = telemetry.get(code);
      const info = getDriverInfo(driverColors, code);

      if (!data) {
        liveDrivers.push({
          code,
          position: 999,
          lap: frame?.lap ?? 0,
          color: info.color,
          inPit: false,
          tyre: "—",
          tyreLife: 0,
          intervalGap: "—",
          leaderGap: "—",
          hasTelemetry: false,
          relDist: null,
          status: getStatusLabel(
            driverStatuses?.[code],
          ),
        });

        continue;
      }

      const position =
        numberValue(data.position) ?? index + 1;

      const relDist =
        numberValue(data.rel_dist);

      const tyre = String(
        data.tyre ??
          data.compound ??
          "—",
      ).toUpperCase();

      const tyreLife =
        numberValue(
          data.tyre_life ??
            data.tyreLife ??
            0,
        ) ?? 0;

      const inPit =
        data.in_pit === true;

      const rawInterval =
        numberValue(data.interval);

      const rawLeaderGap =
        numberValue(data.gap_to_leader);








      const backendInterval =
        position === 1 || (rawInterval !== null && Math.abs(rawInterval) >= 0.005)
          ? rawInterval
          : null;

      const backendLeaderGap =
        position === 1 || (rawLeaderGap !== null && Math.abs(rawLeaderGap) >= 0.005)
          ? rawLeaderGap
          : null;

      liveDrivers.push({
        code,
        position,
        lap:
          numberValue(data.lap) ??
          frame?.lap ??
          0,
        color: info.color,
        inPit,
        tyre,
        tyreLife,
        intervalGap:
          position === 1
            ? "LEADER"
            : backendInterval !== null
              ? formatSeconds(backendInterval)
              : "—",
        leaderGap:
          position === 1
            ? "LEADER"
            : backendLeaderGap !== null
              ? formatSeconds(backendLeaderGap)
              : "—",
        hasTelemetry: true,
        relDist,
        status: getStatusLabel(
          driverStatuses?.[code],
        ),
      });


    }




    liveDrivers.sort((a, b) => {
      if (a.hasTelemetry !== b.hasTelemetry) {
        return a.hasTelemetry ? -1 : 1;
      }

      if (!a.hasTelemetry && !b.hasTelemetry) {
        const aStatus =
          driverStatuses?.[a.code]?.position ?? 999;

        const bStatus =
          driverStatuses?.[b.code]?.position ?? 999;

        return aStatus - bStatus;
      }

      return a.position - b.position;
    });








    const telemetryDrivers = liveDrivers.filter(
      (driver) => driver.hasTelemetry,
    );

    const leader = telemetryDrivers.find(
      (driver) => driver.position === 1,
    );

    if (leader) {
      for (const driver of telemetryDrivers) {









        if (
          driver.leaderGap === "—" &&
          driver.relDist !== null &&
          leader.relDist !== null
        ) {
          let delta =
            driver.relDist -
            leader.relDist;

          if (delta < 0) {
            delta += 1;
          }

          if (delta > 0.5) {
            delta = 1 - delta;
          }






          driver.leaderGap =
            driver.code === leader.code
              ? "LEADER"
              : `+${delta.toFixed(3)}`;
        }
      }
    }







    for (let i = 0; i < telemetryDrivers.length; i++) {
      const driver = telemetryDrivers[i];

      if (
        driver.intervalGap !== "—"
      ) {
        continue;
      }

      if (i === 0) {
        driver.intervalGap = "LEADER";
        continue;
      }

      const ahead = telemetryDrivers[i - 1];

      if (
        driver.relDist !== null &&
        ahead.relDist !== null
      ) {
        let delta =
          driver.relDist -
          ahead.relDist;

        if (delta < 0) {
          delta += 1;
        }

        if (delta > 0.5) {
          delta = 1 - delta;
        }

        driver.intervalGap =
          `+${delta.toFixed(3)}`;
      }
    }

    return liveDrivers;
  }, [frame, driverColors, driverStatuses]);

  return (
    <aside className="replay-leaderboard">

      <div className="replay-panel-heading">

        <div>
          <strong>LEADERBOARD</strong>
        </div>

        <small>
          {drivers.length} CARS
        </small>

      </div>

      <div
        className="replay-leaderboard-toggle"
        role="group"
        aria-label="Leaderboard gap mode"
      >
        <button
          type="button"
          className={
            gapMode === "interval"
              ? "active"
              : ""
          }
          onClick={() =>
            setGapMode("interval")
          }
          title="Interval to car ahead"
          aria-label="Interval"
        >
          I
        </button>

        <button
          type="button"
          className={
            gapMode === "leader"
              ? "active"
              : ""
          }
          onClick={() =>
            setGapMode("leader")
          }
          title="Gap to leader"
          aria-label="Leader gap"
        >
          L
        </button>
      </div>

      <div className="replay-leaderboard-list">

        {drivers.map((driver) => {
          const displayGap =
            gapMode === "interval"
              ? driver.intervalGap
              : driver.leaderGap;

          return (
            <div
              className={
                "replay-driver-row" +
                (
                  selectedDrivers.some(
                    (selectedCode) =>
                      normaliseCode(selectedCode) ===
                      normaliseCode(driver.code)
                  )
                    ? " is-selected"
                    : ""
                ) +
                (
                  !driver.hasTelemetry
                    ? " replay-driver-no-telemetry"
                    : ""
                )
              }
              key={driver.code}
              onClick={() => onDriverSelect?.(driver.code)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onDriverSelect?.(driver.code);
                }
              }}
            >

              <span className="replay-driver-position">
                {driver.hasTelemetry
                  ? String(
                      driver.position,
                    ).padStart(2, "0")
                  : "—"}
              </span>

              <span
                className="replay-driver-color"
                style={{
                  background:
                    driver.color,
                }}
              />

                <span className="replay-driver-code">
                  <span className="replay-driver-avatar-wrap">
                    <img
                      className="replay-driver-avatar"
                      src={driverImageUrl(driver.code)}
                      alt={driver.code}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </span>

                  <span className="replay-driver-name">
                    {driver.code}
                  </span>
                </span>

                <span
                  className={
                    "replay-driver-status-column" +
                    (
                      driver.status
                        ? " has-status " +
                          (
                            driver.status === "DNS"
                              ? "is-dns"
                              : driver.status === "DSQ"
                                ? "is-dsq"
                                : "is-retired"
                          )
                        : ""
                    )
                  }
                >
                  {driver.status || ""}
                </span>



              {


                 }

              <span className="replay-driver-gap">
                {displayGap}
              </span>

              <span className="replay-driver-tyre">
                {driver.tyre}
              </span>
<strong>
                {driver.hasTelemetry
                  ? `P${driver.position}`
                  : "—"}
              </strong>

            </div>
          );
        })}

        {drivers.length === 0 && (
          <div className="replay-empty-grid">
            WAITING FOR GRID DATA
          </div>
        )}

      </div>

    </aside>
  );
}
