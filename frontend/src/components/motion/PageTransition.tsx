import type { ReactNode } from "react";

type PageTransitionProps = {
  children: ReactNode;
};

export default function PageTransition({
  children,
}: PageTransitionProps) {
  return (
    <div className="page-transition">
      {children}
    </div>
  );
}
