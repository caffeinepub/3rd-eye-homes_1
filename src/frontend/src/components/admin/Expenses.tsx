import { jsPDF } from "@/lib/jspdf-shim";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
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
    const arr = JSON.parse(raw) as string[];
    return arr.map((s) => BigInt(s));
  } catch {
    return [];
  }
}

function saveExpenseId(id: bigint) {
  const existing = getStoredExpenseIds();
  if (!existing.find((e) => e === id)) {
    localStorage.setItem(LS_KEY, JSON.stringify([...existing, String(id)]));
  }
}

function addLogoToPdf(doc: jsPDF) {
  doc.rect(10, 5, 190, 28);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("3rd Eye Homes", 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Society Maintenance Management System", 105, 22, {
    align: "center",
  });
  doc.text("Admin Office, 3rd Eye Society, Your City - 000000", 105, 28, {
    align: "center",
  });
}

function addPdfFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  category: string,
  date: string,
) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.line(10, pageHeight - 18, 200, pageHeight - 18);
  doc.text(
    `Category: ${category} | Date: ${date} | Printed: ${new Date().toLocaleDateString("en-IN")}`,
    10,
    pageHeight - 12,
  );
  doc.text(`Page ${pageNum} of ${totalPages}`, 190, pageHeight - 12, {
    align: "right",
  });
  doc.text(
    "3rd Eye Homes — Society Maintenance Management",
    105,
    pageHeight - 6,
    {
      align: "center",
    },
  );
}

interface Expense {
  id: bigint;
  category: string;
  description: string;
  amount: bigint;
  date: string;
}

export default function Expenses() {
  const backend = useBackend();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);
  const [categories, setCategories] = useState<string[]>([
    "Maintenance",
    "Repairs",
    "Cleaning",
    "Security",
    "Utilities",
    "Other",
  ]);

  const loadExpenses = useCallback(async () => {
    if (!backend) return;
    try {
      const ids = getStoredExpenseIds();
      if (ids.length === 0) {
        setLoadingList(false);
        return;
      }
      const results = await Promise.all(
        ids.map((id) => backend.getExpense(id)),
      );
      const valid = results.filter((e): e is Expense => e !== null);
      valid.sort((a, b) => b.date.localeCompare(a.date));
      setExpenses(valid);
    } catch {
      // silently ignore
    }
    setLoadingList(false);
  }, [backend]);

  useEffect(() => {
    if (!backend) return;
    Promise.all([
      backend
        .getSocietyProfile()
        .then((p) => {
          if (p && p.voucherCategories.length > 0)
            setCategories(p.voucherCategories);
        })
        .catch(() => {}),
      loadExpenses(),
    ]);
  }, [backend, loadExpenses]);

  const save = async () => {
    if (!backend || !category || !description || !amount) {
      toast.error("Please fill all fields.");
      return;
    }
    setSaving(true);
    try {
      const newId = await backend.addExpense({
        id: BigInt(0),
        category,
        description,
        amount: BigInt(Number(amount)),
        date,
      });
      saveExpenseId(newId);
      setCategory("");
      setDescription("");
      setAmount("");
      toast.success("Expense saved successfully!");
      await loadExpenses();
    } catch {
      toast.error("Failed to save expense.");
    }
    setSaving(false);
  };

  const downloadExpensePDF = (exp: Expense) => {
    const doc = new jsPDF();
    addLogoToPdf(doc);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Expense Voucher", 105, 42, { align: "center" });
    doc.line(10, 45, 200, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const rows = [
      ["Date", exp.date],
      ["Category", exp.category],
      ["Description", exp.description],
      ["Amount", `Rs.${Number(exp.amount).toLocaleString("en-IN")}`],
    ];
    let y = 58;
    for (const [k, v] of rows) {
      doc.setFont("helvetica", "bold");
      doc.text(`${k}:`, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(v, 65, y);
      y += 10;
    }
    addPdfFooter(doc, 1, 1, exp.category, exp.date);
    doc.save(`Expense_${exp.date}_${exp.category}.pdf`);
  };

  const printExpensePDF = (exp: Expense) => {
    downloadExpensePDF(exp);
  };

  const downloadAllPDF = () => {
    if (expenses.length === 0) return;
    const doc = new jsPDF();
    addLogoToPdf(doc);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Expense Report — All Expenses", 105, 42, { align: "center" });
    doc.line(10, 45, 200, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-IN")}`, 20, 52);
    let y = 62;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Date", 15, y);
    doc.text("Category", 45, y);
    doc.text("Description", 85, y);
    doc.text("Amount (Rs.)", 155, y, { align: "right" });
    doc.line(10, y + 2, 200, y + 2);
    doc.setFont("helvetica", "normal");
    y += 8;
    let total = 0;
    let pageNum = 1;
    for (const exp of expenses) {
      if (y > 255) {
        addPdfFooter(
          doc,
          pageNum,
          1,
          "All",
          new Date().toLocaleDateString("en-IN"),
        );
        doc.addPage();
        pageNum++;
        addLogoToPdf(doc);
        y = 42;
      }
      doc.text(exp.date, 15, y);
      doc.text(exp.category.slice(0, 18), 45, y);
      doc.text(exp.description.slice(0, 35), 85, y);
      doc.text(Number(exp.amount).toLocaleString("en-IN"), 155, y, {
        align: "right",
      });
      total += Number(exp.amount);
      y += 7;
    }
    doc.line(10, y, 200, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL", 85, y);
    doc.text(total.toLocaleString("en-IN"), 155, y, { align: "right" });
    addPdfFooter(
      doc,
      pageNum,
      pageNum,
      "All",
      new Date().toLocaleDateString("en-IN"),
    );
    doc.save("Expense_Report_All.pdf");
  };

  return (
    <div className="space-y-4">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src={LOGO} alt="" className="w-6 h-6 object-contain" />
            Add Expense
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="cat">Category</Label>
            <select
              id="cat"
              className="w-full border rounded px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">-- Select Category --</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="expDesc">Description</Label>
            <Input
              id="expDesc"
              placeholder="Expense description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-ocid="expenses.description.input"
            />
          </div>
          <div>
            <Label htmlFor="expAmount">Amount (₹)</Label>
            <Input
              id="expAmount"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-ocid="expenses.amount.input"
            />
          </div>
          <div>
            <Label htmlFor="expDate">Date</Label>
            <Input
              id="expDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button
            className="w-full bg-teal-700 hover:bg-teal-800 text-white"
            onClick={save}
            disabled={saving}
            data-ocid="expenses.submit_button"
          >
            {saving ? "Saving..." : "Save Expense"}
          </Button>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <img src={LOGO} alt="" className="w-6 h-6 object-contain" />
              All Expenses
            </CardTitle>
            <div className="flex gap-2">
              {expenses.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAllPDF}
                  data-ocid="expenses.download.button"
                >
                  Download All PDF
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingList ? (
            <p className="p-4 text-gray-400" data-ocid="expenses.loading_state">
              Loading expenses...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-50">
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Category</th>
                    <th className="text-left p-3">Description</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp, idx) => (
                    <tr
                      key={String(exp.id)}
                      className="border-t hover:bg-gray-50"
                      data-ocid={`expenses.item.${idx + 1}`}
                    >
                      <td className="p-3">{exp.date}</td>
                      <td className="p-3">
                        <span className="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3">{exp.description}</td>
                      <td className="p-3 text-right font-medium">
                        ₹{Number(exp.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-teal-700 border-teal-300 hover:bg-teal-50 text-xs px-2"
                            onClick={() => setViewExpense(exp)}
                            data-ocid={`expenses.view.button.${idx + 1}`}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2"
                            onClick={() => downloadExpensePDF(exp)}
                            data-ocid={`expenses.download.button.${idx + 1}`}
                          >
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2"
                            onClick={() => printExpensePDF(exp)}
                            data-ocid={`expenses.print.button.${idx + 1}`}
                          >
                            Print
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-gray-400"
                        data-ocid="expenses.empty_state"
                      >
                        No expenses recorded yet. Add your first expense above.
                      </td>
                    </tr>
                  )}
                </tbody>
                {expenses.length > 0 && (
                  <tfoot>
                    <tr className="bg-teal-50 font-bold border-t-2">
                      <td colSpan={3} className="p-3">
                        Total
                      </td>
                      <td className="p-3 text-right">
                        ₹
                        {expenses
                          .reduce((s, e) => s + Number(e.amount), 0)
                          .toLocaleString("en-IN")}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Expense Modal */}
      <Dialog
        open={viewExpense !== null}
        onOpenChange={(o) => !o && setViewExpense(null)}
      >
        <DialogContent className="max-w-md" data-ocid="expenses.modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={LOGO} alt="" className="w-7 h-7 object-contain" />
              Expense Detail — 3rd Eye Homes
            </DialogTitle>
          </DialogHeader>
          {viewExpense && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-teal-50 space-y-2">
                <div className="text-center mb-3">
                  <p className="font-bold text-lg text-teal-900">
                    3rd Eye Homes
                  </p>
                  <p className="text-sm text-gray-500">
                    Society Maintenance Management System
                  </p>
                  <hr className="my-2" />
                  <p className="font-semibold text-teal-800">Expense Voucher</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="font-medium text-gray-600">Date:</span>
                  <span>{viewExpense.date}</span>
                  <span className="font-medium text-gray-600">Category:</span>
                  <span>{viewExpense.category}</span>
                  <span className="font-medium text-gray-600">
                    Description:
                  </span>
                  <span>{viewExpense.description}</span>
                  <span className="font-medium text-gray-600">Amount:</span>
                  <span className="font-bold text-teal-700">
                    ₹{Number(viewExpense.amount).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => downloadExpensePDF(viewExpense)}
                  className="bg-teal-700 hover:bg-teal-800 text-white"
                  data-ocid="expenses.modal.download.button"
                >
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => printExpensePDF(viewExpense)}
                  data-ocid="expenses.modal.print.button"
                >
                  Print
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setViewExpense(null)}
                  data-ocid="expenses.modal.close.button"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
