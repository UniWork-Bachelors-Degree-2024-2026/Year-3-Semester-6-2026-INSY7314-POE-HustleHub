import React from "react";
import { Navigate } from "react-router-dom";
import { getUser } from "../services/session.ts";
import { BookingsPage } from "./BookingsPage.tsx";
import { FreelancerBookingsPage } from "./FreelancerBookingsPage.tsx";

// /bookings shows the right view for the logged-in role
export const BookingsRoute: React.FC = () => {
  const role = getUser()?.role;
  if (role === "freelancer") return <FreelancerBookingsPage />;
  if (role === "client") return <BookingsPage />;
  return <Navigate to='/dashboard' replace />;
};
