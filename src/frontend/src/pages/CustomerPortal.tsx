import { useState } from "react";
import CustomerDashboard from "../components/customer/CustomerDashboard";
import CustomerReceipts from "../components/customer/CustomerReceipts";
import PaymentStatement from "../components/customer/PaymentStatement";
import PendingStatement from "../components/customer/PendingStatement";
import SocietyPending from "../components/customer/SocietyPending";
import { Button } from "../components/ui/button";

const LOGO =
  "/assets/uploads/3rd_eye_logo-removebg-preview-removebg-preview-019d1f46-4f45-741e-b66d-a9115d608d7c-1.png";

const SLICERS = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "statement", label: "Payment Statement", icon: "📋" },
  { key: "pending", label: "Pending Statement", icon: "⏳" },
  { key: "societypending", label: "Society Pending", icon: "🏘️" },
  { key: "receipts", label: "Receipts", icon: "🧾" },
];

interface Props {
  flatId: bigint;
  ownerName: string;
  flatNumber: string;
  block: string;
  onLogout: () => void;
}

export default function CustomerPortal({
  flatId,
  ownerName,
  flatNumber,
  block,
  onLogout,
}: Props) {
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (active) {
      case "dashboard":
        return (
          <CustomerDashboard
            flatId={flatId}
            ownerName={ownerName}
            flatNumber={flatNumber}
            block={block}
          />
        );
      case "statement":
        return (
          <PaymentStatement
            flatId={flatId}
            ownerName={ownerName}
            flatNumber={flatNumber}
          />
        );
      case "pending":
        return (
          <PendingStatement
            flatId={flatId}
            ownerName={ownerName}
            flatNumber={flatNumber}
          />
        );
      case "societypending":
        return <SocietyPending />;
      case "receipts":
        return (
          <CustomerReceipts
            flatId={flatId}
            ownerName={ownerName}
            flatNumber={flatNumber}
          />
        );
      default:
        return (
          <CustomerDashboard
            flatId={flatId}
            ownerName={ownerName}
            flatNumber={flatNumber}
            block={block}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-teal-900 text-white transform transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 no-print`}
      >
        <div className="p-4 border-b border-teal-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1 flex-shrink-0">
              <img
                src={LOGO}
                alt="3rd Eye Home"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-sm">3rd Eye Homes</div>
              <div className="text-teal-300 text-xs">{ownerName}</div>
              <div className="text-teal-400 text-xs">
                Flat {flatNumber} – {block}
              </div>
            </div>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {SLICERS.map((s) => (
            <button
              type="button"
              key={s.key}
              onClick={() => {
                setActive(s.key);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active === s.key
                  ? "bg-teal-700 text-white"
                  : "text-teal-200 hover:bg-teal-800"
              }`}
              data-ocid={`nav.${s.key}.link`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <Button
            variant="outline"
            className="w-full text-teal-900"
            onClick={onLogout}
            data-ocid="customer.logout.button"
          >
            Logout
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={() => setSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-teal-100 px-4 py-3 flex items-center gap-3 no-print">
          <button
            type="button"
            className="md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <span className="text-2xl">☰</span>
          </button>
          <img
            src={LOGO}
            alt="3rd Eye Home"
            className="w-8 h-8 object-contain"
          />
          <h2 className="font-semibold text-teal-800">
            {SLICERS.find((s) => s.key === active)?.label}
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-4">{renderContent()}</main>
      </div>
    </div>
  );
}
