import { AppProvider } from '@toolpad/core/AppProvider';
import {
  SignInPage,
  AuthResponse, 
  AuthProvider
} from '@toolpad/core/SignInPage';

import { Box } from '@mui/material';
import darkTheme from '../css-styles/darkTheme'; // your custom MUI dark theme

import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const providers = [{ id: 'auth0', name: 'Login with Auth0' }];

export default function OAuthSignInPage() {
  // const { loginWithRedirect, getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const navigate = useNavigate();

  const signIn = async (
    _provider: AuthProvider,
    _formData?: any,
    _callbackUrl?: string
  ): Promise<AuthResponse> => {
    await loginWithRedirect();
    return {}; // ✅ satisfies the expected return type
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  return (
    <AppProvider theme={darkTheme}>
      <Box
        sx={{
          position: 'fixed',
          inset: 0, // same as: top: 0, left: 0, right: 0, bottom: 0
          backgroundColor: darkTheme.palette.background.default,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
            sx={{
                backgroundColor: darkTheme.palette.background.paper,
                padding: 4,
                borderRadius: 2,
                boxShadow: 3,
                width: '100%',
                maxWidth: 400,
                minHeight: 300,
                maxHeight: '60vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}
        >
          <SignInPage signIn={signIn} providers={providers} />
        </Box>
      </Box>
    </AppProvider>
  );
}
