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

import { useTheme } from "@/contexts/ThemeContext";

interface DepartureBoardProps {
  board: StationBoard;
}

const parsePlatform = (platform: string | undefined): string => {
  if (!platform) return "DLR";

  // remove 'Platform ' or 'Platform' prefix
  if (platform.startsWith("Platform ")) {
    return platform.replace("Platform ", "").trim();
  }
  return platform.replace("Platform ", "").replace("Platform", "").trim();
};

export const DepartureBoard = ({ board }: DepartureBoardProps) => {
  const theme = useTheme();

  return (
    <div
      className={`${theme.background} ${theme.text} font-mono border-4 ${theme.border} rounded-lg overflow-hidden shadow-2xl w-full max-w-4xl mx-auto`}
    >
      <div
        className={`${theme.header} px-6 py-3 text-center font-bold text-xl`}
      >
        {board.stationName.toUpperCase()} - DEPARTURES
      </div>

      <div className="p-4">
        <div
          className={`grid grid-cols-12 gap-2 text-sm font-bold border-b border-${theme.accent} pb-2 mb-2`}
        >
          <div className="col-span-2">TIME</div>
          <div className="col-span-5">DESTINATION</div>
          <div className="col-span-2 truncate">PLATFORM</div>
          <div className="col-span-3">TIME REMAINING</div>
        </div>

        {board.departures.map((departure, index) => (
          <div
            key={index}
            className={`grid grid-cols-12 gap-2 text-sm py-2 border-b border-${theme.accent}/20`}
          >
            <div className="col-span-2 font-bold">{departure.time}</div>
            <div className="col-span-5 truncate">{departure.destination}</div>
            <div className="col-span-2 truncate">
              {parsePlatform(departure.platform)}
            </div>
            <div className="col-span-3 truncate">{departure.status}</div>
          </div>
        ))}

        {board.departures.length === 0 && (
          <div className={`text-center py-8 ${theme.text}/70`}>
            No departures available
          </div>
        )}
      </div>
    </div>
  );
};
