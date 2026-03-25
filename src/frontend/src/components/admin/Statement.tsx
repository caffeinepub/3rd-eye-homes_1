import { jsPDF } from "@/lib/jspdf-shim";
import { useEffect, useState } from "react";
import { useBackend } from "../../hooks/useBackend";
import {
  buildDocFooter,
  buildDocHeader,
  buildSignatureBlock,
  printDocument,
} from "../../lib/printUtils";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

const LOGO =
  "/assets/uploads/3rd_eye_logo-removebg-preview-removebg-preview-019d1f46-4f45-741e-b66d-a9115d608d7c-1.png";

interface StatRow {
  date: string;
  description: string;
  credit: number;
  debit: number;
  balance: number;
}

function buildPdf(
  statement: StatRow[],
  flatNumber: string,
  ownerName: string,
  block: string,
  address: string,
) {
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
    doc.text(address || "Admin Office, 3rd Eye Society", 105, 28, {
      align: "center",
    });
  };

  const addFooter = (page: number) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.line(10, pageH - 18, 200, pageH - 18);
    doc.text(
      `Flat: ${flatNumber} | Owner: ${ownerName} | Printed: ${new Date().toLocaleDateString("en-IN")}`,
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
  doc.text("Statement of Account", 105, 42, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Flat: ${flatNumber} (${block}) | Owner: ${ownerName}`, 20, 52);
  doc.line(10, 55, 200, 55);

  let y = 64;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Date", 15, y);
  doc.text("Particulars", 45, y);
  doc.text("Debit (Dr)", 120, y, { align: "right" });
  doc.text("Credit (Cr)", 150, y, { align: "right" });
  doc.text("Balance", 190, y, { align: "right" });
  doc.line(10, y + 2, 200, y + 2);
  doc.setFont("helvetica", "normal");
  y += 8;

  let page = 1;
  for (const r of statement) {
    if (y > pageH - 30) {
      addFooter(page);
      doc.addPage();
      page++;
      addHeader();
      y = 42;
    }
    doc.text(r.date, 15, y);
    doc.text(r.description.slice(0, 40), 45, y);
    doc.text(r.debit ? `${r.debit.toLocaleString("en-IN")}` : "—", 120, y, {
      align: "right",
    });
    doc.text(r.credit ? `${r.credit.toLocaleString("en-IN")}` : "—", 150, y, {
      align: "right",
    });
    doc.text(`${r.balance.toLocaleString("en-IN")}`, 190, y, {
      align: "right",
    });
    y += 7;
  }

  doc.line(10, y, 200, y);
  y += 6;
  const totalDebit = statement.reduce((s, r) => s + r.debit, 0);
  const totalCredit = statement.reduce((s, r) => s + r.credit, 0);
  const netBalance = statement.length
    ? statement[statement.length - 1].balance
    : 0;
  doc.setFont("helvetica", "bold");
  doc.text("TOTALS", 45, y);
  doc.text(totalDebit.toLocaleString("en-IN"), 120, y, { align: "right" });
  doc.text(totalCredit.toLocaleString("en-IN"), 150, y, { align: "right" });
  doc.text(netBalance.toLocaleString("en-IN"), 190, y, { align: "right" });

  addFooter(page);
  return doc;
}

export default function Statement() {
  const backend = useBackend();
  const [flats, setFlats] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [statement, setStatement] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [societyAddress, setSocietyAddress] = useState("");

  useEffect(() => {
    if (!backend) return;
    backend
      .getPendingFlats()
      .then(setFlats)
      .catch(() => {});
    backend
      .getSocietyProfile()
      .then((p) => {
        if (p) setSocietyAddress(p.address ?? "");
      })
      .catch(() => {});
  }, [backend]);

  const loadStatement = async () => {
    if (!selectedId || !backend) return;
    setLoading(true);
    try {
      const { credits, debits, openingBalance } =
        await backend.getFlatStatement(BigInt(selectedId));
      const ob = Number(openingBalance ?? 0);
      const rows: Omit<StatRow, "balance">[] = [];

      // Prepend opening balance row if non-zero
      if (ob > 0) {
        rows.push({
          date: "--",
          description: "Opening Balance",
          credit: 0,
          debit: ob,
        });
      }

      rows.push(
        ...credits.map((c: any) => ({
          date: c.date,
          description: `Payment (${c.paymentMode})`,
          credit: Number(c.amount),
          debit: 0,
        })),
        ...debits.map((d: any) => ({
          date: d.date,
          description: d.description,
          credit: 0,
          debit: Number(d.amount),
        })),
      );

      // Sort by date (opening balance stays first)
      const obRow = ob > 0 ? [rows[0]] : [];
      const rest = ob > 0 ? rows.slice(1) : rows;
      rest.sort((a, b) => a.date.localeCompare(b.date));
      const sorted = [...obRow, ...rest];

      let balance = 0;
      setStatement(
        sorted.map((r) => {
          balance += r.debit - r.credit;
          return { ...r, balance };
        }),
      );
    } catch {}
    setLoading(false);
  };

  const selectedFlat = flats.find((f) => String(f.id) === selectedId);

  const downloadPDF = () => {
    if (!selectedFlat) return;
    const doc = buildPdf(
      statement,
      selectedFlat.flatNumber,
      selectedFlat.ownerName,
      selectedFlat.block,
      societyAddress,
    );
    doc.save(`Statement_${selectedFlat.flatNumber}.pdf`);
  };

  const handlePrint = () => {
    if (!selectedFlat) return;
    const today = new Date().toLocaleDateString("en-IN");
    const totalDebit = statement.reduce((s, r) => s + r.debit, 0);
    const totalCredit = statement.reduce((s, r) => s + r.credit, 0);
    const finalBalance = statement[statement.length - 1]?.balance ?? 0;
    const rowsHtml = statement
      .map(
        (r, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f5f5f5"}">
        <td class="right" style="text-align:left">${r.date}</td>
        <td>${r.description}</td>
        <td class="right red">${r.debit ? `₹${r.debit.toLocaleString("en-IN")}` : "–"}</td>
        <td class="right green">${r.credit ? `₹${r.credit.toLocaleString("en-IN")}` : "–"}</td>
        <td class="right ${r.balance > 0 ? "red" : "green"}">₹${Math.abs(r.balance).toLocaleString("en-IN")} <span style="font-size:9px">${r.balance > 0 ? "Dr" : "Cr"}</span></td>
      </tr>`,
      )
      .join("");
    const html = `
      <div class="doc-wrap">
        ${buildDocHeader("3rd Eye Homes", "Society Maintenance Management System", societyAddress)}
        <div class="doc-title"><h2>Statement of Account</h2><p>Date: ${today}</p></div>
        <div class="doc-info">
          <span>Flat: ${selectedFlat.flatNumber} (${selectedFlat.block})</span>
          <span>Owner: ${selectedFlat.ownerName}</span>
        </div>
        <table>
          <thead><tr>
            <th>Date</th><th>Particulars</th>
            <th class="right">Debit (Dr)</th><th class="right">Credit (Cr)</th><th class="right">Balance</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot><tr>
            <td colspan="2">Totals</td>
            <td class="right red">₹${totalDebit.toLocaleString("en-IN")}</td>
            <td class="right green">₹${totalCredit.toLocaleString("en-IN")}</td>
            <td class="right ${finalBalance > 0 ? "red" : "green"}">₹${Math.abs(finalBalance).toLocaleString("en-IN")} ${finalBalance > 0 ? "Dr" : "Cr"}</td>
          </tr></tfoot>
        </table>
        ${buildSignatureBlock()}
        ${buildDocFooter(`Flat: ${selectedFlat.flatNumber} | Owner: ${selectedFlat.ownerName}`, "3rd Eye Homes — Statement of Account", 1)}
      </div>`;
    printDocument(`Statement of Account - ${selectedFlat.flatNumber}`, html);
  };

  const StatementTable = () => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-teal-700 text-white">
          <th className="text-left p-2 border border-teal-600">Date</th>
          <th className="text-left p-2 border border-teal-600">Particulars</th>
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
        {statement.map((r, i) => (
          <tr
            key={r.date + r.description + String(i)}
            className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${r.description === "Opening Balance" ? "bg-orange-50 font-medium" : ""}`}
          >
            <td className="p-2 border text-xs">{r.date}</td>
            <td className="p-2 border">{r.description}</td>
            <td className="p-2 border text-right text-red-600 font-medium">
              {r.debit ? `₹${r.debit.toLocaleString("en-IN")}` : "–"}
            </td>
            <td className="p-2 border text-right text-green-600 font-medium">
              {r.credit ? `₹${r.credit.toLocaleString("en-IN")}` : "–"}
            </td>
            <td
              className={`p-2 border text-right font-bold ${r.balance > 0 ? "text-red-600" : "text-green-600"}`}
            >
              ₹{Math.abs(r.balance).toLocaleString("en-IN")}
              <span className="text-xs ml-1">
                {r.balance > 0 ? "Dr" : "Cr"}
              </span>
            </td>
          </tr>
        ))}
        {statement.length > 0 && (
          <tr className="bg-teal-50 font-bold border-t-2 border-teal-400">
            <td colSpan={2} className="p-2 border">
              Totals
            </td>
            <td className="p-2 border text-right text-red-700">
              ₹
              {statement
                .reduce((s, r) => s + r.debit, 0)
                .toLocaleString("en-IN")}
            </td>
            <td className="p-2 border text-right text-green-700">
              ₹
              {statement
                .reduce((s, r) => s + r.credit, 0)
                .toLocaleString("en-IN")}
            </td>
            <td
              className={`p-2 border text-right ${(statement[statement.length - 1]?.balance ?? 0) > 0 ? "text-red-700" : "text-green-700"}`}
            >
              ₹
              {Math.abs(
                statement[statement.length - 1]?.balance ?? 0,
              ).toLocaleString("en-IN")}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="flatSelect" className="text-sm font-medium">
            Select Flat
          </label>
          <select
            id="flatSelect"
            className="w-full border rounded px-3 py-2 text-sm mt-1"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            data-ocid="statement.select"
          >
            <option value="">-- Select Flat --</option>
            {flats.map((f) => (
              <option key={String(f.id)} value={String(f.id)}>
                {f.block} - {f.flatNumber} ({f.ownerName})
              </option>
            ))}
          </select>
        </div>
        <Button
          className="bg-teal-700 hover:bg-teal-800 text-white"
          onClick={loadStatement}
          disabled={!selectedId || loading}
          data-ocid="statement.load.button"
        >
          {loading ? "Loading..." : "Load Statement"}
        </Button>
        {statement.length > 0 && (
          <>
            <Button
              variant="outline"
              className="border-teal-400 text-teal-700 hover:bg-teal-50"
              onClick={() => setPreviewOpen(true)}
              data-ocid="statement.view.button"
            >
              View
            </Button>
            <Button
              variant="outline"
              className="border-teal-400 text-teal-700 hover:bg-teal-50"
              onClick={downloadPDF}
              data-ocid="statement.download.button"
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              className="border-teal-400 text-teal-700 hover:bg-teal-50"
              onClick={handlePrint}
              data-ocid="statement.print.button"
            >
              Print (A4)
            </Button>
          </>
        )}
      </div>

      {statement.length > 0 && (
        <div>
          <Card>
            <CardHeader className="no-print">
              <CardTitle className="text-sm">
                {selectedFlat?.ownerName} — Flat {selectedFlat?.flatNumber} (
                {selectedFlat?.block})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <StatementTable />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {statement.length === 0 && selectedId && !loading && (
        <p className="text-gray-400 text-center py-8">
          No transactions found for this flat.
        </p>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="max-w-4xl max-h-[85vh] overflow-y-auto"
          data-ocid="statement.modal"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
              3rd Eye Homes — Statement of Account
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
              {societyAddress && (
                <p className="text-center text-xs text-gray-500">
                  {societyAddress}
                </p>
              )}
              <hr className="my-2" />
              <h4 className="font-semibold text-center">
                Statement of Account
              </h4>
              {selectedFlat && (
                <p className="text-sm text-center text-gray-600">
                  Flat: {selectedFlat.flatNumber} ({selectedFlat.block}) |
                  Owner: {selectedFlat.ownerName}
                </p>
              )}
            </div>
            <StatementTable />
            <div className="flex gap-2 justify-end">
              <Button
                className="bg-teal-700 hover:bg-teal-800 text-white"
                onClick={downloadPDF}
                data-ocid="statement.modal.download.button"
              >
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                data-ocid="statement.modal.print.button"
              >
                Print (A4)
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPreviewOpen(false)}
                data-ocid="statement.modal.close.button"
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
