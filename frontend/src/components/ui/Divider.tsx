type DividerProps = {
  className?: string;
};

export default function Divider({
  className = "",
}: DividerProps) {
  return (
    <div
      className={`ui-divider ${className}`.trim()}
      aria-hidden="true"
    />
  );
}
