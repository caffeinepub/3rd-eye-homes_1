import { useState } from "react";
import type { AuthState } from "../App";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useBackend } from "../hooks/useBackend";

const LOGO =
  "/assets/uploads/3rd_eye_logo-removebg-preview-removebg-preview-019d1f46-4f45-741e-b66d-a9115d608d7c-1.png";

type LoginMode = "choose" | "admin" | "customer";

export default function LoginPage({
  onLogin,
}: { onLogin: (s: AuthState) => void }) {
  const backend = useBackend();
  const [mode, setMode] = useState<LoginMode>("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [custPass, setCustPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleAdminLogin() {
    setError("");
    if (email === "admin@3rdeye.com" && password === "Admin@1234") {
      onLogin({ role: "admin" });
    } else {
      setError("Invalid admin credentials.");
    }
  }

  async function handleCustomerLogin() {
    if (!backend) {
      setError("Not connected. Please wait.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const flats = await backend.getPendingFlats();
      const flat = flats.find((f) => f.ownerMobile === mobile);
      if (!flat) {
        setError("Mobile number not found.");
        setLoading(false);
        return;
      }
      const defaultPass = mobile.slice(-6);
      const actualPass =
        flat.password && flat.password !== "" ? flat.password : defaultPass;
      if (custPass !== actualPass) {
        setError("Incorrect password.");
        setLoading(false);
        return;
      }
      onLogin({
        role: "customer",
        flatId: flat.id,
        ownerName: flat.ownerName,
        flatNumber: flat.flatNumber,
        block: flat.block,
      });
    } catch {
      setError("Login failed. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-[zoomIn_0.6s_ease-out]">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-lg mb-4 p-2">
            <img
              src={LOGO}
              alt="3rd Eye Home"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-white">3rd Eye Homes</h1>
          <p className="text-teal-200 mt-1">Society Maintenance Management</p>
          <p className="text-teal-300 text-sm mt-1">v2.0</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-teal-800">
              {mode === "choose" && "Welcome"}
              {mode === "admin" && "Admin Login"}
              {mode === "customer" && "Flat Owner Login"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mode === "choose" && (
              <div className="space-y-3">
                <Button
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white"
                  onClick={() => setMode("admin")}
                  data-ocid="admin.primary_button"
                >
                  Admin Login
                </Button>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setMode("customer")}
                  data-ocid="customer.primary_button"
                >
                  Flat Owner Login
                </Button>
              </div>
            )}

            {mode === "admin" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="adminEmail">Email</Label>
                  <Input
                    id="adminEmail"
                    placeholder="admin@3rdeye.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-ocid="admin.input"
                  />
                </div>
                <div>
                  <Label htmlFor="adminPass">Password</Label>
                  <Input
                    id="adminPass"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                    data-ocid="admin.password.input"
                  />
                </div>
                {error && (
                  <p
                    className="text-red-500 text-sm"
                    data-ocid="admin.error_state"
                  >
                    {error}
                  </p>
                )}
                <Button
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white"
                  onClick={handleAdminLogin}
                  data-ocid="admin.submit_button"
                >
                  Login
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setMode("choose");
                    setError("");
                  }}
                >
                  Back
                </Button>
              </div>
            )}

            {mode === "customer" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custMobile">Mobile Number</Label>
                  <Input
                    id="custMobile"
                    placeholder="10-digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    data-ocid="customer.mobile.input"
                  />
                </div>
                <div>
                  <Label htmlFor="custPassword">Password</Label>
                  <Input
                    id="custPassword"
                    type="password"
                    placeholder="Default: last 6 digits of mobile"
                    value={custPass}
                    onChange={(e) => setCustPass(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleCustomerLogin()
                    }
                    data-ocid="customer.password.input"
                  />
                </div>
                {error && (
                  <p
                    className="text-red-500 text-sm"
                    data-ocid="customer.error_state"
                  >
                    {error}
                  </p>
                )}
                <Button
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white"
                  onClick={handleCustomerLogin}
                  disabled={loading}
                  data-ocid="customer.submit_button"
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setMode("choose");
                    setError("");
                  }}
                >
                  Back
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes zoomIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
