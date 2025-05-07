export type UserProfile = {
    user_id: string;            // matches `id` (Auth0 sub)
    name: string;
    email: string;
    picture: string;
    created_at: string;    // ISO timestamp (converted to string from Python datetime)
    last_login: string | null;
  };