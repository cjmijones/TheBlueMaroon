import { JSX } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

import OAuthSignInPage from "./components/Login";
import Dashboard from "./components/Dashboard";
import { WalletProvider } from "./providers/WalletProvider";   // ⬅️ import
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";
import Home from "./pages/Dashboard/Home";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth0();
  if (isLoading) return <p>Loading...</p>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <WalletProvider>                {/* ⬅️ wrap *once* at the top */}
      <Router>
        <ScrollToTop />
        <Routes>

          {/* Login Page */}
          <Route path="/" element={<OAuthSignInPage />} />

          {/* Dashboard Page */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route element={<AppLayout />}>
            <Route
              path="/testing"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
          </Route>

        </Routes>
      </Router>
    </WalletProvider>
  );
}
