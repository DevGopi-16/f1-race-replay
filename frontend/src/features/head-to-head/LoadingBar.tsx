import { useEffect, useState } from "react";
import "./LoadingBar.css";

interface LoadingBarProps {
  label?: string;
  compact?: boolean;
}

function LoadingBar({
  label = "Loading comparison…",
  compact = false,
}: LoadingBarProps) {
  const [progress, setProgress] = useState(6);

  useEffect(() => {
    const id = window.setInterval(() => {
      setProgress((p) => (p >= 92 ? p : p + (92 - p) * 0.08 + 0.4));
    }, 200);

    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={`h2h-loadbar${compact ? " h2h-loadbar--compact" : ""}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
    >
      <div className="h2h-loadbar-head">
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>

      <div className="h2h-loadbar-track">
        <div
          className="h2h-loadbar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default LoadingBar;