import { useEffect, useState } from "react";

interface DriverAvatarProps {
  /** Jolpica driverId, e.g. "hamilton", "max_verstappen" */
  id?: string;
  code?: string;
  name: string;
  /** If given, tries that season's headshot first (e.g. hamilton-2019.png) */
  year?: number;
  size?: number;
}

function initialsOf(name: string, code?: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (code ?? name).slice(0, 2).toUpperCase();
}

/**
 * Shows /drivers/<id>-<year>.png, then /drivers/<id>.png, then /drivers/<id>.jpg,
 * and finally the driver's initials if none of them exist.
 */
export default function DriverAvatar({
  id,
  code,
  name,
  year,
  size = 32,
}: DriverAvatarProps) {
  const candidates = id
    ? [
        ...(year ? [`/drivers/${id}-${year}.png`] : []),
        `/drivers/${id}.png`,
        `/drivers/${id}.jpg`,
      ]
    : [];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [id, year]);

  const style = { width: size, height: size };
  const src = candidates[index];

  if (!src) {
    return (
      <div className="dv-avatar is-fallback" style={style} aria-hidden="true">
        {initialsOf(name, code)}
      </div>
    );
  }

  return (
    <img
      className="dv-avatar"
      style={style}
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}