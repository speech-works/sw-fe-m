import axiosClient from "../axiosClient";

export type CreateRPOrderReq = {
  userId: string;
  amount: number; // Amount in the currency's minor unit
  currency: string; // e.g., "USD"
};

export async function createRazorpayOrder({
  userId,
  amount,
  currency,
}: CreateRPOrderReq) {
  try {
    const response = await axiosClient.post(`/razorpay/create-order`, {
      userId,
      amount,
      currency,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating razorpay payment order:", error);
    throw error;
  }
}
