import { apiGet } from "./client";

export interface DriverPanelData {
  [key: string]: unknown;
}

export interface DriverListItem {
  [key: string]: unknown;
}

export async function getDriversPanel(
  year: number,
  round?: number,
): Promise<DriverPanelData[]> {
  const params = new URLSearchParams();

  params.set("year", String(year));

  if (round !== undefined) {
    params.set("round", String(round));
  }

  return apiGet<DriverPanelData[]>(
    `/drivers/panel?${params.toString()}`,
  );
}

export async function getSessionDrivers(
  year: number,
  round?: number,
): Promise<DriverListItem[]> {
  const params = new URLSearchParams();

  params.set("year", String(year));

  if (round !== undefined) {
    params.set("round", String(round));
  }

  return apiGet<DriverListItem[]>(
    `/drivers?${params.toString()}`,
  );
}

export async function getDriver(
  code: string,
): Promise<DriverPanelData> {
  return apiGet<DriverPanelData>(
    `/driver/${encodeURIComponent(code)}`,
  );
}

export async function getDriverFull(
  code: string,
  year: number,
): Promise<DriverPanelData> {
  const params = new URLSearchParams({ year: String(year) });
  return apiGet<DriverPanelData>(
    `/drivers/${encodeURIComponent(code)}/full?${params.toString()}`,
  );
}

