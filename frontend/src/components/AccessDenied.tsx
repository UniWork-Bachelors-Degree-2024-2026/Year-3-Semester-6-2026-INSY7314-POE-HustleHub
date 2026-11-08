import { useNavigate } from "react-router-dom";
import "../marketplace.css";

export function AccessDenied() {
  const nav = useNavigate();
  return (
    <div className='mk empty' style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
      <span className='label'>403 · Not allowed</span>
      <h1 className='h-md'>This page isn't available for your account.</h1>
      <p>Your role can't open it. Head back to your dashboard.</p>
      <button className='btn' onClick={() => nav("/dashboard")}>
        Go to my dashboard
      </button>
    </div>
  );
}
