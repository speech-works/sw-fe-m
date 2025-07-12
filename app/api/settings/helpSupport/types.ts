export interface ReportedIssue {
  id: string;
  userId: string;
  userEmail: string;
  issueType: string;
  description: string;
  screenshotUrls?: string[];
  deviceInfo?: string;
  createdAt: string;
}

export interface CreateReportedIssuePayload {
  userId: string;
  userEmail?: string;
  issueType: string;
  description: string;
  screenshotUrls?: string[];
  deviceInfo?: string;
}

export interface AppFeedback {
  id: string;
  userEmail?: string;
  suggestedFeatures?: string;
  reportedFrustration?: string;
  otherThoughts?: string;
  createdAt: string;
}

export interface CreateAppFeedbackPayload {
  userEmail?: string;
  suggestedFeatures?: string;
  reportedFrustration?: string;
  otherThoughts?: string;
}
