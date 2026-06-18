export const SUBSCRIPTION_PRICING = {
  locale: "en-US",
  currencyCode: "USD",
  plans: {
    monthly: {
      amountMinor: 1199,
      displayAmount: 11.99,
      headline: "$11.99",
      periodLabel: "/month",
      supportingCopy: "Billed monthly",
    },
    annual: {
      amountMinor: 11880,
      displayAmount: 118.8,
      monthlyEquivalent: 9.9,
      headline: "$9.90",
      periodLabel: "/month",
      savingsPercent: 17,
      billedYearlyCopy: "Billed annually at $118.80",
    },
  },
} as const;
