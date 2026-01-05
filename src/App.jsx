import Dashboard from "./components/Dashboard";
import AuthPage from "./components/Auth";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Settings from "./components/Settings"
import "./index.css";

function AppContent() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <AuthPage />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <AuthProvider>
            <AppContent />
          </AuthProvider>} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
