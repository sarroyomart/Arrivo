import { createContext, useContext } from "react";

import { colors, type AppPalette } from "@/src/constants/palette";

const PaletteContext = createContext<AppPalette>(colors.light);

export const PaletteProvider = PaletteContext.Provider;

/** Brand + surface colors for the current scheme, including the system accent. */
export function usePalette(): AppPalette {
  return useContext(PaletteContext);
}
