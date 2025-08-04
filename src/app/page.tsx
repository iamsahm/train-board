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
  modes: string[];
  id?: string;
  crs?: string;
}

interface TflDeparture {
  expectedArrival: string;
  destinationName: string;
  platformName: string;
  timeToStation: number;
  lineName: string;
}

interface DarwinService {
  std: string;
  etd: string;
  platform?: string;
  operator: string;
  operatorCode: string;
  destination: Array<{
    locationName: string;
    crs: string;
  }>;
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

        console.log("Fetched station configs:", configs);
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

      const fetchModeData = async (config: StationConfig, mode: string) => {
        try {
          let url = "";
          if (mode === "dlr") {
            if (!config.id) return null;
            url = `/api/departures?stationId=${config.id}&type=dlr`;
          } else if (mode === "rail") {
            if (!config.crs) return null;
            url = `/api/departures?stationCrs=${config.crs}&type=rail`;
          } else {
            return null;
          }

          const response = await fetch(url);
          if (!response.ok) return null;

          const data = await response.json();

          // Handle TfL format
          if (mode === "dlr" && data.departures) {
            return {
              stationName: `${data.stationName} (${mode.toUpperCase()})`,
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
                  platform: dep.platformName || mode.toUpperCase(),
                  status:
                    dep.timeToStation < 60
                      ? "Due"
                      : `${Math.floor(dep.timeToStation / 60)} min`,
                  line: dep.lineName,
                })),
            };
          }

          // Handle Darwin format
          if (mode === "rail" && data.services) {
            return {
              stationName: `${data.locationName} (${mode.toUpperCase()})`,
              departures: data.services.slice(0, 8).map((service: DarwinService) => ({
                time: service.std,
                destination: service.destination[0]?.locationName || "Unknown",
                platform: service.platform,
                status: service.etd,
                line: service.operator,
              })),
            };
          }
        } catch (err) {
          console.error(
            `Error fetching ${mode} departures for ${config.name}:`,
            err
          );
        }
        return null;
      };

      const allRequests = configsToUse.flatMap((config) =>
        config.modes.map((mode) => fetchModeData(config, mode))
      );

      const boards = await Promise.all(allRequests);

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
          {/*  */}
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
