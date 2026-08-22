export type ReplaySessionType =
  | "R"
  | "S"
  | "FP1"
  | "FP2"
  | "FP3";

export interface ReplayMeta {
  event_name: string;
  circuit_name: string;
  country: string;
  year: number;
  round: number;
  date: string;
  total_laps: number;
  session_type: ReplaySessionType;
}

export interface DriverColor {
  color?: string;
  name?: string;
  abbreviation?: string;
}

export interface ReplayDriverColors {
  [driverCode: string]: string | DriverColor;
}

export interface ReplayTrackPoint {
  x: number;
  y: number;
}

export interface ReplayCorner {
  number: number;
  letter: string;
  angle: number;
  distance: number;
  x: number;
  y: number;
}

export interface ReplayTrack {
  centerline?: [number, number][];
  inner?: [number, number][];
  outer?: [number, number][];
  start_finish?: unknown;
  sectors?: unknown;
  sector_segments?: unknown;
  drs_zones?: unknown;
  bounds?: unknown;
  corners?: ReplayCorner[];

  points?: ReplayTrackPoint[];
  x?: number[];
  y?: number[];

  [key: string]: unknown;
}

export interface ReplayDriverData {
  x?: number;
  y?: number;

  lap?: number;
  tyre?: string | number;
  tyre_life?: number;

  position?: number;

  rel_dist?: number;
  dist?: number;

  speed?: number;
  gear?: number;

  drs?: number | boolean;

  throttle?: number;
  brake?: number;

  in_pit?: boolean;

  ahead?: unknown;
  behind?: unknown;

  [key: string]: unknown;
}

export interface ReplayFrame {
  t: number;
  lap?: number;

  drivers: {
    [driverCode: string]: ReplayDriverData;
  };

  weather?: unknown;

  [key: string]: unknown;
}

export interface ReplayEvent {
  [key: string]: unknown;
}

export interface ReplayDriverStatus {
  status: string;
  position: number | null;
  laps_completed: number;
  classified: boolean;
  did_not_start: boolean;
  retired: boolean;
  disqualified: boolean;
}

export interface ReplayResponse {
  meta: ReplayMeta;

  driver_statuses?: Record<string, ReplayDriverStatus>;

  driver_colors: ReplayDriverColors;

  max_tyre_life: Record<string, number>;

  track: ReplayTrack;

  events: ReplayEvent[];

  frames: ReplayFrame[];

  frame_rate: number;

  /*
   * Total number of sampled frames available on the backend.
   * This is different from frames.length because replay data
   * is loaded progressively in chunks.
   */
  total_frames?: number;
}
