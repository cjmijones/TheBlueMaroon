import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WalletProvider } from "./providers/WalletProvider";
import { ScrollToTop } from "./components/common/ScrollToTop";

import { ChainContext } from './context/ChainContext.tsx';

import PrivateAppLayout from "./layout/PrivateAppLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import LandingHome from "./pages/Home/index.tsx";
import TailwindHome from "./pages/Dashboard/TailwindHome.tsx";
import Web3Dashboard from "./pages/Dashboard/Web3Commerce";
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
import ExplorePage from "./pages/Explore/index.tsx";
import AssetDetail from "./pages/AssetDetail/index.tsx";
import PortfolioDashboard from "./pages/PortfolioDashboard/index.tsx";
import HoldingDetailPage from "./pages/HoldingDetail/index.tsx";
import TransactionHistory from "./pages/TransactionHistory/index.tsx";

export default function App() {
  const defaultChainId = import.meta.env.DEV ? 11155111 : 1;

  return (
    <WalletProvider>
      <ChainContext.Provider value={defaultChainId}>
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
              <Route path="/dashboard" element={<LandingHome />} />
              <Route path="/explore" element={<ExplorePage />} />

              {/* Learn → Asset Detail (dynamic) */}
              <Route path="/asset/:id" element={<AssetDetail />} />

              {/* ── Portfolio tracking ───────────────────────────── */}
              <Route path="/portfolio" element={<PortfolioDashboard />} />
              <Route path="/holding/:id" element={<HoldingDetailPage />}  />
              <Route path="/history" element={<TransactionHistory />} />

              {/* 2️⃣  Old metrics dashboard preserved at /dashboard-home  */}
              <Route path="/dashboard-home" element={<TailwindHome />} />


              <Route path="/web3-commerce" element={<Web3Dashboard />} />

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
      </ChainContext.Provider>
    </WalletProvider>
  );
}
