import React from "react";
import { Navigate } from "react-router-dom";
import { getToken } from "../services/session.ts";

// Only lets the user through if they have a token; the backend still verifies it on every request
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!getToken()) return <Navigate to='/login' replace />;
  return <>{children}</>;
};

// Stops a logged-in user from landing back on the login/register pages
export const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (getToken()) return <Navigate to='/dashboard' replace />;
  return <>{children}</>;
};
