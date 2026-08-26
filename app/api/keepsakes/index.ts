import axiosClient from "../axiosClient";
import { Keepsake } from "./types";

/**
 * The cards this user has finished, newest first.
 *
 * One per program: the plan, the card, the routine they wrote in their own
 * words on the last day. Empty until they finish a program that ends with one.
 */
export async function getKeepsakes(): Promise<Keepsake[]> {
  const response = await axiosClient.get<Keepsake[]>("/users/me/keepsakes");
  return Array.isArray(response.data) ? response.data : [];
}
