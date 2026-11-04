import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./styles/App.css";
import ScrollToTop from "./components/ScrollToTop";
import { getStoredAdmin } from "./utils/authStorage";

const Front = lazy(() => import("./pages/FrontPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Addstudent = lazy(() => import("./pages/AddStudent"));
const Enrolled = lazy(() => import("./pages/Enrolled"));
const Signin = lazy(() => import("./pages/SignIn"));
const Period = lazy(() => import("./pages/Period"));

// 🔒 PROTECTED ROUTE COMPONENT
const ProtectedRoute = ({ children }) => {
  const isAdmin = getStoredAdmin();
  if (!isAdmin) {
    return <Navigate to="/Signin" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Suspense fallback={<div className="p-10 text-center font-bold text-blue-600 animate-pulse uppercase tracking-widest text-xs">Synchronizing System...</div>}>
        <Routes>
          <Route path="/" element={<Front />} />
          <Route path="/Signin" element={<Signin />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/Addstudent" element={<ProtectedRoute><Addstudent /></ProtectedRoute>} />
          <Route path="/Enrolled" element={<ProtectedRoute><Enrolled /></ProtectedRoute>} />
          <Route path="/Period" element={<ProtectedRoute><Period /></ProtectedRoute>} />
          
          {/* Catch all redirect to front */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
