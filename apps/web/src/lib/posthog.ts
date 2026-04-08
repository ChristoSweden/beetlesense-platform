/**
 * PostHog Analytics Integration for BeetleSense.ai
 *
 * Tracks key user events, feature adoption, and funnels.
 * See /docs/analytics.md for the full event catalog.
 */

import posthog from 'posthog-js';
import { getCookieConsent } from '@/components/CookieConsent/CookieConsent';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://eu.i.posthog.com';

let initialized = false;

export function initPostHog(): void {
  // GDPR gate — only initialise if the user has consented to analytics
  if (getCookieConsent() !== 'all') {
    if (import.meta.env.DEV) {
      console.info('[PostHog] Skipped — analytics consent not given (cookie_consent != "all")');
    }
    return;
  }

  if (initialized || !POSTHOG_KEY || POSTHOG_KEY === 'phc_your_key_here') {
    if (import.meta.env.DEV) {
      console.info('[PostHog] Skipped — no valid key. Set VITE_POSTHOG_KEY in .env');
    }
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    autocapture: false, // We instrument manually for clean events
    disable_session_recording: import.meta.env.DEV,
  });

  initialized = true;

  if (import.meta.env.DEV) {
    console.info('[PostHog] Initialized');
  }
}

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function resetUser(): void {
  if (!initialized) return;
  posthog.reset();
}

// ─── Event Tracking ───

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  if (!initialized) {
    if (import.meta.env.DEV) {
      console.debug(`[PostHog] Would track: ${event}`, properties);
    }
    return;
  }
  posthog.capture(event, properties);
}

// ─── Pre-defined Events (see /docs/analytics.md) ───

// Auth
export const trackSignup = (method: string) => trackEvent('user_signed_up', { method });
export const trackLogin = (method: string) => trackEvent('user_logged_in', { method });
export const trackLogout = () => trackEvent('user_logged_out');

// Onboarding
export const trackOnboardingStarted = () => trackEvent('onboarding_started');
export const trackOnboardingCompleted = (durationMs: number) => trackEvent('onboarding_completed', { duration_ms: durationMs });
export const trackOnboardingSkipped = (step: string) => trackEvent('onboarding_skipped', { step });

// Parcels
export const trackParcelRegistered = (method: string) => trackEvent('parcel_registered', { method });
export const trackParcelViewed = (parcelId: string) => trackEvent('parcel_viewed', { parcel_id: parcelId });

// Surveys
export const trackSurveyCreated = (modules: string[]) => trackEvent('survey_created', { modules, module_count: modules.length });
export const trackSurveyViewed = (surveyId: string) => trackEvent('survey_viewed', { survey_id: surveyId });
export const trackSurveyResultsViewed = (surveyId: string) => trackEvent('survey_results_viewed', { survey_id: surveyId });

// AI Companion
export const trackCompanionOpened = () => trackEvent('companion_opened');
export const trackCompanionMessage = (hasContext: boolean) => trackEvent('companion_message_sent', { has_context: hasContext });
export const trackCompanionRated = (rating: 'up' | 'down') => trackEvent('companion_rated', { rating });

// Capture (smartphone photos)
export const trackCaptureStarted = () => trackEvent('capture_started');
export const trackCaptureCompleted = (photoCount: number) => trackEvent('capture_completed', { photo_count: photoCount });

// Feedback
export const trackFeedbackOpened = () => trackEvent('feedback_widget_opened');
export const trackFeedbackSubmitted = (category: string, rating: number) => trackEvent('feedback_submitted', { category, rating });

// Reports
export const trackReportGenerated = (format: string) => trackEvent('report_generated', { format });
export const trackReportDownloaded = (reportId: string) => trackEvent('report_downloaded', { report_id: reportId });

// Navigation
export const trackPageView = (path: string, role: string) => trackEvent('page_viewed', { path, role });

// Errors (mirrors Sentry but in PostHog for correlation)
export const trackError = (code: string, module: string) => trackEvent('error_occurred', { error_code: code, module });
