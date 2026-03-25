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

interface Props {
  flatId: bigint;
  ownerName: string;
  flatNumber: string;
}

export default function PaymentStatement({
  flatId,
  ownerName,
  flatNumber,
}: Props) {
  const backend = useBackend();
  const [rows, setRows] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [societyAddress, setSocietyAddress] = useState("");

  useEffect(() => {
    if (!backend) return;
    backend
      .getSocietyProfile()
      .then((p) => {
        if (p) setSocietyAddress(p.address ?? "");
      })
      .catch(() => {});

    backend
      .getFlatStatement(flatId)
      .then(({ credits, debits, openingBalance }) => {
        const ob = Number(openingBalance ?? 0);
        const all: Omit<StatRow, "balance">[] = [];

        if (ob > 0) {
          all.push({
            date: "--",
            description: "Opening Balance",
            credit: 0,
            debit: ob,
          });
        }

        const rest = [
          ...credits.map((c: any) => ({
            date: c.date,
            description: `Payment - ${c.paymentMode}`,
            credit: Number(c.amount),
            debit: 0,
          })),
          ...debits.map((d: any) => ({
            date: d.date,
            description: d.description,
            credit: 0,
            debit: Number(d.amount),
          })),
        ].sort((a, b) => a.date.localeCompare(b.date));

        all.push(...rest);

        let balance = 0;
        setRows(
          all.map((r) => {
            balance += r.debit - r.credit;
            return { ...r, balance };
          }),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [backend, flatId]);

  const buildPdf = () => {
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
      doc.text(societyAddress || "Admin Office, 3rd Eye Society", 105, 28, {
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
      doc.text("3rd Eye Homes — Payment Statement", 105, pageH - 6, {
        align: "center",
      });
    };

    addHeader();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Statement", 105, 42, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Owner: ${ownerName} | Flat No: ${flatNumber}`, 20, 52);
    doc.line(10, 55, 200, 55);

    let y = 64;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Date", 15, y);
    doc.text("Particulars", 45, y);
    doc.text("Debit (Dr)", 120, y, { align: "right" });
    doc.text("Credit (Cr)", 150, y, { align: "right" });
    doc.text("Balance", 190, y, { align: "right" });
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
        y = 42;
      }
      doc.text(r.date, 15, y);
      doc.text(r.description.slice(0, 40), 45, y);
      doc.text(r.debit ? r.debit.toLocaleString("en-IN") : "—", 120, y, {
        align: "right",
      });
      doc.text(r.credit ? r.credit.toLocaleString("en-IN") : "—", 150, y, {
        align: "right",
      });
      doc.text(r.balance.toLocaleString("en-IN"), 190, y, { align: "right" });
      y += 7;
    }

    doc.line(10, y, 200, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("TOTALS", 45, y);
    doc.text(
      rows.reduce((s, r) => s + r.debit, 0).toLocaleString("en-IN"),
      120,
      y,
      { align: "right" },
    );
    doc.text(
      rows.reduce((s, r) => s + r.credit, 0).toLocaleString("en-IN"),
      150,
      y,
      { align: "right" },
    );
    addFooter(page);
    return doc;
  };

  const downloadPDF = () =>
    buildPdf().save(`PaymentStatement_${flatNumber}.pdf`);
  const handlePrint = () => {
    const today = new Date().toLocaleDateString("en-IN");
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    const finalBalance = rows[rows.length - 1]?.balance ?? 0;
    const rowsHtml = rows
      .map(
        (r, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f5f5f5"}">
        <td>${r.date}</td>
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
        <div class="doc-title"><h2>Payment Statement</h2><p>Date: ${today}</p></div>
        <div class="doc-info">
          <span>Flat: ${flatNumber}</span><span>Owner: ${ownerName}</span>
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
        ${buildDocFooter(`Flat: ${flatNumber} | Owner: ${ownerName}`, "3rd Eye Homes — Payment Statement", 1)}
      </div>`;
    printDocument(`Payment Statement - ${flatNumber}`, html);
  };

  const TallyTable = () => (
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
        {rows.map((r, i) => (
          <tr
            key={r.date + r.description + String(i)}
            className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} ${
              r.description === "Opening Balance"
                ? "bg-orange-50 font-medium"
                : ""
            }`}
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
        {rows.length > 0 && (
          <tr className="bg-teal-50 font-bold border-t-2 border-teal-400">
            <td colSpan={2} className="p-2 border">
              Totals
            </td>
            <td className="p-2 border text-right text-red-700">
              ₹{rows.reduce((s, r) => s + r.debit, 0).toLocaleString("en-IN")}
            </td>
            <td className="p-2 border text-right text-green-700">
              ₹{rows.reduce((s, r) => s + r.credit, 0).toLocaleString("en-IN")}
            </td>
            <td
              className={`p-2 border text-right ${(rows[rows.length - 1]?.balance ?? 0) > 0 ? "text-red-700" : "text-green-700"}`}
            >
              ₹
              {Math.abs(rows[rows.length - 1]?.balance ?? 0).toLocaleString(
                "en-IN",
              )}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          className="border-teal-400 text-teal-700 hover:bg-teal-50"
          onClick={() => setPreviewOpen(true)}
          data-ocid="paymentstatement.view.button"
        >
          View
        </Button>
        <Button
          variant="outline"
          className="border-teal-400 text-teal-700 hover:bg-teal-50"
          onClick={downloadPDF}
          data-ocid="paymentstatement.download.button"
        >
          Download PDF
        </Button>
        <Button
          variant="outline"
          className="border-teal-400 text-teal-700 hover:bg-teal-50"
          onClick={handlePrint}
          data-ocid="paymentstatement.print.button"
        >
          Print (A4)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <img src={LOGO} alt="" className="w-5 h-5 object-contain" />
            Payment Statement &mdash; {ownerName} ({flatNumber})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p
              className="p-4 text-gray-400"
              data-ocid="paymentstatement.loading_state"
            >
              Loading...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <TallyTable />
            </div>
          )}
          {!loading && rows.length === 0 && (
            <p
              className="p-4 text-center text-gray-400"
              data-ocid="paymentstatement.empty_state"
            >
              No transactions yet
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="max-w-4xl max-h-[85vh] overflow-y-auto"
          data-ocid="paymentstatement.modal"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
              3rd Eye Homes &mdash; Payment Statement
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
              <h4 className="font-semibold text-center">Payment Statement</h4>
              <p className="text-sm text-center text-gray-600">
                Owner: {ownerName} | Flat No: {flatNumber}
              </p>
            </div>
            <TallyTable />
            <div className="flex gap-2 justify-end">
              <Button
                className="bg-teal-700 hover:bg-teal-800 text-white"
                onClick={downloadPDF}
                data-ocid="paymentstatement.modal.download.button"
              >
                Download PDF
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                data-ocid="paymentstatement.modal.print.button"
              >
                Print (A4)
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPreviewOpen(false)}
                data-ocid="paymentstatement.modal.close.button"
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
