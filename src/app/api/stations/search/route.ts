import { NextRequest, NextResponse } from "next/server";
import { searchStations } from "@/services/stationSearch";

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
    const results = await searchStations(query, mode);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Station search error:", error);
    return NextResponse.json(
      { error: "Failed to search stations" },
      { status: 500 }
    );
  }
}
