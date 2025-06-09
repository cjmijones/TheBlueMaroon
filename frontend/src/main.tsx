import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react';

import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";

import App from './App.tsx'

import { ThemeProvider } from './context/ThemeContext.tsx';
import { AppWrapper } from './components/common/PageMeta.tsx';
import { ApiProvider } from './providers/ApiProvider.tsx';

const domain = import.meta.env.VITE_AUTH0_DOMAIN!;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID!;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE!;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Auth0Provider
        domain={domain}
        clientId={clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience,
          scope: 'openid profile email offline_access',  // ✅ request refresh token
        }}
        useRefreshTokens={true}                          // ✅ enable rotation
        cacheLocation="localstorage"                     // optional: persist across tabs
      >
        <ApiProvider>
          <AppWrapper>
            <App />
          </AppWrapper>
        </ApiProvider>  
      </Auth0Provider>
    </ThemeProvider>,
  </StrictMode>,
)
