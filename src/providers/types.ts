import type { ProviderResult } from "../types.ts";

export interface Provider {
  name: string;
  query(prompt: string): Promise<ProviderResult>;
}
