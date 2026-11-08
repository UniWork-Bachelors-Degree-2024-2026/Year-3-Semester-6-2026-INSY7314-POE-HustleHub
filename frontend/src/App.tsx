import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "./components/AuthLayout.tsx";
import { GuestRoute, ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { DashboardPage } from "./pages/DashboardPage.tsx";
import { DashboardExtras } from "./components/DashboardExtras.tsx";
import { MarketLayout } from "./components/MarketLayout.tsx";
import { RoleRoute } from "./components/RoleRoute.tsx";
import { BrowsePage } from "./pages/BrowsePage.tsx";
import { GigDetailPage } from "./pages/GigDetailPage.tsx";
import { BookingsRoute } from "./pages/BookingsRoute.tsx";
import { MyGigsPage } from "./pages/MyGigsPage.tsx";
import { GigEditorPage } from "./pages/GigEditorPage.tsx";
import { AdminPage } from "./pages/AdminPage.tsx";
import { ProfilePage } from "./pages/ProfilePage.tsx";
import { PublicProfilePage } from "./pages/PublicProfilePage.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { RegisterPage } from "./pages/RegisterPage.tsx";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.tsx";
import { LandingPage } from "./pages/LandingPage.tsx";
import { ExploreGigsPage } from "./pages/ExploreGigsPage.tsx";
import { ScrollToTop } from "./components/ScrollToTop.tsx";
import { PageChrome } from "./components/PageChrome.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
// Imported last so the polish rules sit on top of every other stylesheet
import "./polish.css";

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <PageChrome />
        <Routes>
          {/* Public pages: visitors can read about HustleHub+ and browse live gigs, then log in or register to book */}
          <Route
            path='/'
            element={
              <GuestRoute>
                <LandingPage />
              </GuestRoute>
            }
          />
          <Route
            path='/browse'
            element={
              <GuestRoute>
                <ExploreGigsPage />
              </GuestRoute>
            }
          />

          {/* Login and register share one layout so the background keeps running when switching tabs */}
          <Route
            element={
              <GuestRoute>
                <AuthLayout />
              </GuestRoute>
            }
          >
            <Route path='/login' element={<LoginPage />} />
            <Route path='/register' element={<RegisterPage />} />
            <Route path='/forgot-password' element={<ForgotPasswordPage />} />
          </Route>

          {/* Logged in pages share one layout (background and NavBar); each group is limited to the roles that may use it */}
          <Route
            element={
              <ProtectedRoute>
                <MarketLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path='/dashboard'
              element={
                <>
                  <DashboardPage />
                  <DashboardExtras />
                </>
              }
            />
            {/* every logged in role can edit their own profile */}
            <Route path='/profile' element={<ProfilePage />} />
            <Route path='/u/:id' element={<PublicProfilePage />} />
            <Route element={<RoleRoute roles={["client", "admin"]} />}>
              <Route path='/explore' element={<BrowsePage />} />
              <Route path='/gigs/:id' element={<GigDetailPage />} />
            </Route>
            <Route element={<RoleRoute roles={["client", "freelancer"]} />}>
              <Route path='/bookings' element={<BookingsRoute />} />
            </Route>
            <Route element={<RoleRoute roles={["freelancer"]} />}>
              <Route path='/my-gigs' element={<MyGigsPage />} />
              <Route path='/my-gigs/new' element={<GigEditorPage />} />
              <Route path='/my-gigs/:id/edit' element={<GigEditorPage />} />
            </Route>
            <Route element={<RoleRoute roles={["admin"]} />}>
              <Route path='/admin' element={<AdminPage />} />
            </Route>
          </Route>

          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
