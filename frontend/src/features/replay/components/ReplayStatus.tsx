interface Props {
  type: "loading" | "error";
  message: string;
}

export default function ReplayStatus({
  type,
  message,
}: Props) {
  return (
    <section
      className={`replay-status replay-status-${type}`}
    >
      <div className="replay-status-dot" />

      <div>
        <strong>
          {type === "loading"
            ? "LOADING REPLAY"
            : "REPLAY UNAVAILABLE"}
        </strong>

        <p>{message}</p>
      </div>
    </section>
  );
}
