import React, { Suspense, lazy, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthCallback } from '@/components/auth/AuthCallback';
import { AppShell } from '@/components/layout/AppShell';
import { AnnouncerProvider } from '@/components/a11y/Announcer';
import { ToastProvider } from '@/components/common/Toast';
import { initPushNotifications } from '@/lib/pushNotifications';
import { FeatureErrorBoundary } from '@/components/common/FeatureErrorBoundary';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ExpertiseProvider } from '@/contexts/ExpertiseContext';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { startConnectionMonitor } from '@/services/connectionStatus';

/* ====== Top-level error boundary (catches everything) ====== */
interface AppErrorBoundaryState { error: Error | null }
class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary] Unhandled error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-[var(--text)]">Something went wrong</h1>
            <p className="text-sm text-[var(--text3)] max-w-md">
              An unexpected error occurred. Please reload the page to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[var(--green)] px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ====== Public pages ======
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const LoginPage = lazy(() => import('@/components/auth/LoginPage'));
const SignupPage = lazy(() => import('@/components/auth/SignupPage'));
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'));
const LiveDemoDashboard = lazy(() => import('@/pages/public/LiveDemoDashboard'));
const PortfolioDashboard = lazy(() => import('@/pages/public/PortfolioDashboard'));

// ====== Owner pages ======
const TodayFeedPage = lazy(() => import('@/pages/owner/TodayFeedPage'));
const DashboardPage = lazy(() => import('@/pages/owner/DashboardPage'));
const ParcelsPage = lazy(() => import('@/pages/owner/ParcelsPage'));
const NewParcelPage = lazy(() => import('@/pages/owner/NewParcelPage'));
const ParcelDetailPage = lazy(() => import('@/pages/owner/ParcelDetailPage'));
const ParcelWikiPage = lazy(() => import('@/pages/owner/ParcelWikiPage'));

const SurveysPage = lazy(() => import('@/pages/owner/SurveysPage'));
const SurveyDetailPage = lazy(() => import('@/pages/owner/SurveyDetailPage'));
const ReportsPage = lazy(() => import('@/pages/owner/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/owner/SettingsPage'));
const CapturePage = lazy(() => import('@/pages/owner/CapturePage'));
const VisionSearchPage = lazy(() => import('@/pages/owner/VisionSearchPage'));
const NewsPage = lazy(() => import('@/pages/owner/NewsPage'));
const AlertsPage = lazy(() => import('@/pages/owner/AlertsPage'));
const NotificationSettingsPage = lazy(() => import('@/pages/owner/NotificationSettingsPage'));
const ResearchExplorerPage = lazy(() => import('@/pages/owner/ResearchExplorerPage'));
const PhotoGalleryPage = lazy(() => import('@/pages/owner/PhotoGalleryPage'));
const CalendarPage = lazy(() => import('@/pages/owner/CalendarPage'));
const CommunityPage = lazy(() => import('@/pages/owner/CommunityPage'));
const ForestProfilePage = lazy(() => import('@/pages/owner/ForestProfilePage'));
const FirstYearPage = lazy(() => import('@/pages/owner/FirstYearPage'));
const SimulatorPage = lazy(() => import('@/pages/owner/SimulatorPage'));
const GlossaryPage = lazy(() => import('@/pages/owner/GlossaryPage'));
const DocumentVaultPage = lazy(() => import('@/pages/owner/DocumentVaultPage'));
const ScenarioSimulatorPage = lazy(() => import('@/pages/owner/ScenarioSimulatorPage'));
const ProfessionalDirectoryPage = lazy(() => import('@/pages/owner/ProfessionalDirectoryPage'));
const PortfolioPage = lazy(() => import('@/pages/owner/PortfolioPage'));
const EarlyWarningPage = lazy(() => import('@/pages/owner/EarlyWarningPage'));
const TimberMarketPage = lazy(() => import('@/pages/owner/TimberMarketPage'));
const BenchmarkPage = lazy(() => import('@/pages/owner/BenchmarkPage'));
const GrowthModelPage = lazy(() => import('@/pages/owner/GrowthModelPage'));
const ContractorPage = lazy(() => import('@/pages/owner/ContractorPage'));
const StormRiskPage = lazy(() => import('@/pages/owner/StormRiskPage'));
const CarbonPage = lazy(() => import('@/pages/owner/CarbonPage'));
const BiodiversityPage = lazy(() => import('@/pages/owner/BiodiversityPage'));
const CompliancePage = lazy(() => import('@/pages/owner/CompliancePage'));
const EUDRCompliancePage = lazy(() => import('@/pages/owner/EUDRCompliancePage'));
const AdvisorPage = lazy(() => import('@/pages/owner/AdvisorPage'));
const KnowledgeWingmanPage = lazy(() => import('@/pages/owner/KnowledgeWingmanPage'));
const ForestArchivePage = lazy(() => import('@/pages/owner/ForestArchivePage'));
const SatelliteCheckPage = lazy(() => import('@/pages/owner/SatelliteCheckPage'));
const MicroclimateAlmanacPage = lazy(() => import('@/pages/owner/MicroclimateAlmanacPage'));
const NeighborActivityPage = lazy(() => import('@/pages/owner/NeighborActivityPage'));
const SuccessionPage = lazy(() => import('@/pages/owner/SuccessionPage'));
const SuccessionPlanPage = lazy(() => import('@/pages/owner/SuccessionPlanPage'));
const KnowledgeCapturePage = lazy(() => import('@/pages/owner/KnowledgeCapturePage'));
const HarvestLogisticsPage = lazy(() => import('@/pages/owner/HarvestLogisticsPage'));
const LongRotationPage = lazy(() => import('@/pages/owner/LongRotationPage'));
const MarketplacePage = lazy(() => import('@/pages/owner/MarketplacePage'));
const ContractorMarketplacePage = lazy(() => import('@/pages/owner/ContractorMarketplacePage'));
const RegulatoryRadarPage = lazy(() => import('@/pages/owner/RegulatoryRadarPage'));
const AcademyPage = lazy(() => import('@/pages/owner/AcademyPage'));
const DataExportPage = lazy(() => import('@/pages/owner/DataExportPage'));
const BillingPage = lazy(() => import('@/pages/owner/BillingPage'));
const FieldModePage = lazy(() => import('@/pages/owner/FieldModePage'));
const ReportPage = lazy(() => import('@/pages/owner/ReportPage'));
const VideoTutorialsPage = lazy(() => import('@/pages/owner/VideoTutorialsPage'));
const FieldGuidesPage = lazy(() => import('@/pages/owner/FieldGuidesPage'));
const MapPage = lazy(() => import('@/pages/owner/MapPage'));
const MillRadarPage = lazy(() => import('@/pages/owner/MillRadarPage'));
const ContractOptimizerPage = lazy(() => import('@/pages/owner/ContractOptimizerPage'));
const MicroclimatePage = lazy(() => import('@/pages/owner/MicroclimatePage'));
const EarlyDetectionPage = lazy(() => import('@/pages/owner/EarlyDetectionPage'));
const GroupSellingPage = lazy(() => import('@/pages/owner/GroupSellingPage'));
const SilviculturePage = lazy(() => import('@/pages/owner/SilviculturePage'));
const NonTimberIncomePage = lazy(() => import('@/pages/owner/NonTimberIncomePage'));
const InsurancePage = lazy(() => import('@/pages/owner/InsurancePage'));
const CertificationPage = lazy(() => import('@/pages/owner/CertificationPage'));
const EcosystemServicesPage = lazy(() => import('@/pages/owner/EcosystemServicesPage'));
const ProvenancePage = lazy(() => import('@/pages/owner/ProvenancePage'));
const ForestFinancePage = lazy(() => import('@/pages/owner/ForestFinancePage'));
const DigitalTwinPage = lazy(() => import('@/pages/owner/DigitalTwinPage'));
const CrossBorderAlertPage = lazy(() => import('@/pages/owner/CrossBorderAlertPage'));
const ClimateAdaptationPage = lazy(() => import('@/pages/owner/ClimateAdaptationPage'));
const AutoMonitorPage = lazy(() => import('@/pages/owner/AutoMonitorPage'));
const ForestPlanPage = lazy(() => import('@/pages/owner/ForestPlanPage'));
const HedgingPage = lazy(() => import('@/pages/owner/HedgingPage'));
const ExternalDataPage = lazy(() => import('@/pages/owner/ExternalDataPage'));
const WildBoarDamagePage = lazy(() => import('@/pages/owner/WildBoarDamagePage'));
const AnimalInventoryPage = lazy(() => import('@/pages/owner/AnimalInventoryPage'));
const FireRiskPage = lazy(() => import('@/pages/owner/FireRiskPage'));
const CarbonMRVPage = lazy(() => import('@/pages/owner/CarbonMRVPage'));
const ForestWardObservatoryPage = lazy(() => import('@/pages/owner/ForestWardObservatoryPage'));
const CompoundThreatPage = lazy(() => import('@/pages/owner/ForestWardObservatoryPage'));
const IntelCenterPage = lazy(() => import('@/pages/owner/IntelCenterPage'));
const ForumPage = lazy(() => import('@/pages/owner/ForumPage'));
const ForumPostPage = lazy(() => import('@/pages/owner/ForumPostPage'));
const BookmarksPage = lazy(() => import('@/pages/owner/BookmarksPage'));
const ObservationFeedPage = lazy(() => import('@/pages/owner/ObservationFeedPage'));
const ShareManagementPage = lazy(() => import('@/pages/owner/ShareManagementPage'));
const MorePage = lazy(() => import('@/pages/owner/MorePage'));
const TimberSalePage = lazy(() => import('@/pages/owner/TimberSalePage'));
const BookContractorPage = lazy(() => import('@/pages/owner/BookContractorPage'));
const CarbonSalePage = lazy(() => import('@/pages/owner/CarbonSalePage'));
const StatusPage = lazy(() => import('@/pages/owner/StatusPage'));
const ThreatsPage = lazy(() => import('@/pages/owner/ThreatsPage'));
const ContributePage = lazy(() => import('@/pages/owner/ContributePage'));
const B2BIntegrationPage = lazy(() => import('@/pages/owner/B2BIntegrationPage'));
const AILabPage = lazy(() => import('@/pages/owner/AILabPage'));
const ProfitTrackerPage = lazy(() => import('@/pages/owner/ProfitTrackerPage'));
const LeaseManagementPage = lazy(() => import('@/pages/owner/LeaseManagementPage'));
const DocumentSigningPage = lazy(() => import('@/pages/owner/DocumentSigningPage'));
const WeatherStationPage = lazy(() => import('@/pages/owner/WeatherStationPage'));

// ====== Notifications ======
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));

// ====== Public content pages ======
const BlogPage = lazy(() => import('@/pages/public/BlogPage'));
const BlogPostPage = lazy(() => import('@/pages/public/BlogPostPage'));
const PricingPage = lazy(() => import('@/pages/public/PricingPage'));
const GrantCompliancePage = lazy(() => import('@/pages/public/GrantCompliancePage'));
const APIDocsPublicPage = lazy(() => import('@/pages/public/APIDocsPage'));

// ====== Pilot pages ======
const PilotDashboardPage = lazy(() => import('@/pages/pilot/PilotDashboardPage'));
const JobBoardPage = lazy(() => import('@/pages/pilot/JobBoardPage'));
const JobDetailPage = lazy(() => import('@/pages/pilot/JobDetailPage'));
const EarningsPage = lazy(() => import('@/pages/pilot/EarningsPage'));
const PilotSettingsPage = lazy(() => import('@/pages/pilot/PilotSettingsPage'));
const MissionDetailPage = lazy(() => import('@/pages/pilot/MissionDetailPage'));
const FlightLogPage = lazy(() => import('@/pages/pilot/FlightLogPage'));
const MissionControlPage = lazy(() => import('@/components/dji/MissionControl'));
const DroneRegistrationPage = lazy(() => import('@/components/dji/DroneRegistration'));

// ====== Inspector pages ======
const InspectorDashboardPage = lazy(() => import('@/pages/inspector/InspectorDashboardPage'));
const InspectorSurveysPage = lazy(() => import('@/pages/inspector/InspectorSurveysPage'));
const InspectorReportsPage = lazy(() => import('@/pages/inspector/InspectorReportsPage'));
const InspectorSettingsPage = lazy(() => import('@/pages/inspector/InspectorSettingsPage'));
const InspectionFormPage = lazy(() => import('@/pages/inspector/InspectionFormPage'));
const InspectionReportPage = lazy(() => import('@/pages/inspector/InspectionReportPage'));
const InspectorAnalyticsPage = lazy(() => import('@/pages/inspector/InspectorAnalyticsPage'));

// ====== Admin pages ======
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'));
const UserManagementPage = lazy(() => import('@/pages/admin/UserManagementPage'));
const SystemHealthPage = lazy(() => import('@/pages/admin/SystemHealthPage'));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AnalyticsPage'));
const APIDocsPage = lazy(() => import('@/pages/admin/APIDocsPage'));
const BlogEditorPage = lazy(() => import('@/pages/admin/BlogEditorPage'));
const KPIPanelPage = lazy(() => import('@/pages/admin/KPIPanelPage'));
const FeedbackPanelPage = lazy(() => import('@/pages/admin/FeedbackPanelPage'));
const ErrorPanelPage = lazy(() => import('@/pages/admin/ErrorPanelPage'));
const PerformancePanelPage = lazy(() => import('@/pages/admin/PerformancePanelPage'));

// ====== Shared ======
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const GreenAttackPredictorPage = lazy(() => import('./pages/owner/GreenAttackPredictorPage'));
const CarbonImpactPage = lazy(() => import('./pages/owner/CarbonImpactPage'));
const ForesterNetworkPage = lazy(() => import('./pages/owner/ForesterNetworkPage'));
const RegionalHeatMapPage = lazy(() => import('./pages/owner/RegionalHeatMapPage'));
const HarvestOptimizerPage = lazy(() => import('./pages/owner/HarvestOptimizerPage'));
const ClimatePlaybookPage = lazy(() => import('./pages/owner/ClimatePlaybookPage'));
const InsuranceRecommenderPage = lazy(() => import('./pages/owner/InsuranceRecommenderPage'));
const DroneVerificationPage = lazy(() => import('./pages/owner/DroneVerificationPage'));
const IoTSensorDashboardPage = lazy(() => import('./pages/owner/IoTSensorDashboardPage'));
const SpectralFingerprintPage = lazy(() => import('./pages/owner/SpectralFingerprintPage'));

const SummitDemoPage = lazy(() => import('./pages/SummitDemoPage'));
const MultiModalFusionPage = React.lazy(() => import('./pages/owner/MultiModalFusionPage'));
const SwedishForestAIPage = React.lazy(() => import('./pages/owner/SwedishForestAIPage'));
const PhenologyForecastPage = React.lazy(() => import('./pages/owner/PhenologyForecastPage'));
const TreeSeverityPage = React.lazy(() => import('./pages/owner/TreeSeverityPage'));
const HyperspectralThermalPage = React.lazy(() => import('./pages/owner/HyperspectralThermalPage'));
const CarbonEcosystemPage = React.lazy(() => import('./pages/owner/CarbonEcosystemPage'));
const BreedingEnginePage = React.lazy(() => import('./pages/owner/BreedingEnginePage'));
const AcousticTrapPage = React.lazy(() => import('./pages/owner/AcousticTrapPage'));
const WeatherInterventionPage = React.lazy(() => import('./pages/owner/WeatherInterventionPage'));
const ChainOfCustodyPage = React.lazy(() => import('./pages/owner/ChainOfCustodyPage'));
const SatelliteComparisonPage = lazy(() => import('@/pages/owner/SatelliteComparisonPage'));
const SatelliteConstellationPage = React.lazy(() => import('./pages/owner/SatelliteConstellationPage'));
const CanopyHeightPage = React.lazy(() => import('./pages/owner/CanopyHeightPage'));
const AvverkningsanmalanPage = lazy(() => import('@/pages/owner/AvverkningsanmalanPage'));

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--bg)]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
        </div>
        <span className="text-sm text-[var(--text2)] font-mono tracking-wider uppercase">
          Loading
        </span>
      </div>
    </div>
  );
}

const LoadingFallback = LoadingScreen;

function RootRedirect() {
  const { session, profile, isLoading } = useAuthStore();

  if (isLoading) return <LoadingScreen />;

  // Unauthenticated users see the landing page
  if (!session) return <Suspense fallback={<LoadingScreen />}><LandingPage /></Suspense>;

  if (!profile) return <Navigate to="/onboarding" replace />;

  switch (profile.role) {
    case 'owner':
      return <Navigate to="/owner/dashboard" replace />;
    case 'pilot':
      return <Navigate to="/pilot/dashboard" replace />;
    case 'inspector':
      return <Navigate to="/inspector/dashboard" replace />;
    case 'admin':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export function App() {
  const { initialize, isInitialized, session } = useAuthStore();
  const pushInitRef = useRef(false);

  useEffect(() => {
    initialize();
    startConnectionMonitor();
  }, [initialize]);

  // Wire up push notifications once per session after auth is ready
  useEffect(() => {
    if (!isInitialized || !session?.user?.id || pushInitRef.current) return;
    pushInitRef.current = true;
    initPushNotifications(session.user.id).catch(() => {});
  }, [isInitialized, session]);

  if (!isInitialized) return <LoadingScreen />;

  return (
    <AppErrorBoundary>
    <BrowserRouter>
      <ExpertiseProvider>
      <ToastProvider>
      <AnnouncerProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public routes */}
          <Route path="/login" element={<Suspense fallback={<PageSkeleton variant="detail" />}><LoginPage /></Suspense>} />
          <Route path="/signup" element={<Suspense fallback={<PageSkeleton variant="detail" />}><SignupPage /></Suspense>} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding" element={<Suspense fallback={<PageSkeleton variant="detail" />}><OnboardingPage /></Suspense>} />
          <Route path="/demo" element={<Suspense fallback={<PageSkeleton variant="dashboard" />}><LiveDemoDashboard /></Suspense>} />
          <Route path="/live-demo" element={<Suspense fallback={<PageSkeleton variant="dashboard" />}><LiveDemoDashboard /></Suspense>} />
          <Route path="/portfolio" element={<Suspense fallback={<PageSkeleton variant="dashboard" />}><PortfolioDashboard /></Suspense>} />
          <Route path="/blog" element={<Suspense fallback={<PageSkeleton variant="list" />}><BlogPage /></Suspense>} />
          <Route path="/blog/:id" element={<Suspense fallback={<PageSkeleton variant="detail" />}><BlogPostPage /></Suspense>} />
          <Route path="/pricing" element={<Suspense fallback={<PageSkeleton variant="detail" />}><PricingPage /></Suspense>} />
          <Route path="/grant" element={<Suspense fallback={<PageSkeleton variant="detail" />}><GrantCompliancePage /></Suspense>} />
          <Route path="/docs/api" element={<Suspense fallback={<PageSkeleton variant="detail" />}><APIDocsPublicPage /></Suspense>} />
          <Route path="/api-docs" element={<Suspense fallback={<PageSkeleton variant="detail" />}><APIDocsPublicPage /></Suspense>} />

          {/* Owner routes */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="status" replace />} />
            <Route path="today" element={<FeatureErrorBoundary featureName="Today Feed"><Suspense fallback={<PageSkeleton variant="dashboard" />}><TodayFeedPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="dashboard" element={<FeatureErrorBoundary featureName="Dashboard"><Suspense fallback={<PageSkeleton variant="dashboard" />}><DashboardPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="parcels" element={<FeatureErrorBoundary featureName="Parcels"><Suspense fallback={<PageSkeleton variant="list" />}><ParcelsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="parcels/new" element={<FeatureErrorBoundary featureName="Add Parcel"><Suspense fallback={<PageSkeleton variant="detail" />}><NewParcelPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="parcels/:id" element={<FeatureErrorBoundary featureName="Parcel Detail"><Suspense fallback={<PageSkeleton variant="detail" />}><ParcelDetailPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="parcel/:parcelId/wiki" element={<FeatureErrorBoundary featureName="Parcel Wiki"><Suspense fallback={<PageSkeleton variant="detail" />}><ParcelWikiPage /></Suspense></FeatureErrorBoundary>} />

            <Route path="surveys" element={<FeatureErrorBoundary featureName="Surveys"><Suspense fallback={<PageSkeleton variant="list" />}><SurveysPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="surveys/:id" element={<FeatureErrorBoundary featureName="Survey Detail"><Suspense fallback={<PageSkeleton variant="detail" />}><SurveyDetailPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="capture" element={<FeatureErrorBoundary featureName="Capture"><Suspense fallback={<PageSkeleton variant="detail" />}><CapturePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="vision" element={<FeatureErrorBoundary featureName="Vision Search"><Suspense fallback={<PageSkeleton variant="detail" />}><VisionSearchPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="reports" element={<FeatureErrorBoundary featureName="Reports"><Suspense fallback={<PageSkeleton variant="list" />}><ReportsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="news" element={<FeatureErrorBoundary featureName="News"><Suspense fallback={<PageSkeleton variant="list" />}><NewsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="alerts" element={<FeatureErrorBoundary featureName="Alerts"><Suspense fallback={<PageSkeleton variant="list" />}><AlertsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="gallery" element={<FeatureErrorBoundary featureName="Photo Gallery"><Suspense fallback={<PageSkeleton variant="list" />}><PhotoGalleryPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="research" element={<FeatureErrorBoundary featureName="Research Explorer"><Suspense fallback={<PageSkeleton variant="list" />}><ResearchExplorerPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="calendar" element={<FeatureErrorBoundary featureName="Calendar"><Suspense fallback={<PageSkeleton variant="detail" />}><CalendarPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="leases" element={<FeatureErrorBoundary featureName="Lease Management"><Suspense fallback={<PageSkeleton variant="list" />}><LeaseManagementPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="academy" element={<FeatureErrorBoundary featureName="Academy"><Suspense fallback={<PageSkeleton variant="list" />}><AcademyPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="academy/:lessonId" element={<FeatureErrorBoundary featureName="Academy"><Suspense fallback={<PageSkeleton variant="detail" />}><AcademyPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="community" element={<FeatureErrorBoundary featureName="Community"><Suspense fallback={<PageSkeleton variant="list" />}><CommunityPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="first-year" element={<FeatureErrorBoundary featureName="First Year Guide"><Suspense fallback={<PageSkeleton variant="detail" />}><FirstYearPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="simulator" element={<FeatureErrorBoundary featureName="Simulator"><Suspense fallback={<PageSkeleton variant="detail" />}><SimulatorPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="forest-profile" element={<FeatureErrorBoundary featureName="Forest Profile"><Suspense fallback={<PageSkeleton variant="detail" />}><ForestProfilePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="glossary" element={<FeatureErrorBoundary featureName="Glossary"><Suspense fallback={<PageSkeleton variant="list" />}><GlossaryPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="documents" element={<FeatureErrorBoundary featureName="Document Vault"><Suspense fallback={<PageSkeleton variant="list" />}><DocumentVaultPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="scenarios" element={<FeatureErrorBoundary featureName="Scenario Simulator"><Suspense fallback={<PageSkeleton variant="detail" />}><ScenarioSimulatorPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="professionals" element={<FeatureErrorBoundary featureName="Professional Directory"><Suspense fallback={<PageSkeleton variant="list" />}><ProfessionalDirectoryPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="portfolio" element={<FeatureErrorBoundary featureName="Portfolio"><Suspense fallback={<PageSkeleton variant="dashboard" />}><PortfolioPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="early-warning" element={<FeatureErrorBoundary featureName="Early Warning"><Suspense fallback={<PageSkeleton variant="map" />}><EarlyWarningPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="timber-market" element={<FeatureErrorBoundary featureName="Timber Market"><Suspense fallback={<PageSkeleton variant="dashboard" />}><TimberMarketPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="contract-optimizer" element={<FeatureErrorBoundary featureName="Contract Optimizer"><Suspense fallback={<PageSkeleton variant="dashboard" />}><ContractOptimizerPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="benchmark" element={<FeatureErrorBoundary featureName="Benchmark"><Suspense fallback={<PageSkeleton variant="dashboard" />}><BenchmarkPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="growth-model" element={<FeatureErrorBoundary featureName="Growth Model"><Suspense fallback={<PageSkeleton variant="detail" />}><GrowthModelPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="contractors" element={<FeatureErrorBoundary featureName="Contractors"><Suspense fallback={<PageSkeleton variant="list" />}><ContractorPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="storm-risk" element={<FeatureErrorBoundary featureName="Storm Risk"><Suspense fallback={<PageSkeleton variant="map" />}><StormRiskPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="carbon" element={<FeatureErrorBoundary featureName="Carbon"><Suspense fallback={<PageSkeleton variant="dashboard" />}><CarbonPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="carbon-mrv" element={<FeatureErrorBoundary featureName="Carbon MRV"><Suspense fallback={<PageSkeleton variant="dashboard" />}><CarbonMRVPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="biodiversity" element={<FeatureErrorBoundary featureName="Biodiversity Credits"><Suspense fallback={<PageSkeleton variant="dashboard" />}><BiodiversityPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="animal-inventory" element={<FeatureErrorBoundary featureName="Animal Inventory"><Suspense fallback={<PageSkeleton variant="dashboard" />}><AnimalInventoryPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="compliance" element={<FeatureErrorBoundary featureName="Compliance"><Suspense fallback={<PageSkeleton variant="list" />}><CompliancePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="avverkningsanmalan" element={<FeatureErrorBoundary featureName="Harvesting Notification"><Suspense fallback={<PageSkeleton variant="detail" />}><AvverkningsanmalanPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="eudr-compliance" element={<FeatureErrorBoundary featureName="EUDR Compliance"><Suspense fallback={<PageSkeleton variant="dashboard" />}><EUDRCompliancePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="advisor" element={<FeatureErrorBoundary featureName="AI Advisor"><Suspense fallback={<PageSkeleton variant="detail" />}><AdvisorPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="wingman" element={<FeatureErrorBoundary featureName="AI Knowledge Wingman"><Suspense fallback={<PageSkeleton variant="detail" />}><KnowledgeWingmanPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="ai-lab" element={<FeatureErrorBoundary featureName="AI Intelligence Lab"><Suspense fallback={<PageSkeleton variant="dashboard" />}><AILabPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="intel" element={<FeatureErrorBoundary featureName="Intel Center"><Suspense fallback={<PageSkeleton variant="dashboard" />}><IntelCenterPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="forum" element={<FeatureErrorBoundary featureName="Forum"><Suspense fallback={<PageSkeleton variant="list" />}><ForumPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="forum/:postId" element={<FeatureErrorBoundary featureName="Forum Post"><Suspense fallback={<PageSkeleton variant="detail" />}><ForumPostPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="bookmarks" element={<FeatureErrorBoundary featureName="Bookmarks"><Suspense fallback={<PageSkeleton variant="list" />}><BookmarksPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="observations" element={<FeatureErrorBoundary featureName="Field Intelligence"><Suspense fallback={<PageSkeleton variant="list" />}><ObservationFeedPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="sharing" element={<FeatureErrorBoundary featureName="Forest Sharing"><Suspense fallback={<PageSkeleton variant="list" />}><ShareManagementPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="more" element={<FeatureErrorBoundary featureName="More"><Suspense fallback={<PageSkeleton variant="list" />}><MorePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="status" element={<FeatureErrorBoundary featureName="Status"><Suspense fallback={<PageSkeleton variant="dashboard" />}><StatusPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="threats" element={<FeatureErrorBoundary featureName="Threats"><Suspense fallback={<PageSkeleton variant="dashboard" />}><ThreatsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="contribute" element={<FeatureErrorBoundary featureName="Contribute"><Suspense fallback={<PageSkeleton variant="list" />}><ContributePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="archive" element={<FeatureErrorBoundary featureName="Forest Archive"><Suspense fallback={<PageSkeleton variant="list" />}><ForestArchivePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="satellite-check" element={<FeatureErrorBoundary featureName="Satellite Check"><Suspense fallback={<PageSkeleton variant="map" />}><SatelliteCheckPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="satellite-compare" element={<FeatureErrorBoundary featureName="Satellite Comparison"><Suspense fallback={<PageSkeleton variant="dashboard" />}><SatelliteComparisonPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="microclimate" element={<FeatureErrorBoundary featureName="Microclimate Almanac"><Suspense fallback={<PageSkeleton variant="dashboard" />}><MicroclimateAlmanacPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="microclimate-model" element={<FeatureErrorBoundary featureName="Microclimate Modeling"><Suspense fallback={<PageSkeleton variant="dashboard" />}><MicroclimatePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="early-detection" element={<FeatureErrorBoundary featureName="Early Detection"><Suspense fallback={<PageSkeleton variant="dashboard" />}><EarlyDetectionPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="forestward-observatory" element={<FeatureErrorBoundary featureName="ForestWard Observatory"><Suspense fallback={<PageSkeleton variant="dashboard" />}><ForestWardObservatoryPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="compound-threat" element={<FeatureErrorBoundary featureName="Compound Threat"><Suspense fallback={<PageSkeleton variant="dashboard" />}><CompoundThreatPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="neighbor-activity" element={<FeatureErrorBoundary featureName="Neighbor Activity"><Suspense fallback={<PageSkeleton variant="map" />}><NeighborActivityPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="succession" element={<FeatureErrorBoundary featureName="Succession Planning"><Suspense fallback={<PageSkeleton variant="detail" />}><SuccessionPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="succession-plan" element={<FeatureErrorBoundary featureName="Succession & Estate Planning"><Suspense fallback={<PageSkeleton variant="detail" />}><SuccessionPlanPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="harvest-logistics" element={<FeatureErrorBoundary featureName="Harvest Logistics"><Suspense fallback={<PageSkeleton variant="map" />}><HarvestLogisticsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="knowledge" element={<FeatureErrorBoundary featureName="Knowledge Capture"><Suspense fallback={<PageSkeleton variant="detail" />}><KnowledgeCapturePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="long-rotation" element={<FeatureErrorBoundary featureName="Long Rotation"><Suspense fallback={<PageSkeleton variant="detail" />}><LongRotationPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="marketplace" element={<FeatureErrorBoundary featureName="Marketplace"><Suspense fallback={<PageSkeleton variant="list" />}><MarketplacePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="contractor-marketplace" element={<FeatureErrorBoundary featureName="Contractor Marketplace"><Suspense fallback={<PageSkeleton variant="list" />}><ContractorMarketplacePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="regulatory-radar" element={<FeatureErrorBoundary featureName="Regulatory Radar"><Suspense fallback={<PageSkeleton variant="list" />}><RegulatoryRadarPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="settings" element={<FeatureErrorBoundary featureName="Settings"><Suspense fallback={<PageSkeleton variant="detail" />}><SettingsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="notification-settings" element={<FeatureErrorBoundary featureName="Notification Settings"><Suspense fallback={<PageSkeleton variant="detail" />}><NotificationSettingsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="notifications" element={<FeatureErrorBoundary featureName="Notifications"><Suspense fallback={<PageSkeleton variant="list" />}><NotificationsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="export" element={<FeatureErrorBoundary featureName="Data Export"><Suspense fallback={<PageSkeleton variant="detail" />}><DataExportPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="billing" element={<FeatureErrorBoundary featureName="Billing"><Suspense fallback={<PageSkeleton variant="detail" />}><BillingPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="insurance" element={<FeatureErrorBoundary featureName="Insurance"><Suspense fallback={<PageSkeleton variant="dashboard" />}><InsurancePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="field-mode" element={<FeatureErrorBoundary featureName="Field Mode"><Suspense fallback={<PageSkeleton variant="detail" />}><FieldModePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="report-builder" element={<FeatureErrorBoundary featureName="Report Builder"><Suspense fallback={<PageSkeleton variant="detail" />}><ReportPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="tutorials" element={<FeatureErrorBoundary featureName="Video Tutorials"><Suspense fallback={<PageSkeleton variant="list" />}><VideoTutorialsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="field-guides" element={<FeatureErrorBoundary featureName="Field Guides"><Suspense fallback={<PageSkeleton variant="list" />}><FieldGuidesPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="map" element={<FeatureErrorBoundary featureName="Map"><Suspense fallback={<PageSkeleton variant="map" />}><MapPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="mill-radar" element={<FeatureErrorBoundary featureName="Mill Radar"><Suspense fallback={<PageSkeleton variant="map" />}><MillRadarPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="group-selling" element={<FeatureErrorBoundary featureName="Group Selling"><Suspense fallback={<PageSkeleton variant="list" />}><GroupSellingPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="silviculture" element={<FeatureErrorBoundary featureName="Silviculture Freedom"><Suspense fallback={<PageSkeleton variant="dashboard" />}><SilviculturePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="non-timber" element={<FeatureErrorBoundary featureName="Non-Timber Income"><Suspense fallback={<PageSkeleton variant="dashboard" />}><NonTimberIncomePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="certifications" element={<FeatureErrorBoundary featureName="Certifications"><Suspense fallback={<PageSkeleton variant="dashboard" />}><CertificationPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="ecosystem-services" element={<FeatureErrorBoundary featureName="Ecosystem Services"><Suspense fallback={<PageSkeleton variant="dashboard" />}><EcosystemServicesPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="provenance" element={<FeatureErrorBoundary featureName="Timber Provenance"><Suspense fallback={<PageSkeleton variant="dashboard" />}><ProvenancePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="digital-twin" element={<FeatureErrorBoundary featureName="Digital Twin"><Suspense fallback={<PageSkeleton variant="dashboard" />}><DigitalTwinPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="forest-finance" element={<FeatureErrorBoundary featureName="Green Finance Gateway"><Suspense fallback={<PageSkeleton variant="dashboard" />}><ForestFinancePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="climate-adaptation" element={<FeatureErrorBoundary featureName="Climate Adaptation"><Suspense fallback={<PageSkeleton variant="dashboard" />}><ClimateAdaptationPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="cross-border" element={<FeatureErrorBoundary featureName="Cross-Border Alert"><Suspense fallback={<PageSkeleton variant="map" />}><CrossBorderAlertPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="auto-monitor" element={<FeatureErrorBoundary featureName="Autonomous Monitoring"><Suspense fallback={<PageSkeleton variant="dashboard" />}><AutoMonitorPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="forest-plan" element={<FeatureErrorBoundary featureName="AI Forest Plan"><Suspense fallback={<PageSkeleton variant="detail" />}><ForestPlanPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="hedging" element={<FeatureErrorBoundary featureName="Timber Hedging"><Suspense fallback={<PageSkeleton variant="dashboard" />}><HedgingPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="external-data" element={<FeatureErrorBoundary featureName="External Data"><Suspense fallback={<PageSkeleton variant="dashboard" />}><ExternalDataPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="wild-boar" element={<FeatureErrorBoundary featureName="Wild Boar Damage"><Suspense fallback={<PageSkeleton variant="dashboard" />}><WildBoarDamagePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="fire-risk" element={<FeatureErrorBoundary featureName="Fire Risk"><Suspense fallback={<PageSkeleton variant="dashboard" />}><FireRiskPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="satellite-constellation" element={<FeatureErrorBoundary featureName="Satellite Constellation"><Suspense fallback={<PageSkeleton variant="dashboard" />}><SatelliteConstellationPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="canopy-height" element={<FeatureErrorBoundary featureName="Canopy Height"><Suspense fallback={<PageSkeleton variant="dashboard" />}><CanopyHeightPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="timber-sale" element={<FeatureErrorBoundary featureName="Timber Sale"><Suspense fallback={<PageSkeleton variant="detail" />}><TimberSalePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="book-contractor" element={<FeatureErrorBoundary featureName="Book Contractor"><Suspense fallback={<PageSkeleton variant="detail" />}><BookContractorPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="carbon-sale" element={<FeatureErrorBoundary featureName="Carbon Sale"><Suspense fallback={<PageSkeleton variant="detail" />}><CarbonSalePage /></Suspense></FeatureErrorBoundary>} />
            <Route path="b2b-integration" element={<FeatureErrorBoundary featureName="B2B Integrations"><Suspense fallback={<PageSkeleton variant="dashboard" />}><B2BIntegrationPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="profit-tracker" element={<FeatureErrorBoundary featureName="Profit Tracker"><Suspense fallback={<PageSkeleton variant="dashboard" />}><ProfitTrackerPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="documents/signing" element={<FeatureErrorBoundary featureName="Document Signing"><Suspense fallback={<PageSkeleton variant="list" />}><DocumentSigningPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="weather-stations" element={<FeatureErrorBoundary featureName="Weather Stations"><Suspense fallback={<PageSkeleton variant="dashboard" />}><WeatherStationPage /></Suspense></FeatureErrorBoundary>} />
          </Route>

          {/* Pilot routes */}
          <Route
            path="/pilot"
            element={
              <ProtectedRoute allowedRoles={['pilot', 'admin']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<FeatureErrorBoundary featureName="Pilot Dashboard"><Suspense fallback={<PageSkeleton variant="dashboard" />}><PilotDashboardPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="jobs" element={<FeatureErrorBoundary featureName="Job Board"><Suspense fallback={<PageSkeleton variant="list" />}><JobBoardPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="jobs/:id" element={<FeatureErrorBoundary featureName="Job Detail"><Suspense fallback={<PageSkeleton variant="detail" />}><JobDetailPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="earnings" element={<FeatureErrorBoundary featureName="Earnings"><Suspense fallback={<PageSkeleton variant="dashboard" />}><EarningsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="settings" element={<FeatureErrorBoundary featureName="Settings"><Suspense fallback={<PageSkeleton variant="detail" />}><PilotSettingsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="missions/:id" element={<FeatureErrorBoundary featureName="Mission Detail"><Suspense fallback={<PageSkeleton variant="detail" />}><MissionDetailPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="flight-log" element={<FeatureErrorBoundary featureName="Flight Log"><Suspense fallback={<PageSkeleton variant="list" />}><FlightLogPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="mission-control" element={<FeatureErrorBoundary featureName="Mission Control"><Suspense fallback={<PageSkeleton variant="dashboard" />}><MissionControlPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="drone-registration" element={<FeatureErrorBoundary featureName="Drone Registration"><Suspense fallback={<PageSkeleton variant="detail" />}><DroneRegistrationPage /></Suspense></FeatureErrorBoundary>} />
          </Route>

          {/* Inspector routes */}
          <Route
            path="/inspector"
            element={
              <ProtectedRoute allowedRoles={['inspector', 'admin']}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<FeatureErrorBoundary featureName="Inspector Dashboard"><Suspense fallback={<PageSkeleton variant="dashboard" />}><InspectorDashboardPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="surveys" element={<FeatureErrorBoundary featureName="Surveys"><Suspense fallback={<PageSkeleton variant="list" />}><InspectorSurveysPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="reports" element={<FeatureErrorBoundary featureName="Reports"><Suspense fallback={<PageSkeleton variant="list" />}><InspectorReportsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="settings" element={<FeatureErrorBoundary featureName="Settings"><Suspense fallback={<PageSkeleton variant="detail" />}><InspectorSettingsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="inspect/:id" element={<FeatureErrorBoundary featureName="Inspection Form"><Suspense fallback={<PageSkeleton variant="detail" />}><InspectionFormPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="inspect/:id/report" element={<FeatureErrorBoundary featureName="Inspection Report"><Suspense fallback={<PageSkeleton variant="detail" />}><InspectionReportPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="analytics" element={<FeatureErrorBoundary featureName="Inspector Analytics"><Suspense fallback={<PageSkeleton variant="dashboard" />}><InspectorAnalyticsPage /></Suspense></FeatureErrorBoundary>} />
          </Route>

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Suspense fallback={<PageSkeleton variant="dashboard" />}><AdminLayout /></Suspense>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<FeatureErrorBoundary featureName="Admin Dashboard"><Suspense fallback={<PageSkeleton variant="dashboard" />}><AdminDashboardPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="users" element={<FeatureErrorBoundary featureName="User Management"><Suspense fallback={<PageSkeleton variant="list" />}><UserManagementPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="health" element={<FeatureErrorBoundary featureName="System Health"><Suspense fallback={<PageSkeleton variant="dashboard" />}><SystemHealthPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="analytics" element={<FeatureErrorBoundary featureName="Analytics"><Suspense fallback={<PageSkeleton variant="dashboard" />}><AdminAnalyticsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="api-docs" element={<FeatureErrorBoundary featureName="API Docs"><Suspense fallback={<PageSkeleton variant="detail" />}><APIDocsPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="blog-editor" element={<FeatureErrorBoundary featureName="Blog Editor"><Suspense fallback={<PageSkeleton variant="list" />}><BlogEditorPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="kpis" element={<FeatureErrorBoundary featureName="KPI Panel"><Suspense fallback={<PageSkeleton variant="dashboard" />}><KPIPanelPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="feedback" element={<FeatureErrorBoundary featureName="Feedback Panel"><Suspense fallback={<PageSkeleton variant="list" />}><FeedbackPanelPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="errors" element={<FeatureErrorBoundary featureName="Error Panel"><Suspense fallback={<PageSkeleton variant="list" />}><ErrorPanelPage /></Suspense></FeatureErrorBoundary>} />
            <Route path="performance" element={<FeatureErrorBoundary featureName="Performance Panel"><Suspense fallback={<PageSkeleton variant="dashboard" />}><PerformancePanelPage /></Suspense></FeatureErrorBoundary>} />
          </Route>

          {/* Standalone owner feature pages (outside AppShell for direct access) */}
          <Route path="/owner/green-attack-predictor" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><GreenAttackPredictorPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/carbon-impact" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><CarbonImpactPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/forester-network" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><ForesterNetworkPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/regional-heat-map" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><RegionalHeatMapPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/harvest-optimizer" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><HarvestOptimizerPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/climate-playbook" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><ClimatePlaybookPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/insurance-recommender" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><InsuranceRecommenderPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/drone-verification" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><DroneVerificationPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/iot-sensors" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><IoTSensorDashboardPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/spectral-fingerprint" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><SpectralFingerprintPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/multi-modal-fusion" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><MultiModalFusionPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/swedish-forest-ai" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><SwedishForestAIPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/phenology-forecast" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><PhenologyForecastPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/tree-severity" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><TreeSeverityPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/hyperspectral-thermal" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><HyperspectralThermalPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/carbon-ecosystem" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><CarbonEcosystemPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/breeding-engine" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><BreedingEnginePage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/acoustic-traps" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><AcousticTrapPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/weather-intervention" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><WeatherInterventionPage /></Suspense></ProtectedRoute>} />
          <Route path="/owner/chain-of-custody" element={<ProtectedRoute allowedRoles={['owner', 'admin']}><Suspense fallback={<LoadingFallback />}><ChainOfCustodyPage /></Suspense></ProtectedRoute>} />
          {/* Public standalone pages */}
          <Route path="/summit-demo" element={<Suspense fallback={<LoadingFallback />}><SummitDemoPage /></Suspense>} />
          <Route path="/grant-compliance" element={<Navigate to="/grant" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <FeedbackWidget />
      </AnnouncerProvider>
      </ToastProvider>
      </ExpertiseProvider>
    </BrowserRouter>
    </AppErrorBoundary>
  );
}

// deploy trigger
