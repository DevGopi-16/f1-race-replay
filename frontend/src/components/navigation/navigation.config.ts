import {
  Activity,
  CarFront,
  Gauge,
  Home,
  Radio,
  Settings,
  Users,
  Zap,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  path: string;
  icon: typeof Home;
};

export const primaryNavigation: NavigationItem[] = [
  {
    label: "Home",
    path: "/",
    icon: Home,
  },
  {
    label: "Replay",
    path: "/replay",
    icon: Radio,
  },
  {
    label: "Sessions",
    path: "/sessions",
    icon: Activity,
  },
  {
    label: "Drivers",
    path: "/drivers",
    icon: Users,
  },
  {
    label: "Teams",
    path: "/constructors",
    icon: CarFront,
  },
  {
    label: "Telemetry",
    path: "/telemetry",
    icon: Gauge,
  },
  {
    label: "Timing",
    path: "/timing",
    icon: Zap,
  },
];

export const secondaryNavigation: NavigationItem[] = [
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];
