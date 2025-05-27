// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

interface ProtectedRouteProps {
    children?: React.ReactNode;
  }

  export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth0();
    if (isLoading) return <p>Loading…</p>;
    if (!isAuthenticated) return <Navigate to="/" replace />;
    return <>{children}</>;                // ✅ return the child tree
  }
