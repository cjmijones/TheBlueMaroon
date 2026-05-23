// hooks/userProfile.tsx
import { useEffect, useState } from "react";
import { UserProfile } from "../types";
import { api } from "../lib/api";
import { useSupabaseAuth } from "../providers/SupabaseAuthProvider";

export function useUserProfile(): UserProfile | null {
  const { isAuthenticated } = useSupabaseAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated) {
        setProfile(null);
        return;
      }

      try {
        const response = await api.get("/me");
        setProfile(response.data);
      } catch (err) {
        console.error("Error fetching user profile", err);
      }
    };

    fetchProfile();
  }, [isAuthenticated]);

  return profile;
}
