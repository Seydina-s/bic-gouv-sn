import { use } from "react";
import { ThemeContext, type ThemeContextValue } from "./ThemeProvider";

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext);
  if (context === null) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}
