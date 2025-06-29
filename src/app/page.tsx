"use client";
import { useEffect, useState } from "react";
import { REFRESH_INTERVAL } from "./constants";
import { DepartureBoard } from "@/components/DepartureBoard";
import { useTheme } from "@/contexts/ThemeContext";

interface Departure {
  time: string;
  destination: string;
  platform?: string;
  status: string;
  line?: string;
}

interface StationBoard {
  stationName: string;
  departures: Departure[];
}

interface StationConfig {
  name: string;
  mode: string;
  id?: string;
}

interface TflDeparture {
  expectedArrival: string;
  destinationName: string;
  platformName: string;
  timeToStation: number;
  lineName: string;
}

export default function Home() {
  const theme = useTheme();
  const [stationBoards, setStationBoards] = useState<StationBoard[]>([]);
  const [stationConfigs, setStationConfigs] = useState<StationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(
    REFRESH_INTERVAL / 1000
  );

  const fetchStationConfigs = async () => {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const configs = await response.json();
        setStationConfigs(configs);
        return configs;
      }
    } catch (err) {
      console.error("Error fetching station configs:", err);
    }
    return [];
  };

  const fetchDepartures = async (configs?: StationConfig[]) => {
    try {
      setLoading(true);
      setError(null);

      // Use provided configs, or fetch them if not already in state
      let configsToUse = configs;
      if (!configsToUse) {
        if (stationConfigs.length > 0) {
          configsToUse = stationConfigs;
        } else {
          configsToUse = await fetchStationConfigs();
        }
      }

      if (!configsToUse || configsToUse.length === 0) {
        setError("No stations configured");
        return;
      }

      const boards = await Promise.all(
        configsToUse.map(async (config) => {
          if (!config.id) {
            return null;
          }

          try {
            const response = await fetch(
              `/api/departures?stationId=${config.id}&type=${config.mode}`
            );

            if (response.ok) {
              const data = await response.json();
              return {
                stationName: data.stationName,
                departures: data.departures
                  .slice(0, 8)
                  .map((dep: TflDeparture) => ({
                    time: new Date(dep.expectedArrival).toLocaleTimeString(
                      "en-GB",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    ),
                    destination: dep.destinationName,
                    platform: dep.platformName || config.mode.toUpperCase(),
                    status:
                      dep.timeToStation < 60
                        ? "Due"
                        : `${Math.floor(dep.timeToStation / 60)} min`,
                    line: dep.lineName,
                  })),
              };
            }
          } catch (err) {
            console.error(`Error fetching departures for ${config.name}:`, err);
          }

          return null;
        })
      );

      setStationBoards(boards.filter(Boolean) as StationBoard[]);
      setSecondsUntilRefresh(REFRESH_INTERVAL / 1000); // Reset countdown after successful fetch
    } catch (err) {
      setError("Failed to fetch departure information");
      console.error("Error fetching departures:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      const configs = await fetchStationConfigs();
      if (configs.length > 0) {
        await fetchDepartures(configs);
      }
    };

    initializeApp();
    const interval = setInterval(() => {
      fetchDepartures();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer effect
  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          return REFRESH_INTERVAL / 1000; // Reset when it hits 0
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-4 relative">
      {loading && (
        <div className="fixed top-4 left-4 z-[9999]">
          <div
            className={`${theme.background} ${theme.text} px-3 py-2 rounded-lg border ${theme.border} flex items-center gap-2`}
          >
            <div
              className={`w-4 h-4 border-2 ${theme.border} border-t-transparent rounded-full animate-spin`}
            ></div>
            <span className="text-sm font-mono">Loading...</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto space-y-8">
        {error && (
          <div className="text-center text-red-400 bg-red-900/20 p-4 rounded">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {stationBoards.map((board, index) => (
            <DepartureBoard key={index} board={board} />
          ))}
        </div>

        {stationBoards.length > 0 && (
          <div className="text-center text-slate-400 text-sm">
            Next update in{" "}
            <span className="inline-block w-4 text-center font-mono">
              {secondsUntilRefresh}
            </span>
            s • DLR data from TfL • Rail data pending Darwin API approval
          </div>
        )}
      </div>
    </div>
  );
}
