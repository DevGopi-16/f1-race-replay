import React from "react";
import PageTransition from "../../components/motion/PageTransition";
import PageHeader from "../../components/layout/PageHeader";
import Reveal from "../../components/motion/Reveal";
import "./legal.css";

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}






export default function LegalPage({
  title,
  lastUpdated,
  children,
}: LegalPageProps) {
  return (
    <PageTransition>
      <div className="legal-shell">
        <Reveal>
          <a href="/" className="legal-back">
            ← Back to F1 Race Vision
          </a>

          <PageHeader
            eyebrow="LEGAL"
            title={title}
            description={`Last updated: ${lastUpdated}`}
          />
        </Reveal>

        <div className="legal-body">{children}</div>
      </div>
    </PageTransition>
  );
}