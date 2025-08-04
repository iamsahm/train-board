"use client";
import { createContext, useContext, ReactNode } from "react";

interface Theme {
  name: string;
  background: string;
  text: string;
  border: string;
  header: string;
  accent: string;
}

const themes = {
  yellow: {
    name: "Underground Classic",
    background: "bg-black",
    text: "text-yellow-400",
    border: "border-yellow-400",
    header: "bg-yellow-400 text-black",
    accent: "yellow-400",
  },
  lilac: {
    name: "Lilac Dreams",
    background: "bg-purple-950",
    text: "text-purple-200",
    border: "border-purple-300",
    header: "bg-purple-300 text-purple-950",
    accent: "purple-300",
  },
  blue: {
    name: "Ocean Blue",
    background: "bg-blue-950",
    text: "text-blue-200",
    border: "border-blue-300",
    header: "bg-blue-300 text-blue-950",
    accent: "blue-300",
  },
};

const ThemeContext = createContext<Theme>(themes.yellow);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeColor = process.env.NEXT_PUBLIC_THEME_COLOR || "yellow";
  const theme = themes[themeColor as keyof typeof themes] || themes.yellow;

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
