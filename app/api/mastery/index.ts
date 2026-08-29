import axiosClient from "../axiosClient";
import { ProgramMastery } from "./types";

/**
 * What this user's quiz answers say about one program.
 *
 * Keyed by packId, like the rest of the pack routes. The server knows that the
 * quiz record is filed under the catalogKey and does the translation, so
 * nothing here needs to know there are two identifiers.
 */
export async function getPackMastery(packId: string): Promise<ProgramMastery> {
  const response = await axiosClient.get<ProgramMastery>(
    `/packs/${packId}/mastery`,
  );
  return response.data ?? { program: null, days: [] };
}
