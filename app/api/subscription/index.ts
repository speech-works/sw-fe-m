// api/subscriptions.ts
import axiosClient from "../axiosClient";
import { User } from "../users";

export interface Subscription {
  id: string;
  user: User;
  stripeSubscriptionId: string;
  status: "active" | "canceled" | "paused";
  startDate: Date;
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Get all subscriptions of a user
export async function getAllSubscriptionsOfUser(
  userId: string
): Promise<Subscription[]> {
  try {
    const response = await axiosClient.get("/subscriptions", {
      params: { userId },
    });
    return response.data;
  } catch (error) {
    console.error("Error getting subscriptions for user:", error);
    throw error;
  }
}

// Get subscription by ID
export async function getSubscriptionById(
  subId: string
): Promise<Subscription> {
  try {
    const response = await axiosClient.get(`/subscriptions/${subId}`);
    return response.data;
  } catch (error) {
    console.error("Error getting subscription by ID:", error);
    throw error;
  }
}

// Create a new subscription
export async function createSubscription(subscriptionData: {
  userId: string;
  stripeSubscriptionId: string;
  status?: "active" | "canceled" | "paused";
  startDate: Date;
  endDate?: Date | null;
}): Promise<Subscription> {
  try {
    const response = await axiosClient.post("/subscriptions", subscriptionData);
    return response.data;
  } catch (error) {
    console.error("Error creating subscription:", error);
    throw error;
  }
}

// Update subscription (status or endDate)
export async function updateSubscriptionById(
  subId: string,
  subscriptionData: {
    status?: "active" | "canceled" | "paused";
    endDate?: Date | null;
  }
): Promise<Subscription> {
  try {
    const response = await axiosClient.patch(
      `/subscriptions/${subId}`,
      subscriptionData
    );
    return response.data;
  } catch (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
}

// Delete a subscription
export async function deleteSubscriptionById(subId: string): Promise<void> {
  try {
    await axiosClient.delete(`/subscriptions/${subId}`);
  } catch (error) {
    console.error("Error deleting subscription:", error);
    throw error;
  }
}
