import { Routes, Route } from "react-router-dom";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { RoleDemo } from "./components/RoleDemo";
import { Story } from "./components/story/Story";
import { Audience } from "./components/Audience";
import { Trust } from "./components/Trust";
import { CTA } from "./components/CTA";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/guards/ProtectedRoute";
import { RoleGuard } from "./components/guards/RoleGuard";

// Auth
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { SelectRolePage } from "./pages/auth/SelectRolePage";

// Organizer
import { OrganizerDashboard } from "./pages/organizer/OrganizerDashboard";
import { CreateEventPage } from "./pages/organizer/CreateEventPage";
import { EventDetailPage } from "./pages/organizer/EventDetailPage";
import { VenueRequestsPage } from "./pages/organizer/VenueRequestsPage";

// Participant
import { ParticipantDashboard } from "./pages/participant/ParticipantDashboard";
import { DiscoverPage } from "./pages/participant/DiscoverPage";
import { EventApplyPage } from "./pages/participant/EventApplyPage";
import { MyApplicationsPage } from "./pages/participant/MyApplicationsPage";

// Venue Authority
import { VenueDashboard } from "./pages/venue/VenueDashboard";
import { VenueProfilePage } from "./pages/venue/VenueProfilePage";
import { VenueVerificationPage } from "./pages/venue/VenueVerificationPage";
import { IncomingRequestsPage } from "./pages/venue/IncomingRequestsPage";
import { QuotationBuilderPage } from "./pages/venue/QuotationBuilderPage";

// Admin / Verification Officer
import { VerificationReviewPage } from "./pages/admin/VerificationReviewPage";
import { DomainRegistryPage } from "./pages/admin/DomainRegistryPage";

// Team Management & Submissions
import { TeamManagementPage } from "./pages/team/TeamManagementPage";
import { ProjectSubmissionPage } from "./pages/team/ProjectSubmissionPage";

// QR Pass & Offline Check-In
import { MyQrPassPage } from "./pages/participant/MyQrPassPage";
import { VolunteerScannerPage } from "./pages/scanner/VolunteerScannerPage";

// Judge Portal
import { JudgePortalPage } from "./pages/judge/JudgePortalPage";
import { JudgeEvaluationPage } from "./pages/judge/JudgeEvaluationPage";

function LandingPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-cobalt focus:px-5 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main" className="relative z-10">
        <Hero />
        <RoleDemo />
        <Story />
        <Audience />
        <Trust />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected: role selection */}
      <Route
        path="/select-role"
        element={
          <ProtectedRoute>
            <SelectRolePage />
          </ProtectedRoute>
        }
      />

      {/* Organizer routes */}
      <Route
        path="/organizer"
        element={
          <ProtectedRoute>
            <RoleGuard role="organizer">
              <OrganizerDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer/events"
        element={
          <ProtectedRoute>
            <RoleGuard role="organizer">
              <OrganizerDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer/events/new"
        element={
          <ProtectedRoute>
            <RoleGuard role="organizer">
              <CreateEventPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer/events/:eventId"
        element={
          <ProtectedRoute>
            <RoleGuard role="organizer">
              <EventDetailPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer/venues"
        element={
          <ProtectedRoute>
            <RoleGuard role="organizer">
              <VenueRequestsPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Participant routes */}
      <Route
        path="/participant"
        element={
          <ProtectedRoute>
            <RoleGuard role="participant">
              <ParticipantDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/discover"
        element={
          <ProtectedRoute>
            <RoleGuard role="participant">
              <DiscoverPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/events"
        element={
          <ProtectedRoute>
            <RoleGuard role="participant">
              <DiscoverPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/events/:eventId/apply"
        element={
          <ProtectedRoute>
            <RoleGuard role="participant">
              <EventApplyPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/applications"
        element={
          <ProtectedRoute>
            <RoleGuard role="participant">
              <MyApplicationsPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/schedule"
        element={
          <ProtectedRoute>
            <RoleGuard role="participant">
              <MyApplicationsPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/participant/results"
        element={
          <ProtectedRoute>
            <RoleGuard role="participant">
              <MyApplicationsPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Venue Authority routes */}
      <Route
        path="/venue"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['venue_authority', 'venue_admin']}>
              <VenueDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue/profile"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['venue_authority', 'venue_admin']}>
              <VenueProfilePage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue/verification"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['venue_authority', 'venue_admin']}>
              <VenueVerificationPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue/requests"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['venue_authority', 'venue_admin']}>
              <IncomingRequestsPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue/requests/:requestId/quotation"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['venue_authority', 'venue_admin']}>
              <QuotationBuilderPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue/quotations"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['venue_authority', 'venue_admin']}>
              <IncomingRequestsPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/venue/agreements"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['venue_authority', 'venue_admin']}>
              <IncomingRequestsPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Admin / Verification Officer routes */}
      <Route
        path="/admin/verifications"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'super_admin']}>
              <VerificationReviewPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/domains"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['admin', 'super_admin']}>
              <DomainRegistryPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Team Management & Project Submissions */}
      <Route
        path="/team/my-team"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['team_leader', 'participant', 'organizer', 'super_admin', 'admin']}>
              <TeamManagementPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team/submissions"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['team_leader', 'participant', 'organizer', 'super_admin', 'admin']}>
              <ProjectSubmissionPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Participant QR Pass */}
      <Route
        path="/participant/qr-pass"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['participant', 'team_leader', 'organizer', 'super_admin', 'admin']}>
              <MyQrPassPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Volunteer Gate Scanner */}
      <Route
        path="/scanner"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['volunteer_scanner', 'organizer', 'super_admin', 'admin']}>
              <VolunteerScannerPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* Judge Evaluation Portal */}
      <Route
        path="/judge"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['judge', 'super_admin', 'admin']}>
              <JudgePortalPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/judge/evaluate"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['judge', 'super_admin', 'admin']}>
              <JudgeEvaluationPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
