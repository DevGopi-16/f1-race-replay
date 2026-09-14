import {
  Activity,
  BarChart3,
  CarFront,
  Calendar,
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

  {
    label: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
];

export const moreNavigation: NavigationItem[] = [
  {
    label: "Calendar",
    path: "/calendar",
    icon: Calendar,
  },

  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];