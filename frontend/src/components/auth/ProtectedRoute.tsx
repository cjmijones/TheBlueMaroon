// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "../../providers/SupabaseAuthProvider";

interface ProtectedRouteProps {
    children?: React.ReactNode;
  }

  export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useSupabaseAuth();
    if (isLoading) return <p>Loading...</p>;
    if (!isAuthenticated) return <Navigate to="/" replace />;
    return <>{children}</>;                // ✅ return the child tree
  }
