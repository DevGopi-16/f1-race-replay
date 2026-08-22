import { Outlet } from "react-router-dom";

import FloatingNav from "../navigation/FloatingNav";

export default function AppShell() {
  return (
    <div className="app-shell cinematic-bg">
      <FloatingNav />

      <main className="app-shell-content">
        <Outlet />
      </main>
    </div>
  );
}
