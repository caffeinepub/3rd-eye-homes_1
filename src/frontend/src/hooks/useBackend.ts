import type { backendInterface } from "../backend";
import { useActor } from "./useActor";

export function useBackend(): backendInterface | null {
  const { actor } = useActor();
  return actor;
}
