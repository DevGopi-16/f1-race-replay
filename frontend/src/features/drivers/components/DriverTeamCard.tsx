interface DriverTeamCardProps {
  teamLogo?: string | null;
  teamDisplayName: string;
  carName?: string | null;
  teamColor: string;
  assetUrl: (path?: string | null) => string;
}

export default function DriverTeamCard({
  teamLogo,
  teamDisplayName,
  carName,
  teamColor,
  assetUrl,
}: DriverTeamCardProps) {
  return (
    <section className="driver-section">

      <div className="driver-section-heading">
        <span>
          02 / TEAM & CAR
        </span>

        <h2>
          Current Team
        </h2>
      </div>

      <div className="driver-team-card">

        {teamLogo && (
          <img
            src={assetUrl(teamLogo)}
            alt={teamDisplayName}
            className="driver-team-card-logo"
          />
        )}

        <div className="driver-team-card-info">
          <span className="driver-team-card-label">
            COMPETING FOR
          </span>

          <strong className="driver-team-card-name">
            {teamDisplayName}
          </strong>
        </div>

        <div className="driver-team-card-car">
          <span className="driver-team-card-car-label">
            CAR
          </span>

          <strong className="driver-team-card-car-name">
            {carName || "-"}
          </strong>
        </div>

                <div
          className="driver-team-card-swatch"
          style={{
            background: teamColor,
          }}
        />

      </div>

      <p className="driver-section-footnote">
        Car specifications aren't
        currently tracked by this app —
        only team affiliation.
      </p>

    </section>
  );
}

        