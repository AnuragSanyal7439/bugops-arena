import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import Dashboard from "./pages/Dashboard";
import ChallengePage from "./pages/ChallengePage"; // ✅ NEW IMPORT

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/challenge" element={<ChallengePage />} /> {/* ✅ NEW ROUTE */}
      </Routes>
    </Router>
  );
}

export default App;
