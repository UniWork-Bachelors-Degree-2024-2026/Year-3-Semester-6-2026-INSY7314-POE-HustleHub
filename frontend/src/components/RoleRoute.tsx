import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { UserRole } from "../models/user.ts";
import { getToken, getUser } from "../services/session.ts";
import { AccessDenied } from "./AccessDenied.tsx";

// Role-based access control for the UI. The API enforces the same rules on the server.
export const RoleRoute: React.FC<{ roles: UserRole[] }> = ({ roles }) => {
  const user = getUser();
  if (!getToken() || !user) return <Navigate to='/login' replace />;
  if (!roles.includes(user.role)) {
    return <AccessDenied />;
  }
  return <Outlet />;
};
