// NOTE: Legacy Razorpay order endpoint — currently UNUSED (payments are
// dormant; see constants/features.ts). Kept for reference only.
// TODO(payments): replace with Apple In-App Purchase + Google Play Billing
// receipt validation when monetization is reconnected. A third-party web
// processor (Razorpay) is not allowed for digital goods on either store.
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
