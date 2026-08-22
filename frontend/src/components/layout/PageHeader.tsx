import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {eyebrow && (
          <div className="page-header-eyebrow">
            <span className="page-header-eyebrow-line" />
            <span>{eyebrow}</span>
          </div>
        )}

        <h1 className="page-header-title">
          {title}
        </h1>

        {description && (
          <p className="page-header-description">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="page-header-action">
          {action}
        </div>
      )}
    </header>
  );
}
