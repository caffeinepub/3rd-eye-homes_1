import { useState } from "react";
import AdminDashboard from "../components/admin/AdminDashboard";
import AdminProfile from "../components/admin/AdminProfile";
import Expenses from "../components/admin/Expenses";
import FlatOwners from "../components/admin/FlatOwners";
import IncomeExpenseStatement from "../components/admin/IncomeExpenseStatement";
import MaintenanceEntry from "../components/admin/MaintenanceEntry";
import MonthlyDebit from "../components/admin/MonthlyDebit";
import PendingList from "../components/admin/PendingList";
import Statement from "../components/admin/Statement";
import { Button } from "../components/ui/button";

const LOGO =
  "/assets/uploads/3rd_eye_logo-removebg-preview-removebg-preview-019d1f46-4f45-741e-b66d-a9115d608d7c-1.png";

const SLICERS = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "flatowners", label: "Flat Owners", icon: "👥" },
  { key: "maintenance", label: "Maintenance Entry", icon: "💳" },
  { key: "statement", label: "Statement", icon: "📋" },
  { key: "monthlydebit", label: "Monthly Debit", icon: "📅" },
  { key: "expenses", label: "Expenses", icon: "💰" },
  { key: "incomeexpense", label: "Income & Expense", icon: "📈" },
  { key: "profile", label: "Admin Profile", icon: "⚙️" },
  { key: "pending", label: "Pending List", icon: "⏳" },
];

export default function AdminPortal({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (active) {
      case "dashboard":
        return <AdminDashboard />;
      case "flatowners":
        return <FlatOwners />;
      case "maintenance":
        return <MaintenanceEntry />;
      case "statement":
        return <Statement />;
      case "monthlydebit":
        return <MonthlyDebit />;
      case "expenses":
        return <Expenses />;
      case "incomeexpense":
        return <IncomeExpenseStatement />;
      case "profile":
        return <AdminProfile />;
      case "pending":
        return <PendingList />;
      default:
        return <AdminDashboard />;
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
              <div className="text-teal-300 text-xs">Admin Console</div>
            </div>
          </div>
        </div>
        <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-120px)]">
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
            data-ocid="admin.logout.button"
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
