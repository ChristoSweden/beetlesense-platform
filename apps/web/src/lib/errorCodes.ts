/**
 * BeetleSense Error Code System
 *
 * Every error in the app carries a unique code: [MODULE]-[NUMBER]
 * See /docs/error-codes.md for full documentation.
 */

export type ErrorModule =
  | 'AUTH'
  | 'DB'
  | 'API'
  | 'UI'
  | 'FEED'
  | 'ADMIN'
  | 'MAP'
  | 'SURVEY'
  | 'COMPANION'
  | 'UPLOAD'
  | 'PARCEL'
  | 'REPORT';

export interface AppError {
  code: string;
  module: ErrorModule;
  message: string;
  userMessage: string;
  action: string;
}

// ─── Error Code Registry ───

export const ERROR_CODES: Record<string, AppError> = {
  // Auth errors
  'AUTH-001': { code: 'AUTH-001', module: 'AUTH', message: 'Login failed', userMessage: 'We couldn\'t sign you in.', action: 'Check your email and password, then try again.' },
  'AUTH-002': { code: 'AUTH-002', module: 'AUTH', message: 'Session expired', userMessage: 'Your session has expired.', action: 'Please sign in again to continue.' },
  'AUTH-003': { code: 'AUTH-003', module: 'AUTH', message: 'Signup failed', userMessage: 'We couldn\'t create your account.', action: 'Check your details and try again.' },
  'AUTH-004': { code: 'AUTH-004', module: 'AUTH', message: 'Unauthorized', userMessage: 'You don\'t have access to this page.', action: 'Contact your admin if you think this is wrong.' },
  'AUTH-005': { code: 'AUTH-005', module: 'AUTH', message: 'Password reset failed', userMessage: 'We couldn\'t reset your password.', action: 'Try again or contact support.' },

  // Database errors
  'DB-001': { code: 'DB-001', module: 'DB', message: 'Query failed', userMessage: 'We couldn\'t load your data.', action: 'Refresh the page. If it persists, contact support.' },
  'DB-002': { code: 'DB-002', module: 'DB', message: 'Save failed', userMessage: 'We couldn\'t save your changes.', action: 'Try again in a moment.' },
  'DB-003': { code: 'DB-003', module: 'DB', message: 'Delete failed', userMessage: 'We couldn\'t delete that item.', action: 'Refresh and try again.' },
  'DB-004': { code: 'DB-004', module: 'DB', message: 'Connection lost', userMessage: 'Lost connection to the server.', action: 'Check your internet and refresh.' },
  'DB-005': { code: 'DB-005', module: 'DB', message: 'RLS violation', userMessage: 'You don\'t have permission for this action.', action: 'Contact your admin.' },

  // API errors
  'API-001': { code: 'API-001', module: 'API', message: 'Request failed', userMessage: 'Something went wrong with the request.', action: 'Try again in a moment.' },
  'API-002': { code: 'API-002', module: 'API', message: 'Rate limited', userMessage: 'Too many requests.', action: 'Wait a moment and try again.' },
  'API-003': { code: 'API-003', module: 'API', message: 'Timeout', userMessage: 'The request took too long.', action: 'Check your connection and try again.' },
  'API-004': { code: 'API-004', module: 'API', message: 'Invalid response', userMessage: 'We got an unexpected response.', action: 'Try again. If it persists, contact support.' },
  'API-005': { code: 'API-005', module: 'API', message: 'Service unavailable', userMessage: 'This service is temporarily unavailable.', action: 'We\'re working on it. Try again shortly.' },

  // UI errors
  'UI-001': { code: 'UI-001', module: 'UI', message: 'Component crash', userMessage: 'Something broke on this page.', action: 'Refresh the page to continue.' },
  'UI-002': { code: 'UI-002', module: 'UI', message: 'Form validation failed', userMessage: 'Some fields need your attention.', action: 'Check the highlighted fields.' },
  'UI-003': { code: 'UI-003', module: 'UI', message: 'Navigation error', userMessage: 'We couldn\'t open that page.', action: 'Go back and try again.' },
  'UI-004': { code: 'UI-004', module: 'UI', message: 'Render error', userMessage: 'This content couldn\'t be displayed.', action: 'Refresh the page.' },
  'UI-005': { code: 'UI-005', module: 'UI', message: 'Clipboard failed', userMessage: 'Couldn\'t copy to clipboard.', action: 'Try selecting and copying manually.' },

  // Feedback errors
  'FEED-001': { code: 'FEED-001', module: 'FEED', message: 'Feedback submit failed', userMessage: 'We couldn\'t send your feedback.', action: 'Try again in a moment.' },
  'FEED-002': { code: 'FEED-002', module: 'FEED', message: 'Screenshot capture failed', userMessage: 'Couldn\'t capture the screenshot.', action: 'You can skip the screenshot and submit anyway.' },
  'FEED-003': { code: 'FEED-003', module: 'FEED', message: 'Feedback load failed', userMessage: 'Couldn\'t load feedback data.', action: 'Refresh the admin panel.' },

  // Admin errors
  'ADMIN-001': { code: 'ADMIN-001', module: 'ADMIN', message: 'Dashboard load failed', userMessage: 'Couldn\'t load the admin dashboard.', action: 'Refresh the page.' },
  'ADMIN-002': { code: 'ADMIN-002', module: 'ADMIN', message: 'User management failed', userMessage: 'Couldn\'t update user settings.', action: 'Try again.' },
  'ADMIN-003': { code: 'ADMIN-003', module: 'ADMIN', message: 'Metrics fetch failed', userMessage: 'Couldn\'t load analytics data.', action: 'Check PostHog connection and refresh.' },

  // Map errors
  'MAP-001': { code: 'MAP-001', module: 'MAP', message: 'Tile load failed', userMessage: 'Map tiles couldn\'t load.', action: 'Check your connection. Offline maps may be available.' },
  'MAP-002': { code: 'MAP-002', module: 'MAP', message: 'Layer render failed', userMessage: 'A map layer couldn\'t be displayed.', action: 'Try toggling the layer off and on.' },
  'MAP-003': { code: 'MAP-003', module: 'MAP', message: 'Geolocation failed', userMessage: 'We couldn\'t find your location.', action: 'Enable location services in your browser settings.' },
  'MAP-004': { code: 'MAP-004', module: 'MAP', message: 'WMS layer failed', userMessage: 'External map data couldn\'t load.', action: 'The data source may be temporarily down. Try again later.' },
  'MAP-005': { code: 'MAP-005', module: 'MAP', message: 'Coordinate transform failed', userMessage: 'Couldn\'t display this location.', action: 'Check that the parcel coordinates are correct.' },

  // Survey errors
  'SURVEY-001': { code: 'SURVEY-001', module: 'SURVEY', message: 'Survey creation failed', userMessage: 'We couldn\'t create your survey.', action: 'Check your inputs and try again.' },
  'SURVEY-002': { code: 'SURVEY-002', module: 'SURVEY', message: 'Processing failed', userMessage: 'Survey processing encountered an error.', action: 'We\'ll retry automatically. Contact support if it persists.' },
  'SURVEY-003': { code: 'SURVEY-003', module: 'SURVEY', message: 'Results load failed', userMessage: 'Couldn\'t load survey results.', action: 'Refresh the page.' },
  'SURVEY-004': { code: 'SURVEY-004', module: 'SURVEY', message: 'Survey not found', userMessage: 'This survey doesn\'t exist.', action: 'Check the URL or go back to your surveys list.' },
  'SURVEY-005': { code: 'SURVEY-005', module: 'SURVEY', message: 'Status update failed', userMessage: 'Couldn\'t update survey status.', action: 'Try again.' },

  // AI Companion errors
  'COMPANION-001': { code: 'COMPANION-001', module: 'COMPANION', message: 'Chat failed', userMessage: 'The AI Companion couldn\'t respond.', action: 'Try asking again in a moment.' },
  'COMPANION-002': { code: 'COMPANION-002', module: 'COMPANION', message: 'Context too large', userMessage: 'Your conversation got too long.', action: 'Start a new conversation to continue.' },
  'COMPANION-003': { code: 'COMPANION-003', module: 'COMPANION', message: 'Knowledge retrieval failed', userMessage: 'Couldn\'t search the knowledge base.', action: 'Try rephrasing your question.' },
  'COMPANION-004': { code: 'COMPANION-004', module: 'COMPANION', message: 'Streaming error', userMessage: 'The response was interrupted.', action: 'Try sending your message again.' },
  'COMPANION-005': { code: 'COMPANION-005', module: 'COMPANION', message: 'Domain rejection', userMessage: 'I can only help with forestry-related questions.', action: 'Ask about forest health, beetles, timber, or your parcels.' },

  // Upload errors
  'UPLOAD-001': { code: 'UPLOAD-001', module: 'UPLOAD', message: 'File too large', userMessage: 'This file is too large to upload.', action: 'Maximum file size is 500 MB. Try a smaller file.' },
  'UPLOAD-002': { code: 'UPLOAD-002', module: 'UPLOAD', message: 'Invalid file type', userMessage: 'This file type isn\'t supported.', action: 'Upload TIFF, JPEG, PNG, or GeoJSON files.' },
  'UPLOAD-003': { code: 'UPLOAD-003', module: 'UPLOAD', message: 'Upload failed', userMessage: 'The upload didn\'t complete.', action: 'Check your connection and try again.' },
  'UPLOAD-004': { code: 'UPLOAD-004', module: 'UPLOAD', message: 'Presign failed', userMessage: 'Couldn\'t prepare the upload.', action: 'Try again in a moment.' },
  'UPLOAD-005': { code: 'UPLOAD-005', module: 'UPLOAD', message: 'Quality check failed', userMessage: 'This image didn\'t pass quality checks.', action: 'Ensure good lighting and focus, then retake.' },

  // Parcel errors
  'PARCEL-001': { code: 'PARCEL-001', module: 'PARCEL', message: 'Registration failed', userMessage: 'We couldn\'t register your parcel.', action: 'Check the property ID and try again.' },
  'PARCEL-002': { code: 'PARCEL-002', module: 'PARCEL', message: 'Boundary fetch failed', userMessage: 'Couldn\'t load parcel boundaries.', action: 'The property registry may be temporarily unavailable.' },
  'PARCEL-003': { code: 'PARCEL-003', module: 'PARCEL', message: 'LiDAR fetch failed', userMessage: 'Couldn\'t load terrain data for this parcel.', action: 'Try again later — Lantmäteriet may be slow.' },
  'PARCEL-004': { code: 'PARCEL-004', module: 'PARCEL', message: 'Parcel not found', userMessage: 'This property couldn\'t be found.', action: 'Double-check the fastighets-ID.' },
  'PARCEL-005': { code: 'PARCEL-005', module: 'PARCEL', message: 'Satellite pull failed', userMessage: 'Couldn\'t fetch satellite imagery.', action: 'Sentinel Hub may be temporarily down. Try again later.' },

  // Report errors
  'REPORT-001': { code: 'REPORT-001', module: 'REPORT', message: 'Generation failed', userMessage: 'We couldn\'t generate your report.', action: 'Try again. If it keeps failing, contact support.' },
  'REPORT-002': { code: 'REPORT-002', module: 'REPORT', message: 'PDF export failed', userMessage: 'Couldn\'t create the PDF.', action: 'Try downloading again.' },
  'REPORT-003': { code: 'REPORT-003', module: 'REPORT', message: 'Email delivery failed', userMessage: 'Couldn\'t send the report by email.', action: 'Check the email address and try again.' },
  'REPORT-004': { code: 'REPORT-004', module: 'REPORT', message: 'Report not found', userMessage: 'This report doesn\'t exist.', action: 'Go back to your reports list.' },
  'REPORT-005': { code: 'REPORT-005', module: 'REPORT', message: 'Template error', userMessage: 'There was a problem with the report format.', action: 'Contact support — we\'ll fix this quickly.' },
};

/**
 * Get a user-facing error message with code and action.
 * Format: "[Human explanation]. ([ERROR-CODE]) [Specific next action]."
 */
export function formatError(code: string): string {
  const err = ERROR_CODES[code];
  if (!err) return `An unexpected error occurred. (UNKNOWN) Please try again or contact support.`;
  return `${err.userMessage} (${err.code}) ${err.action}`;
}

/**
 * Get full error details for a code.
 */
export function getError(code: string): AppError | undefined {
  return ERROR_CODES[code];
}
