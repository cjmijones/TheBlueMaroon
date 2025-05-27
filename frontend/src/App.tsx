import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./providers/WalletProvider";
import { ScrollToTop } from "./components/common/ScrollToTop";

import PrivateAppLayout from "./layout/PrivateAppLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Home from "./pages/Dashboard/Home";
import Blank from "./pages/Blank";
import OAuthSignInPage from "./components/Login";
import Testboard from "./components/Testboard";
import NotFound from "./pages/OtherPage/NotFound";
import Alerts from "./pages/UiElements/Alerts";
import Avatars from "./pages/UiElements/Avatars";
import Badges from "./pages/UiElements/Badges";
import Buttons from "./pages/UiElements/Buttons";
import Images from "./pages/UiElements/Images";
import Videos from "./pages/UiElements/Videos";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import UserProfiles from "./components/UserProfiles";

export default function App() {
  return (
    <WalletProvider>
      <Router>
        <ScrollToTop />

        <Routes>
          {/* Public route */}
          <Route path="/" element={<OAuthSignInPage />} />

          {/* Test Protected Route outside of Private App Layout - may be deprecated */}
          <Route
              path="/testboard"
              element={
                <ProtectedRoute>
                  <Testboard />
                </ProtectedRoute>
              }
            />

          {/* Protected branch – EVERYTHING nested under here requires auth */}
          <Route element={<PrivateAppLayout />}>

            {/* Dashboard shell */}
            <Route path="/dashboard" element={<Home />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />            

            {/* Other private pages */}
            <Route path="/blank" element={<Blank />} />
            <Route path="/profile" element={<UserProfiles />} />

          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </Router>
    </WalletProvider>
  );
}
