import { JSX } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import OAuthSignInPage from './components/Login';
import Dashboard from './components/Dashboard';
import { useAuth0 } from '@auth0/auth0-react';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <p>Loading...</p>;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<OAuthSignInPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
