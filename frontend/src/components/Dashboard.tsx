import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserProfile } from "../hooks/userProfile.tsx";
import axios from "axios";

export default function Dashboard() {
  const { logout, getAccessTokenSilently } = useAuth0();
  const profile = useUserProfile();
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const toggleUserInfo = () => {
    setShowUserInfo((prev) => !prev);
  };

  const updateUsername = async () => {
    try {
      const token = await getAccessTokenSilently();
      await axios.post(
        `${import.meta.env.VITE_API_DEV_URL}/me/update-username`,
        { username: newUsername },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setError("");
      setSuccess("Username updated successfully.");
      setEditingUsername(false);
      setNewUsername("");
      window.location.reload(); // reload to re-trigger useUserProfile
    } catch (err: any) {
      if (err.response?.data?.detail === "Username already taken") {
        setError("❌ That username is already taken.");
      } else {
        setError("⚠️ Failed to update username.");
      }
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#1f1f1f",
        color: "white",
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
          <p><strong>Username:</strong> {profile.name ?? "Not set"}</p>
          <p><strong>Created:</strong> {profile.created_at
            ? new Date(profile.created_at).toLocaleString()
            : "Never logged in"}</p>
          <p><strong>Last Login:</strong> {profile.last_login
            ? new Date(profile.last_login).toLocaleString()
            : "Never logged in"}</p>

          {!editingUsername ? (
            <button
              onClick={() => setEditingUsername(true)}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#3498db",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Change Username
            </button>
          ) : (
            <div style={{ marginTop: "1rem" }}>
              <input
                type="text"
                placeholder="Enter new username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                style={{
                  padding: "0.5rem",
                  borderRadius: "4px",
                  border: "1px solid #ccc",
                  marginRight: "0.5rem",
                }}
              />
              <button
                onClick={updateUsername}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#27ae60",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingUsername(false);
                  setNewUsername("");
                  setError("");
                }}
                style={{
                  marginLeft: "0.5rem",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#7f8c8d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              {error && <p style={{ color: "tomato", marginTop: "0.5rem" }}>{error}</p>}
              {success && <p style={{ color: "limegreen", marginTop: "0.5rem" }}>{success}</p>}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
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
}
