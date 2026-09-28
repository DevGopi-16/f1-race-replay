const COUNTRY_TO_FLAG_CODE: Record<string, string> = {
  Australia: "AU",
  Austria: "AT",
  Azerbaijan: "AZ",
  Bahrain: "BH",
  Belgium: "BE",
  Brazil: "BR",
  Canada: "CA",
  China: "CN",
  France: "FR",
  Germany: "DE",
  Hungary: "HU",
  Italy: "IT",
  Japan: "JP",
  Mexico: "MX",
  Monaco: "MC",
  Netherlands: "NL",
  Qatar: "QA",
  "Saudi Arabia": "SA",
  Singapore: "SG",
  Spain: "ES",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  "United States": "US",
  "USA": "US",
};

export function getFlagEmoji(country: string): string {
  const code = COUNTRY_TO_FLAG_CODE[country];
  if (!code) return "";

  return code
    .toUpperCase()
    .replace(/./g, (char) =>
      String.fromCodePoint(127397 + char.charCodeAt(0)),
    );
}