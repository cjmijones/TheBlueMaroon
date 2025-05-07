import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserProfile } from "../hooks/userProfile.tsx";

export default function Dashboard() {
  const { logout } = useAuth0();
  const profile = useUserProfile();
  const [showUserInfo, setShowUserInfo] = useState(false);

  const toggleUserInfo = () => {
    setShowUserInfo((prev) => !prev);
  };

  return (
    <div
      style={{
        backgroundColor: "#1f1f1f", // dark gray background
        color: "white",             // white text
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>Welcome to the Dashboard</h1>

      <button
        onClick={toggleUserInfo}
        style={{
          padding: "0.5rem 1rem",
          marginBottom: "1rem",
          backgroundColor: "#444",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        {showUserInfo ? "Hide User Info" : "Show User Info"}
      </button>

      {showUserInfo && profile && (
        <div style={{ marginBottom: "2rem" }}>
          <p><strong>User ID:</strong> {profile.user_id}</p>
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          {/* <img src={profile.picture} alt="user profile pic" /> */}
          <p><strong>Created:</strong> {profile.created_at
            ? new Date(profile.created_at).toLocaleString()
            : "Never logged in"}</p>
          <p><strong>Last Login:</strong> {profile.last_login
            ? new Date(profile.last_login).toLocaleString()
            : "Never logged in"}</p>
        </div>
      )}

      <button
        onClick={() => logout({logoutParams: {returnTo: window.location.origin}})}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#c0392b",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Log Out
      </button>
    </div>
  );
};

