import { NextResponse } from 'next/server';
import { searchStations } from '@/services/stationSearch';

interface StationConfig {
  name: string;
  modes: string[];
  id?: string;
  crs?: string;
}

export async function GET() {
  try {
    const stations: StationConfig[] = [];
    
    // Get all station configurations from environment variables
    let stationIndex = 1;
    while (true) {
      const stationName = process.env[`STATION_${stationIndex}_NAME`];
      const stationMode = process.env[`STATION_${stationIndex}_MODE`];
      const stationCrs = process.env[`STATION_${stationIndex}_CRS`];
      
      if (!stationName || !stationMode) {
        break; // No more stations configured
      }
      
      // Collect all modes for this station
      const modes = [stationMode];
      let modeIndex = 2;
      while (true) {
        const additionalMode = process.env[`STATION_${stationIndex}_MODE_${modeIndex}`];
        if (!additionalMode) break;
        modes.push(additionalMode);
        modeIndex++;
      }
      
      stations.push({
        name: stationName,
        modes,
        ...(stationCrs && { crs: stationCrs })
      });
      
      stationIndex++;
    }

    // For each station, fetch required IDs based on modes
    const stationsWithIds = await Promise.all(
      stations.map(async (station) => {
        const updatedStation = { ...station };
        
        try {
          // For stations with DLR mode, search for TfL ID
          if (station.modes.includes('dlr')) {
            const results = await searchStations(station.name, 'dlr');
            if (results.length > 0) {
              updatedStation.id = results[0].id;
            } else {
              console.warn(`Could not find TfL ID for DLR station: ${station.name}`);
            }
          }
          
          // For stations with rail mode, ensure CRS code is present
          if (station.modes.includes('rail')) {
            if (!station.crs) {
              console.warn(`CRS code missing for rail station: ${station.name}`);
            }
          }
          
          return updatedStation;
        } catch (error) {
          console.error(`Error processing station ${station.name}:`, error);
          return updatedStation;
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