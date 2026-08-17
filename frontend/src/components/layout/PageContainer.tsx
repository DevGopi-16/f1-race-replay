import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  wide?: boolean;
};

export default function PageContainer({
  children,
  className = "",
  wide = false,
}: PageContainerProps) {
  return (
    <div
      className={[
        "page-container",
        wide ? "page-container-wide" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
