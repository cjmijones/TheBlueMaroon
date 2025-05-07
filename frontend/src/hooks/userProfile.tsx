// hooks/userProfile.tsx
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { UserProfile } from "../types";

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

        const decoded = JSON.parse(atob(token.split(".")[1]));
        console.log("🔐 Decoded Access Token Payload:", decoded);

        const response = await axios.get(`${import.meta.env.VITE_API_DEV_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile(response.data);
      } catch (err) {
        console.error("Error fetching user profile", err);
      }
    };

    fetchProfile();
  }, [isAuthenticated]);

  return profile;
}
