import { useState } from "react";
import AdminPortal from "./pages/AdminPortal";
import CustomerPortal from "./pages/CustomerPortal";
import LoginPage from "./pages/LoginPage";

export type AuthState =
  | { role: "none" }
  | { role: "admin" }
  | {
      role: "customer";
      flatId: bigint;
      ownerName: string;
      flatNumber: string;
      block: string;
    };

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ role: "none" });

  if (auth.role === "none") return <LoginPage onLogin={setAuth} />;
  if (auth.role === "admin")
    return <AdminPortal onLogout={() => setAuth({ role: "none" })} />;
  if (auth.role === "customer")
    return (
      <CustomerPortal
        flatId={auth.flatId}
        ownerName={auth.ownerName}
        flatNumber={auth.flatNumber}
        block={auth.block}
        onLogout={() => setAuth({ role: "none" })}
      />
    );
  return null;
}
