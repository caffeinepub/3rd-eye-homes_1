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

const LOGO =
  "/assets/uploads/3rd_eye_logo-removebg-preview-removebg-preview-019d1f46-4f45-741e-b66d-a9115d608d7c-1.png";

function addLogoToPdf(doc: jsPDF) {
  doc.rect(10, 5, 190, 25);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("3rd Eye Home", 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Society Maintenance Management", 105, 22, { align: "center" });
}

interface Props {
  flatId: bigint;
  ownerName: string;
  flatNumber: string;
}

export default function PendingStatement({
  flatId,
  ownerName,
  flatNumber,
}: Props) {
  const backend = useBackend();
  const [pending, setPending] = useState<bigint>(BigInt(0));
  const [debits, setDebits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!backend) return;
    Promise.all([
      backend.getPendingAmount(flatId),
      backend.getFlatStatement(flatId),
    ])
      .then(([p, stmt]) => {
        setPending(p);
        const totalCredit = stmt.credits.reduce(
          (s: number, c: any) => s + Number(c.amount),
          0,
        );
        let remaining = totalCredit;
        const pendingDebits = stmt.debits.filter((d: any) => {
          if (remaining >= Number(d.amount)) {
            remaining -= Number(d.amount);
            return false;
          }
          return true;
        });
        setDebits(pendingDebits);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [backend, flatId]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    addLogoToPdf(doc);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Pending Statement", 105, 38, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Owner: ${ownerName} | Flat No: ${flatNumber}`, 20, 48);
    doc.text(
      `Total Outstanding: Rs.${Number(pending).toLocaleString()}`,
      20,
      56,
    );
    doc.line(20, 60, 190, 60);
    let y = 68;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Date", 20, y);
    doc.text("Description", 70, y);
    doc.text("Amount", 160, y);
    doc.setFont("helvetica", "normal");
    y += 8;
    for (const d of debits) {
      doc.text(d.date, 20, y);
      doc.text(d.description.slice(0, 45), 70, y);
      doc.text(`Rs.${Number(d.amount).toLocaleString()}`, 160, y);
      y += 8;
      if (y > 270) {
        doc.addPage();
        addLogoToPdf(doc);
        y = 40;
      }
    }
    doc.line(20, y, 190, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL PENDING: Rs.${Number(pending).toLocaleString()}`, 70, y);
    doc.save(`PendingStatement_${flatNumber}.pdf`);
  };

  const handlePrint = () => {
    const today = new Date().toLocaleDateString("en-IN");
    const pendingNum = Number(pending);
    const rowsHtml = debits
      .map(
        (d: any, i: number) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f5f5f5"}">
        <td>${d.date ?? ""}</td>
        <td>${d.description ?? d.month ?? ""}</td>
        <td class="right red">₹${Number(d.amount ?? d.debit ?? 0).toLocaleString("en-IN")}</td>
      </tr>`,
      )
      .join("");
    const html = `
      <div class="doc-wrap">
        ${buildDocHeader("3rd Eye Homes", "Society Maintenance Management System", "")}
        <div class="doc-title"><h2>Pending Statement</h2><p>Date: ${today}</p></div>
        <div class="doc-info">
          <span>Flat: ${flatNumber}</span><span>Owner: ${ownerName}</span>
          <span>Outstanding: ₹${pendingNum.toLocaleString("en-IN")}</span>
        </div>
        <table>
          <thead><tr>
            <th>Date</th><th>Description</th><th class="right">Amount (₹)</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot><tr>
            <td colspan="2">Total Outstanding</td>
            <td class="right red">₹${pendingNum.toLocaleString("en-IN")}</td>
          </tr></tfoot>
        </table>
        ${buildSignatureBlock()}
        ${buildDocFooter(`Flat: ${flatNumber} | Owner: ${ownerName}`, "3rd Eye Homes \u2014 Pending Statement", 1)}
      </div>`;
    printDocument(`Pending Statement - ${flatNumber}`, html);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={downloadPDF}
          data-ocid="pendingstatement.download.button"
        >
          Download PDF
        </Button>
        <Button
          variant="outline"
          onClick={handlePrint}
          data-ocid="pendingstatement.print.button"
        >
          Print
        </Button>
      </div>

      <Card className="border-red-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
            <img src={LOGO} alt="" className="w-5 h-5 object-contain" />
            Total Outstanding &mdash; {ownerName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-red-600">
            {loading ? "..." : `₹${Number(pending).toLocaleString()}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pending Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Description</th>
                  <th className="text-right p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {debits.map((d: any, i: number) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: list is stable
                  <tr key={i} className="border-t">
                    <td className="p-3">{d.date}</td>
                    <td className="p-3">{d.description}</td>
                    <td className="p-3 text-right text-red-600">
                      ₹{Number(d.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {debits.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-4 text-center text-green-600"
                      data-ocid="pendingstatement.empty_state"
                    >
                      No pending dues!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
