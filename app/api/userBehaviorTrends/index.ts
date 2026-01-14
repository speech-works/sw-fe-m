import axiosClient from "../axiosClient";
import {
  ClinicalDomain,
  UserBehaviorHistoricalTrend,
  UserBehaviorTrendsResponse,
  GrowthProfile,
  WeeklyBreakthroughs,
} from "./types";

/**
 * Fetches the user's clinical trends (scores and history) from the backend.
 * Endpoint: GET /trends
 */
export const getUserBehaviorTrends = async (
  domain: ClinicalDomain
): Promise<UserBehaviorTrendsResponse> => {
  try {
    const response = await axiosClient.get("/trends", { params: { domain } });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserBehaviorHistoricalTrend = async (
  domain: ClinicalDomain
): Promise<UserBehaviorHistoricalTrend> => {
  const trends = await getUserBehaviorTrends(domain);

  // Safety check: ensure we received an array with data
  if (!Array.isArray(trends) || trends.length === 0) {
    throw new Error(`No historical data found for domain: ${domain}`);
  }

  // 1. Sort by date descending (Newest -> Oldest) to identify the "current" score
  const sortedTrends = [...trends].sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const latestRecord = sortedTrends[0];

  // 2. Map raw data to the ClinicalTrendDataPoint structure
  const history = sortedTrends.map((item: any) => ({
    date: item.createdAt,
    score: item.value,
  }));

  // 3. Return the aggregated UserBehaviorTrend object
  return {
    domain: domain,
    currentScore: latestRecord.value,
    history: history,
  };
};

export const getGrowthProfile = async (): Promise<GrowthProfile> => {
  try {
    const response = await axiosClient.get("/users/me/growth-profile");
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getWeeklyBreakthroughs =
  async (): Promise<WeeklyBreakthroughs> => {
    try {
      const response = await axiosClient.get("/users/me/weekly-breakthroughs");
      return response.data;
    } catch (error) {
      throw error;
    }
  };
