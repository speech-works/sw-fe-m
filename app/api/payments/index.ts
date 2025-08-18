import axiosClient from "../axiosClient";

export type CreateRPOrderReq = {
  userId: string;
  amount: number; // Amount in paise
  currency: string; // e.g., "INR"
};

export async function createRazorpayOrder({
  userId,
  amount,
  currency = "INR",
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
