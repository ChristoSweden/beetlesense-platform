/**
 * useHedging — Convenience re-export of useTimberHedging for the HedgingPage.
 * All types and the hook itself come from useTimberHedging.
 */

export {
  useTimberHedging as useHedging,
  type TimberExposure,
  type ForwardContract,
  type InsuranceQuote,
  type ActiveHedge,
  type HedgingRecommendation,
  type PnlHistoryPoint,
  type HedgingState,
  type Assortment,
  type HedgeType,
  type HedgeStatus,
} from './useTimberHedging';
