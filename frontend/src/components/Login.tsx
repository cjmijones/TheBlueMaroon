import { AppProvider } from "@toolpad/core/AppProvider";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import darkTheme from "../css-styles/darkTheme";
import { useSupabaseAuth } from "../providers/SupabaseAuthProvider";

export default function SupabaseSignInPage() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
  } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const submit = async (mode: "signin" | "signup") => {
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signin") {
        await signInWithPassword(email, password);
        navigate("/dashboard");
      } else {
        const result = await signUpWithPassword(email, password);
        if (result.needsEmailConfirmation) {
          setNotice("Check your email to confirm your account before signing in.");
          return;
        }
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setPending(false);
    }
  };

  const continueWithGoogle = async () => {
    setPending(true);
    setError("");
    setNotice("");
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setPending(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit("signin");
  };

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
          component="form"
          onSubmit={onSubmit}
          sx={{
            backgroundColor: darkTheme.palette.background.paper,
            padding: 4,
            borderRadius: 2,
            boxShadow: 3,
            width: "100%",
            maxWidth: 420,
          }}
        >
          <Stack spacing={2.25}>
            <Box>
              <Typography variant="h5" color="white" fontWeight={700}>
                TheBlueMaroon
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in with Supabase Auth
              </Typography>
            </Box>

            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              fullWidth
            />

            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
            {notice && (
              <Typography variant="body2" color="success.main">
                {notice}
              </Typography>
            )}

            <Button type="submit" variant="contained" disabled={pending} fullWidth>
              {pending ? "Signing in..." : "Sign in"}
            </Button>
            <Button
              type="button"
              variant="outlined"
              disabled={pending}
              onClick={() => void submit("signup")}
              fullWidth
            >
              Create account
            </Button>
            <Button
              type="button"
              variant="text"
              disabled={pending}
              onClick={() => void continueWithGoogle()}
              fullWidth
            >
              Continue with Google
            </Button>
          </Stack>
        </Box>
      </Box>
    </AppProvider>
  );
}
