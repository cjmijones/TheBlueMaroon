// hooks/userProfile.tsx
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { UserProfile } from "../types";
import { jwtDecode } from "jwt-decode";

export function useUserProfile(): UserProfile | null {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) return;

      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: `${import.meta.env.VITE_AUTH0_AUDIENCE}`,
            scope: "openid profile email",
          },
        });

        console.log("🔐User getAccessTokenSilently in User Profile Hook Call", jwtDecode(token));

        const response = await axios.get(`${import.meta.env.VITE_API_DEV_URL}/api/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile(response.data);
      } catch (err) {
        console.error("Error fetching user profile", err);
      }
    };

    fetchProfile();
  }, [isAuthenticated, getAccessTokenSilently]);

  return profile;
}
