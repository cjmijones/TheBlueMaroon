import { AppProvider } from "@toolpad/core/AppProvider";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useMemo } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import darkTheme from "../../css-styles/darkTheme";
import { useSupabaseAuth } from "../../providers/SupabaseAuthProvider";

function getAuthCallbackError() {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return (
    searchParams.get("error_description") ||
    hashParams.get("error_description") ||
    searchParams.get("error") ||
    hashParams.get("error")
  );
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  const error = useMemo(() => getAuthCallbackError(), []);
  const callbackFailed = Boolean(error) || (!isLoading && !isAuthenticated);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !error) {
      navigate("/dashboard", { replace: true });
    }
  }, [error, isAuthenticated, isLoading, navigate]);

  return (
    <AppProvider theme={darkTheme}>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          backgroundColor: darkTheme.palette.background.default,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
        }}
      >
        <Box
          sx={{
            backgroundColor: darkTheme.palette.background.paper,
            padding: 4,
            borderRadius: 2,
            boxShadow: 3,
            width: "100%",
            maxWidth: 420,
          }}
        >
          {callbackFailed ? (
            <Stack spacing={2.25}>
              <Box>
                <Typography variant="h5" color="white" fontWeight={700}>
                  {error ? "Sign-in link failed" : "Could not finish sign in"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {error || "Please start again from the sign-in page."}
                </Typography>
              </Box>
              <Button component={RouterLink} to="/" variant="contained" fullWidth>
                Back to sign in
              </Button>
            </Stack>
          ) : (
            <Stack spacing={2.25} alignItems="center" textAlign="center">
              <CircularProgress />
              <Box>
                <Typography variant="h5" color="white" fontWeight={700}>
                  Finishing sign in
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  One moment while we confirm your session.
                </Typography>
              </Box>
            </Stack>
          )}
        </Box>
      </Box>
    </AppProvider>
  );
}
