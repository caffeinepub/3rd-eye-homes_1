import { jsPDF } from "@/lib/jspdf-shim";
import { useCallback, useEffect, useState } from "react";
import { useBackend } from "../../hooks/useBackend";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const LOGO =
  "/assets/uploads/3rd_eye_logo-removebg-preview-removebg-preview-019d1f46-4f45-741e-b66d-a9115d608d7c-1.png";
const LS_KEY = "3rdeye_expense_ids";

function getStoredExpenseIds(): bigint[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as string[]).map((s) => BigInt(s));
  } catch {
    return [];
  }
}

interface LedgerRow {
  date: string;
  particulars: string;
  flatOrCategory: string;
  debit: number; // expense = debit
  credit: number; // income = credit
  balance: number;
  type: "income" | "expense";
}

type FilterType = "all" | "income" | "expense";

function buildPdfDoc(
  rows: LedgerRow[],
  dateFrom: string,
  dateTo: string,
): jsPDF {
  const doc = new jsPDF();
  const pageH = doc.internal.pageSize.height;

  const addHeader = () => {
    doc.rect(10, 5, 190, 30);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("3rd Eye Homes", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Society Maintenance Management System", 105, 22, {
      align: "center",
    });
    doc.text("Admin Office, 3rd Eye Society, Your City", 105, 28, {
      align: "center",
    });
  };

  const addFooter = (page: number) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.line(10, pageH - 18, 200, pageH - 18);
    doc.text(
      `Income & Expense Statement | Period: ${dateFrom || "All"} to ${dateTo || "All"} | Printed: ${new Date().toLocaleDateString("en-IN")}`,
      10,
      pageH - 12,
    );
    doc.text(`Page ${page}`, 190, pageH - 12, { align: "right" });
    doc.text("3rd Eye Homes — Society Maintenance Management", 105, pageH - 6, {
      align: "center",
    });
  };

  addHeader();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Income & Expense Statement", 105, 42, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Period: ${dateFrom || "Beginning"} to ${dateTo || "Date"}`,
    105,
    50,
    { align: "center" },
  );
  doc.line(10, 53, 200, 53);

  let y = 62;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Date", 12, y);
  doc.text("Particulars", 38, y);
  doc.text("Flat/Category", 100, y);
  doc.text("Debit (Dr)", 138, y, { align: "right" });
  doc.text("Credit (Cr)", 163, y, { align: "right" });
  doc.text("Balance", 198, y, { align: "right" });
  doc.line(10, y + 2, 200, y + 2);
  doc.setFont("helvetica", "normal");
  y += 8;

  let page = 1;
  for (const r of rows) {
    if (y > pageH - 30) {
      addFooter(page);
      doc.addPage();
      page++;
      addHeader();
      y = 44;
    }
    doc.text(r.date, 12, y);
    doc.text(r.particulars.slice(0, 32), 38, y);
    doc.text(r.flatOrCategory.slice(0, 20), 100, y);
    doc.text(r.debit ? r.debit.toLocaleString("en-IN") : "—", 138, y, {
      align: "right",
    });
    doc.text(r.credit ? r.credit.toLocaleString("en-IN") : "—", 163, y, {
      align: "right",
    });
    doc.text(r.balance.toLocaleString("en-IN"), 198, y, { align: "right" });
    y += 6;
  }

  doc.line(10, y, 200, y);
  y += 6;
  const totIncome = rows.reduce((s, r) => s + r.credit, 0);
  const totExpense = rows.reduce((s, r) => s + r.debit, 0);
  const netBal = rows.length ? rows[rows.length - 1].balance : 0;
  doc.setFont("helvetica", "bold");
  doc.text("TOTALS", 38, y);
  doc.text(totExpense.toLocaleString("en-IN"), 138, y, { align: "right" });
  doc.text(totIncome.toLocaleString("en-IN"), 163, y, { align: "right" });
  doc.text(netBal.toLocaleString("en-IN"), 198, y, { align: "right" });

  addFooter(page);
  return doc;
}

export default function IncomeExpenseStatement() {
  const backend = useBackend();
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [previewOpen, setPreviewOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!backend) return;
    setLoading(true);
    try {
      const [flats, expenseIds] = await Promise.all([
        backend.getPendingFlats(),
        Promise.resolve(getStoredExpenseIds()),
      ]);

      // Fetch all flat statements
      const statementResults = await Promise.all(
        flats.map((f) =>
          backend
            .getFlatStatement(f.id)
            .then((st) => ({ flat: f, ...st }))
            .catch(() => ({ flat: f, credits: [], debits: [] })),
        ),
      );

      // Fetch all expenses
      const expenseResults = await Promise.all(
        expenseIds.map((id) => backend.getExpense(id).catch(() => null)),
      );

      // Build all ledger rows
      const allRaw: Omit<LedgerRow, "balance">[] = [];

      for (const { flat, credits } of statementResults) {
        for (const c of credits as any[]) {
          allRaw.push({
            date: c.date,
            particulars: `Maintenance Payment (${c.paymentMode})`,
            flatOrCategory: `${flat.block}-${flat.flatNumber} (${flat.ownerName})`,
            debit: 0,
            credit: Number(c.amount),
            type: "income",
          });
        }
      }

      for (const exp of expenseResults) {
        if (!exp) continue;
        allRaw.push({
          date: exp.date,
          particulars: exp.description,
          flatOrCategory: exp.category,
          debit: Number(exp.amount),
          credit: 0,
          type: "expense",
        });
      }

      allRaw.sort((a, b) => a.date.localeCompare(b.date));

      let balance = 0;
      const withBalance: LedgerRow[] = allRaw.map((r) => {
        balance += r.credit - r.debit;
        return { ...r, balance };
      });

      setRows(withBalance);
    } catch {
      // silently ignore
    }
    setLoading(false);
  }, [backend]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = rows.filter((r) => {
    if (filterType === "income" && r.type !== "income") return false;
    if (filterType === "expense" && r.type !== "expense") return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    return true;
  });

  // Recalculate running balance for filtered rows
  let runBalance = 0;
  const displayRows = filteredRows.map((r) => {
    runBalance += r.credit - r.debit;
    return { ...r, balance: runBalance };
  });

  const totalIncome = displayRows.reduce((s, r) => s + r.credit, 0);
  const totalExpense = displayRows.reduce((s, r) => s + r.debit, 0);
  const netBalance = displayRows.length
    ? displayRows[displayRows.length - 1].balance
    : 0;

  const downloadPDF = () => {
    const doc = buildPdfDoc(displayRows, dateFrom, dateTo);
    doc.save(`IncomeExpense_${dateFrom || "start"}_to_${dateTo || "end"}.pdf`);
  };

  const handlePrint = () => window.print();

  const LedgerTable = () => (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-teal-700 text-white">
          <th className="text-left p-2 border border-teal-600">Date</th>
          <th className="text-left p-2 border border-teal-600">Particulars</th>
          <th className="text-left p-2 border border-teal-600">
            Flat / Category
          </th>
          <th className="text-right p-2 border border-teal-600 text-red-200">
            Debit (Dr)
          </th>
          <th className="text-right p-2 border border-teal-600 text-green-200">
            Credit (Cr)
          </th>
          <th className="text-right p-2 border border-teal-600">Balance</th>
        </tr>
      </thead>
      <tbody>
        {displayRows.map((r, i) => (
          <tr
            // biome-ignore lint/suspicious/noArrayIndexKey: ledger rows indexed
            key={i}
            className={`${
              i % 2 === 0 ? "bg-white" : "bg-gray-50"
            } ${r.type === "income" ? "" : ""}`}
          >
            <td className="p-2 border">{r.date}</td>
            <td className="p-2 border">
              <span
                className={`inline-block w-2 h-2 rounded-full mr-1 ${
                  r.type === "income" ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {r.particulars}
            </td>
            <td className="p-2 border text-gray-600">{r.flatOrCategory}</td>
            <td className="p-2 border text-right text-red-600 font-medium">
              {r.debit ? `₹${r.debit.toLocaleString("en-IN")}` : "–"}
            </td>
            <td className="p-2 border text-right text-green-600 font-medium">
              {r.credit ? `₹${r.credit.toLocaleString("en-IN")}` : "–"}
            </td>
            <td
              className={`p-2 border text-right font-bold ${
                r.balance >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              ₹{Math.abs(r.balance).toLocaleString("en-IN")}
              <span className="text-xs ml-1">
                {r.balance >= 0 ? "Cr" : "Dr"}
              </span>
            </td>
          </tr>
        ))}
        {displayRows.length === 0 && (
          <tr>
            <td
              colSpan={6}
              className="p-8 text-center text-gray-400"
              data-ocid="incomeexpense.empty_state"
            >
              No transactions found for selected filters.
            </td>
          </tr>
        )}
      </tbody>
      {displayRows.length > 0 && (
        <tfoot>
          <tr className="bg-teal-50 font-bold border-t-2 border-teal-400">
            <td colSpan={3} className="p-2 border">
              Totals
            </td>
            <td className="p-2 border text-right text-red-700">
              ₹{totalExpense.toLocaleString("en-IN")}
            </td>
            <td className="p-2 border text-right text-green-700">
              ₹{totalIncome.toLocaleString("en-IN")}
            </td>
            <td
              className={`p-2 border text-right ${
                netBalance >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              ₹{Math.abs(netBalance).toLocaleString("en-IN")}
              <span className="text-xs ml-1">
                {netBalance >= 0 ? "Cr" : "Dr"}
              </span>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <img src={LOGO} alt="" className="w-6 h-6 object-contain" />
            Income & Expense Statement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                data-ocid="incomeexpense.date_from.input"
              />
            </div>
            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                data-ocid="incomeexpense.date_to.input"
              />
            </div>
            <div>
              <Label htmlFor="typeFilter">Type</Label>
              <select
                id="typeFilter"
                className="w-full border rounded px-3 py-2 text-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                data-ocid="incomeexpense.type.select"
              >
                <option value="all">All Transactions</option>
                <option value="income">Income Only</option>
                <option value="expense">Expenses Only</option>
              </select>
            </div>
            <Button
              onClick={loadData}
              disabled={loading}
              className="bg-teal-700 hover:bg-teal-800 text-white"
              data-ocid="incomeexpense.refresh.button"
            >
              {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button
              variant="outline"
              className="border-teal-400 text-teal-700 hover:bg-teal-50"
              onClick={() => setPreviewOpen(true)}
              data-ocid="incomeexpense.view.button"
            >
              View
            </Button>
            <Button
              variant="outline"
              className="border-teal-400 text-teal-700 hover:bg-teal-50"
              onClick={downloadPDF}
              data-ocid="incomeexpense.download.button"
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              className="border-teal-400 text-teal-700 hover:bg-teal-50"
              onClick={handlePrint}
              data-ocid="incomeexpense.print.button"
            >
              Print (A4)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {displayRows.length > 0 && (
        <div className="grid grid-cols-3 gap-4 no-print">
          <Card className="border-green-300">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Income</p>
              <p className="text-xl font-bold text-green-700">
                ₹{totalIncome.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card className="border-red-300">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
              <p className="text-xl font-bold text-red-700">
                ₹{totalExpense.toLocaleString("en-IN")}
              </p>
            </CardContent>
          </Card>
          <Card
            className={`${
              netBalance >= 0 ? "border-teal-300" : "border-red-300"
            }`}
          >
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Net Balance</p>
              <p
                className={`text-xl font-bold ${
                  netBalance >= 0 ? "text-teal-700" : "text-red-700"
                }`}
              >
                ₹{Math.abs(netBalance).toLocaleString("en-IN")}
                <span className="text-sm ml-1">
                  {netBalance >= 0 ? "Surplus" : "Deficit"}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Print-only header */}
      <div className="print-only mb-4">
        <div className="border-2 border-black p-3 mb-2">
          <div className="flex items-center gap-3 mb-1">
            <img
              src={LOGO}
              alt="3rd Eye Home"
              className="w-12 h-12 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold">3rd Eye Homes</h1>
              <p className="text-sm">Society Maintenance Management System</p>
              <p className="text-xs text-gray-600">
                Admin Office, 3rd Eye Society, Your City
              </p>
            </div>
          </div>
        </div>
        <h2 className="text-lg font-semibold">Income & Expense Statement</h2>
        <p className="text-sm text-gray-600">
          Period: {dateFrom || "Beginning"} to {dateTo || "Date"}
        </p>
        <hr className="my-2" />
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader className="no-print">
          <CardTitle className="text-sm">
            Tally Ledger — All Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p
              className="p-4 text-gray-400"
              data-ocid="incomeexpense.loading_state"
            >
              Loading transactions...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <LedgerTable />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print-only footer */}
      <div className="print-only mt-4 text-xs text-gray-500 border-t pt-2">
        Printed on: {new Date().toLocaleDateString("en-IN")} | Period:{" "}
        {dateFrom || "All"} to {dateTo || "All"} | 3rd Eye Homes
      </div>

      {/* View Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="max-w-5xl max-h-[85vh] overflow-y-auto"
          data-ocid="incomeexpense.modal"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
              3rd Eye Homes — Income & Expense Statement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="border rounded-lg p-4 bg-teal-50">
              <h3 className="font-bold text-center text-lg text-teal-900">
                3rd Eye Homes
              </h3>
              <p className="text-center text-sm text-gray-600">
                Society Maintenance Management System
              </p>
              <hr className="my-2" />
              <h4 className="font-semibold text-center">
                Income & Expense Statement
              </h4>
              <p className="text-sm text-center text-gray-600">
                Period: {dateFrom || "Beginning"} to {dateTo || "Date"}
              </p>
            </div>

            {/* Summary in modal */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-xs text-gray-500">Total Income</p>
                <p className="font-bold text-green-700">
                  ₹{totalIncome.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-xs text-gray-500">Total Expenses</p>
                <p className="font-bold text-red-700">
                  ₹{totalExpense.toLocaleString("en-IN")}
                </p>
              </div>
              <div
                className={`border rounded p-3 ${
                  netBalance >= 0
                    ? "bg-teal-50 border-teal-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p className="text-xs text-gray-500">Net Balance</p>
                <p
                  className={`font-bold ${
                    netBalance >= 0 ? "text-teal-700" : "text-red-700"
                  }`}
                >
                  ₹{Math.abs(netBalance).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <LedgerTable />

            <div className="flex gap-2 justify-end">
              <Button
                className="bg-teal-700 hover:bg-teal-800 text-white"
                onClick={downloadPDF}
                data-ocid="incomeexpense.modal.download.button"
              >
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                data-ocid="incomeexpense.modal.print.button"
              >
                Print (A4)
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPreviewOpen(false)}
                data-ocid="incomeexpense.modal.close.button"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
