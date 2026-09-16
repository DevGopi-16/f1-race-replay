interface DriverBioProps {
  firstName: string;
  description: string;
  born: string;
  age: number;
  nationality: string;
  debut: string;
  getNationalityFlag: (nationality: string) => string;
}

export default function DriverBio({
  firstName,
  description,
  born,
  age,
  nationality,
  debut,
  getNationalityFlag,
}: DriverBioProps) {
  return (
    <section className="driver-section">

      <div className="driver-section-heading">
        <span>
          01 / BIOGRAPHY
        </span>

        <h2>
          About {firstName}
        </h2>
      </div>

      <div className="driver-bio-card">

        <p className="driver-bio-text">
          {description}
        </p>

        <div className="driver-bio-facts">

          {born && (
            <div className="driver-bio-fact">
              <span>
                BORN
              </span>

              <strong>
                {born}
              </strong>
            </div>
          )}

          {age > 0 && (
            <div className="driver-bio-fact">
              <span>
                AGE
              </span>

              <strong>
                {age}
              </strong>
            </div>
          )}

          {nationality && (
            <div className="driver-bio-fact">
              <span>
                NATIONALITY
              </span>

              <strong>
                <span className="flag-icon">
                  {getNationalityFlag(nationality)}
                </span>
                {nationality}
              </strong>
            </div>
          )}

          {debut && (
            <div className="driver-bio-fact">
              <span>
                F1 DEBUT
              </span>

              <strong>
                {debut}
              </strong>
            </div>
          )}

        </div>

      </div>

    </section>
  );
}
