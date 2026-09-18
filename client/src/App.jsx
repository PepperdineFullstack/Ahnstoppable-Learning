import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import SignIn from "./pages/SignIn";
import HomeDashboard from "./pages/HomeDashboard";
import ClassDashboard from "./pages/ClassDashboard";
import Register from "./pages/Register";
import SiteTagline from "./components/ui/SiteTagline";

function PrivateRoute({ children }) {
  const { user, token } = useAuth();
  return user && token ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SiteTagline />
        <Routes>
          <Route path="/"               element={<SignIn />} />
          <Route path="/register"       element={<Register />} />
          <Route path="/home"           element={<PrivateRoute><HomeDashboard /></PrivateRoute>} />
          {/* classId comes from the URL — ClassDashboard reads it via useParams() */}
          <Route path="/class/:classId" element={<PrivateRoute><ClassDashboard /></PrivateRoute>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
 

export default App;