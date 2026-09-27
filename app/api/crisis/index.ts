import { useEffect, useState } from "react";
import axiosClient from "../axiosClient";
import { getDeviceCountry } from "../../util/functions/deviceCountry";

// Mirrors CrisisResource in sw-be-2/src/config/CrisisResources.ts.
export interface CrisisResource {
  countryCode: string;
  helplineName: string;
  /** Digits only, dialled as tel:<phone>. Empty on the country-neutral resource. */
  phone: string;
  /** How the number is written locally ("116 123"). Falls back to `phone`. */
  phoneDisplay?: string;
  description: string;
  url?: string;
  /** The country's emergency number (999, 112, 000, 111, 911). Absent when unknown. */
  emergencyNumber?: string;
}

/**
 * What the app shows when it cannot ask the backend: a country-neutral route.
 * Never a single country's number. A US-only 988 used to sit here, and it
 * reached everybody whose fetch failed, in countries where 988 connects to
 * nothing. Mirrors DEFAULT in CrisisResources.ts.
 */
export const NEUTRAL_CRISIS_RESOURCE: CrisisResource = {
  countryCode: "DEFAULT",
  helplineName: "Find A Helpline",
  phone: "",
  description:
    "Free, confidential helplines in your country, listed at findahelpline.com. If you're in immediate danger, call your local emergency number.",
  url: "https://findahelpline.com",
};

/**
 * GET /crisis-resources — the backend resolves a helpline by the caller's
 * stored country (or an explicit override), so India gets Tele-MANAS instead
 * of the US-only numbers the Resources screen used to hardcode.
 */
export async function getCrisisResource(
  country?: string,
): Promise<CrisisResource> {
  // Falls back to the device region, so the right helpline shows before the
  // countryCode sync has landed on the server, or if it failed. The server
  // lets this param win over the stored value; both come from the device
  // region, so they agree.
  const resolved = country ?? getDeviceCountry();
  const response = await axiosClient.get("/crisis-resources", {
    params: resolved ? { country: resolved } : undefined,
  });
  return response.data;
}

/** "Call 116 123" / "Find a helpline" — the one label every crisis button uses. */
export function crisisActionLabel(resource: CrisisResource): string {
  const number = resource.phoneDisplay || resource.phone;
  return number ? `Call ${number}` : "Find a helpline";
}

/** tel: for a helpline with a number, else its website. */
export function crisisActionUrl(resource: CrisisResource): string {
  return resource.phone
    ? `tel:${resource.phone}`
    : resource.url ?? NEUTRAL_CRISIS_RESOURCE.url!;
}

/**
 * The caller's country-aware helpline. Starts on the neutral resource so a
 * crisis button is usable on the very first render and stays usable if the
 * fetch fails.
 */
export function useCrisisResource(): CrisisResource {
  const [resource, setResource] = useState<CrisisResource>(
    NEUTRAL_CRISIS_RESOURCE,
  );
  useEffect(() => {
    let cancelled = false;
    getCrisisResource()
      .then((r) => {
        if (!cancelled && r?.helplineName) setResource(r);
      })
      .catch(() => {
        // Keep the neutral resource. Never surface an error on a crisis path.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return resource;
}
