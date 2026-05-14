// hooks/userProfile.tsx
import { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { api } from "../lib/api";
import { useSupabaseAuth } from "../providers/SupabaseAuthProvider";

export function useUserProfile(): UserProfile | null {
  const { isAuthenticated, getAccessToken } = useSupabaseAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) return;

      try {
        const token = await getAccessToken();
        const response = await api.get("/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile(response.data);
      } catch (err) {
        console.error("Error fetching user profile", err);
      }
    };

    fetchProfile();
  }, [isAuthenticated, getAccessToken]);

  return profile;
}
