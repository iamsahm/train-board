import { NextRequest, NextResponse } from "next/server";

interface TflStopPoint {
  id: string;
  naptanId: string;
  commonName: string;
  placeType: string;
  lat: number;
  lon: number;
  modes: string[];
}

interface TflChildStation {
  id: string;
  naptanId: string;
  modes: string[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const mode = searchParams.get("mode") || "dlr"; // default to DLR

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const appId = process.env.TFL_APP_ID || "dummy";
    const appKey = process.env.TFL_APP_KEY || "";

    const url = `https://api.tfl.gov.uk/StopPoint/Search/${encodeURIComponent(
      query
    )}`;
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      modes: mode,
    });

    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`TfL API error: ${response.status}`);
    }

    const data = await response.json();
    const stopPoints: TflStopPoint[] = data.matches || [];

    // For each station, if it's a hub, check for child stations with the specific mode
    const results = await Promise.all(
      stopPoints
        .filter((stop) => stop.modes && stop.modes.includes(mode))
        .map(async (stop) => {
          let stationId = stop.naptanId || stop.id;

          // If this is a hub station, try to find the specific child station for the mode
          if (stop.modes.length > 1) {
            try {
              const detailParams = new URLSearchParams({
                app_id: appId,
                app_key: appKey,
              });
              const detailResponse = await fetch(
                `https://api.tfl.gov.uk/StopPoint/${stop.id}?${detailParams}`
              );

              if (detailResponse.ok) {
                const detailData = await detailResponse.json();

                console.log(`Detail data for ${stop.id}:`, detailData);
                // Look for child stations with the specific mode
                if (detailData.children) {
                  const childStation = detailData.children.find(
                    (child: TflChildStation) => child.modes && child.modes.includes(mode)
                  );

                  if (childStation) {
                    stationId = childStation.naptanId || childStation.id;
                  }
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch details for ${stop.id}:`, err);
            }
          }

          return {
            id: stationId,
            name: stop.commonName,
            modes: stop.modes,
            coordinates: {
              lat: stop.lat,
              lon: stop.lon,
            },
          };
        })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Station search error:", error);
    return NextResponse.json(
      { error: "Failed to search stations" },
      { status: 500 }
    );
  }
}
