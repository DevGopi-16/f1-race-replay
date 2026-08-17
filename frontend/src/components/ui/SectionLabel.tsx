type SectionLabelProps = {
  children: string;
  number?: string;
};

export default function SectionLabel({
  children,
  number,
}: SectionLabelProps) {
  return (
    <div className="section-label">
      {number && (
        <span className="section-label-number">
          {number}
        </span>
      )}

      <span className="section-label-line" />

      <span className="section-label-text">
        {children}
      </span>
    </div>
  );
}
