import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";

import App from './App.tsx'

import { ThemeProvider } from './context/ThemeContext.tsx';
import { AppWrapper } from './components/common/PageMeta.tsx';
import { ApiProvider } from './providers/ApiProvider.tsx';
import { SupabaseAuthProvider } from './providers/SupabaseAuthProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SupabaseAuthProvider>
        <ApiProvider>
          <AppWrapper>
            <App />
          </AppWrapper>
        </ApiProvider>  
      </SupabaseAuthProvider>
    </ThemeProvider>,
  </StrictMode>,
)
