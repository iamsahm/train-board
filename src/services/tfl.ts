interface TflArrival {
  id: string;
  operationType: number;
  vehicleId: string;
  naptanId: string;
  stationName: string;
  lineId: string;
  lineName: string;
  platformName: string;
  direction: string;
  bearing: string;
  destinationNaptanId: string;
  destinationName: string;
  timestamp: string;
  timeToStation: number;
  currentLocation: string;
  towards: string;
  expectedArrival: string;
  timeToLive: string;
  modeName: string;
}

interface TflDepartureBoard {
  stationName: string;
  naptanId: string;
  departures: TflDeparture[];
}

interface TflDeparture {
  lineName: string;
  destinationName: string;
  expectedArrival: string;
  timeToStation: number;
  platformName: string;
  direction: string;
}

export class TflService {
  private readonly baseUrl = "https://api.tfl.gov.uk";
  private readonly appId = process.env.TFL_APP_ID || "dummy";
  private readonly appKey = process.env.TFL_APP_KEY || "";

  async getDlrDepartures(stationId: string): Promise<TflDepartureBoard> {
    const url = `${this.baseUrl}/StopPoint/${stationId}/Arrivals?mode=dlr`;
    const params = new URLSearchParams({
      app_id: this.appId,
      app_key: this.appKey,
    });

    const response = await fetch(`${url}&${params}`);

    if (!response.ok) {
      throw new Error(`TfL API error: ${response.status}`);
    }

    const arrivals: TflArrival[] = await response.json();

    // Sort by expected arrival time
    arrivals.sort(
      (a, b) =>
        new Date(a.expectedArrival).getTime() -
        new Date(b.expectedArrival).getTime()
    );

    const departures: TflDeparture[] = arrivals.map((arrival) => ({
      lineName: arrival.lineName,
      destinationName: arrival.destinationName,
      expectedArrival: arrival.expectedArrival,
      timeToStation: arrival.timeToStation,
      platformName: arrival.platformName,
      direction: arrival.direction,
    }));

    return {
      stationName: arrivals[0]?.stationName || "Unknown Station",
      naptanId: stationId,
      departures,
    };
  }

  async getAllDlrDepartures(): Promise<TflDepartureBoard> {
    const url = `${this.baseUrl}/Mode/dlr/Arrivals`;
    const params = new URLSearchParams({
      app_id: this.appId,
      app_key: this.appKey,
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`TfL API error: ${response.status}`);
    }

    const arrivals: TflArrival[] = await response.json();

    arrivals.sort(
      (a, b) =>
        new Date(a.expectedArrival).getTime() -
        new Date(b.expectedArrival).getTime()
    );

    const departures: TflDeparture[] = arrivals.map((arrival) => ({
      lineName: arrival.lineName,
      destinationName: arrival.destinationName,
      expectedArrival: arrival.expectedArrival,
      timeToStation: arrival.timeToStation,
      platformName: arrival.platformName,
      direction: arrival.direction,
    }));

    return {
      stationName: "All DLR Stations",
      naptanId: "ALL",
      departures,
    };
  }

  formatTimeToStation(seconds: number): string {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
    }
  }
}
