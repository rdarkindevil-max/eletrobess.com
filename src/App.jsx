import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Clients from "./pages/Clients";

function Page({ name, children }) {
  return <Layout currentPageName={name}>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/clients" />} />

        <Route
          path="/clients"
          element={
            <Page name="Clients">
              <Clients />
            </Page>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
