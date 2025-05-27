// src/layout/PrivateAppLayout.tsx
import ProtectedRoute from "../components/auth/ProtectedRoute";
import AppLayout from "./AppLayout";

export default function PrivateAppLayout() {
  return (
    <ProtectedRoute>
      {/* ProtectedRoute just renders <Outlet>, but we need to
         place the actual layout in the tree, so wrap like this: */}
      <AppLayout />
    </ProtectedRoute>
  );
}
