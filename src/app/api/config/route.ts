import { NextResponse } from 'next/server';
import { searchStations } from '@/services/stationSearch';

interface StationConfig {
  name: string;
  mode: string;
  id?: string;
}

export async function GET() {
  try {
    const stations: StationConfig[] = [];
    
    // Get all station configurations from environment variables
    let stationIndex = 1;
    while (true) {
      const stationName = process.env[`STATION_${stationIndex}_NAME`];
      const stationMode = process.env[`STATION_${stationIndex}_MODE`];
      
      if (!stationName || !stationMode) {
        break; // No more stations configured
      }
      
      stations.push({
        name: stationName,
        mode: stationMode
      });
      
      stationIndex++;
    }

    // For each station, fetch its ID using the search service
    const stationsWithIds = await Promise.all(
      stations.map(async (station) => {
        try {
          const results = await searchStations(station.name, station.mode);
          if (results.length > 0) {
            return {
              ...station,
              id: results[0].id
            };
          }
          
          console.warn(`Could not find ID for station: ${station.name}`);
          return station;
        } catch (error) {
          console.error(`Error fetching ID for ${station.name}:`, error);
          return station;
        }
      })
    );

    return NextResponse.json(stationsWithIds);
  } catch (error) {
    console.error('Config API error:', error);
    return NextResponse.json(
      { error: 'Failed to load station configuration' }, 
      { status: 500 }
    );
  }
}