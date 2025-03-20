import { API_BASE_URL } from "..";
import { User } from "../users";

export interface Subscription {
  id: string;
  user: User;
  /**
   * The Stripe subscription identifier.
   * Typically something like "sub_abc123" from Stripe.
   */
  stripeSubscriptionId: string;
  /**
   * The subscription status, e.g. 'active', 'canceled', 'paused'.
   * Adjust these as needed for your business logic.
   */
  status: "active" | "canceled" | "paused";
  /**
   * When the subscription starts (or started).
   */
  startDate: Date;
  /**
   * When the subscription ends (or ended).
   * Can be null if it's ongoing or indefinite.
   */
  endDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// get all subscriptions
export async function getAllSubscriptionsOfUser(
  userId: string
): Promise<Subscription[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/subscriptions?userId=${userId}`
    );
    return await response.json();
  } catch (error) {
    console.error(
      "There was a problem with the getAllSubscriptionsOfUser operation:",
      error
    );
    throw error;
  }
}

// get subscription by id
export async function getSubscriptionById(
  subId: string
): Promise<Subscription | { error: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/subscriptions/${subId}`);
    return await response.json();
  } catch (error) {
    console.error(
      "There was a problem with the getSubscriptionById operation:",
      error
    );
    throw error;
  }
}

// create a new subscription
export async function createSubscription(subscriptionData: {
  userId: string;
  stripeSubscriptionId: string;
  status?: "active" | "canceled" | "paused";
  startDate: Date;
  endDate?: Date | null;
}): Promise<Subscription | { error: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionData),
    });

    return await response.json();
  } catch (error) {
    console.error(
      "There was a problem with the createSubscription operation:",
      error
    );
    throw error;
  }
}

// update subscription status (e.g. canceled) or endDate
export async function updateSubscriptionById(
  subId: string,
  subscriptionData: {
    status?: "active" | "canceled" | "paused";
    endDate?: Date | null;
  }
): Promise<Subscription | { error: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/subscriptions/${subId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionData),
    });

    return await response.json();
  } catch (error) {
    console.error(
      "There was a problem with the updateSubscriptionById operation:",
      error
    );
    throw error;
  }
}

// delete subscription
export async function deleteSubscriptionById(
  subId: string
): Promise<void | { error: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/subscriptions/${subId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  } catch (error) {
    console.error(
      "There was a problem with the deleteSubscriptionById operation:",
      error
    );
    throw error;
  }
}
