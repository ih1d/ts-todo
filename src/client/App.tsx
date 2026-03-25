import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.js";
import SignUp from "./pages/SignUp.js";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
