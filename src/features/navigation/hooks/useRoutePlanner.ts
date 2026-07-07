import { useCallback } from "react";
import type { Route } from "../types";
import { getRoute } from "../data/routes";

export function useRoutePlanner() {
  const lookup = useCallback(
    (fromCode: string | undefined, toCode: string | undefined): Route | undefined => {
      if (!fromCode || !toCode) return undefined;
      if (fromCode === toCode) return undefined;
      return getRoute(fromCode, toCode);
    },
    []
  );

  return { lookup };
}
