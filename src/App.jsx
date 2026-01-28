import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Clients from "./pages/Clients";
import ProtectedRoute from "./auth/ProtectedRoute";
import Login from "./pages/Login";
function Page({ name, children }) {
  return <Layout currentPageName={name}>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
    <Route path="/login" element={<Login />} />

<Route
  path="/clients"
  element={
    <ProtectedRoute allow={["staff"]}>
      <Clients />
    </ProtectedRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  );
}
