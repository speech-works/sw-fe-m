import axiosClient from "../axiosClient";

// Mirrors CrisisResource in sw-be-2/src/config/CrisisResources.ts.
export interface CrisisResource {
  countryCode: string;
  helplineName: string;
  phone: string;
  description: string;
  url?: string;
}

/**
 * GET /crisis-resources — the backend resolves a helpline by the caller's
 * stored country (or an explicit override), so India gets Tele-MANAS instead
 * of the US-only numbers the Resources screen used to hardcode.
 */
export async function getCrisisResource(
  country?: string,
): Promise<CrisisResource> {
  const response = await axiosClient.get("/crisis-resources", {
    params: country ? { country } : undefined,
  });
  return response.data;
}
