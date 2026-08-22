import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: "none" | "short" | "medium" | "long";
};

export default function Reveal({
  children,
  className = "",
  delay = "none",
}: RevealProps) {
  return (
    <div
      className={[
        "reveal",
        `reveal-delay-${delay}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
