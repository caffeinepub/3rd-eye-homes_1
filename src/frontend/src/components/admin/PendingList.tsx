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
import { Card, CardContent } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";

const LOGO =
  "/assets/uploads/3rd_eye_logo-removebg-preview-removebg-preview-019d1f46-4f45-741e-b66d-a9115d608d7c-1.png";

function buildPendingPdf(flats: any[], total: number, address: string) {
  const doc = new jsPDF();
  const pageH = doc.internal.pageSize.height;
  const pageW = doc.internal.pageSize.width;

  const addHeader = () => {
    doc.rect(10, 5, 190, 32);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("3rd Eye Homes", 105, 16, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Society Maintenance Management System", 105, 23, {
      align: "center",
    });
    doc.text(address || "Admin Office, 3rd Eye Society", 105, 30, {
      align: "center",
    });
  };

  const addFooter = (page: number, totalPages: number) => {
    const footerY = pageH - 30;
    doc.line(10, footerY, pageW - 10, footerY);

    // Authorized Signature block
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.line(pageW - 70, footerY + 12, pageW - 10, footerY + 12);
    doc.text("Authorized Signature", pageW - 40, footerY + 17, {
      align: "center",
    });
    doc.setFont("helvetica", "bold");
    doc.text("3rd Eye Home", pageW - 40, footerY + 23, { align: "center" });

    // Left footer info
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Printed: ${new Date().toLocaleDateString("en-IN")}`,
      12,
      footerY + 8,
    );
    doc.text(`Page ${page} of ${totalPages}`, 12, footerY + 14);
    doc.setFont("helvetica", "italic");
    doc.text(
      "3rd Eye Homes — Society Maintenance Management",
      105,
      footerY + 22,
      { align: "center" },
    );
  };

  // --- Page 1 ---
  addHeader();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Pending Maintenance Statement", 105, 46, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 105, 53, {
    align: "center",
  });
  doc.line(10, 57, pageW - 10, 57);

  let y = 65;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  // Column headers
  doc.text("#", 13, y);
  doc.text("Block", 22, y);
  doc.text("Flat No.", 45, y);
  doc.text("Owner Name", 72, y);
  doc.text("Mobile", 130, y);
  doc.text("Pending Amt (₹)", 190, y, { align: "right" });
  doc.line(10, y + 2, pageW - 10, y + 2);
  doc.setFont("helvetica", "normal");
  y += 8;

  // Estimate pages for footer
  const rowsPerPage1 = Math.floor((pageH - 30 - 65 - 18) / 7);
  const rowsPerPageN = Math.floor((pageH - 30 - 42 - 10) / 7);
  let totalPages = 1;
  if (flats.length > rowsPerPage1) {
    totalPages += Math.ceil((flats.length - rowsPerPage1) / rowsPerPageN);
  }

  let page = 1;
  for (let i = 0; i < flats.length; i++) {
    const f = flats[i];
    if (y > pageH - 35) {
      addFooter(page, totalPages);
      doc.addPage();
      page++;
      addHeader();
      y = 42;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("#", 13, y);
      doc.text("Block", 22, y);
      doc.text("Flat No.", 45, y);
      doc.text("Owner Name", 72, y);
      doc.text("Mobile", 130, y);
      doc.text("Pending Amt (₹)", 190, y, { align: "right" });
      doc.line(10, y + 2, pageW - 10, y + 2);
      doc.setFont("helvetica", "normal");
      y += 8;
    }
    doc.text(String(i + 1), 13, y);
    doc.text(f.block || "", 22, y);
    doc.text(f.flatNumber || "", 45, y);
    doc.text((f.ownerName || "").slice(0, 28), 72, y);
    doc.text(f.ownerMobile || "", 130, y);
    doc.text(Number(f.pendingAmount).toLocaleString("en-IN"), 190, y, {
      align: "right",
    });
    y += 7;
  }

  // Totals row
  doc.line(10, y, pageW - 10, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Total Pending Amount:", 130, y, { align: "right" });
  doc.text(`₹${total.toLocaleString("en-IN")}`, 190, y, { align: "right" });

  addFooter(page, totalPages);
  return doc;
}

export default function PendingList() {
  const backend = useBackend();
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [societyAddress, setSocietyAddress] = useState("");

  useEffect(() => {
    if (!backend) return;
    backend
      .getPendingFlats()
      .then((f) => {
        setFlats(f);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    backend
      .getSocietyProfile()
      .then((p) => {
        if (p) setSocietyAddress(p.address ?? "");
      })
      .catch(() => {});
  }, [backend]);

  const filtered = flats
    .filter((f) => Number(f.pendingAmount) > 0)
    .filter(
      (f) =>
        f.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        f.flatNumber.toLowerCase().includes(search.toLowerCase()) ||
        f.block.toLowerCase().includes(search.toLowerCase()),
    );

  const total = filtered.reduce((s, f) => s + Number(f.pendingAmount), 0);

  const downloadPDF = () => {
    const doc = buildPendingPdf(filtered, total, societyAddress);
    doc.save(
      `Pending_Maintenance_Statement_${new Date().toISOString().slice(0, 10)}.pdf`,
    );
  };

  const handlePrint = () => {
    const today = new Date().toLocaleDateString("en-IN");
    const rowsHtml = filtered
      .map(
        (f, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f5f5f5"}">
        <td>${i + 1}</td>
        <td>${f.block}</td>
        <td>${f.flatNumber}</td>
        <td>${f.ownerName}</td>
        <td>${f.mobile ?? ""}</td>
        <td class="right red">₹${Number(f.pendingAmount).toLocaleString("en-IN")}</td>
      </tr>`,
      )
      .join("");
    const html = `
      <div class="doc-wrap">
        ${buildDocHeader("3rd Eye Homes", "Society Maintenance Management System", societyAddress)}
        <div class="doc-title"><h2>Pending Maintenance Statement</h2><p>Generated: ${today}</p></div>
        <table>
          <thead><tr>
            <th>#</th><th>Block</th><th>Flat No.</th><th>Owner Name</th><th>Mobile</th>
            <th class="right">Pending (₹)</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot><tr>
            <td colspan="5">Total Pending</td>
            <td class="right red">₹${total.toLocaleString("en-IN")}</td>
          </tr></tfoot>
        </table>
        ${buildSignatureBlock()}
        ${buildDocFooter(`Generated: ${today}`, "3rd Eye Homes — Pending Maintenance Statement", 1)}
      </div>`;
    printDocument("Pending Maintenance Statement", html);
  };

  const PendingTable = () => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-teal-700 text-white">
          <th className="text-left p-2 border border-teal-600">#</th>
          <th className="text-left p-2 border border-teal-600">Block</th>
          <th className="text-left p-2 border border-teal-600">Flat No.</th>
          <th className="text-left p-2 border border-teal-600">Owner Name</th>
          <th className="text-left p-2 border border-teal-600">Mobile</th>
          <th className="text-right p-2 border border-teal-600">Pending (₹)</th>
        </tr>
      </thead>
      <tbody>
        {filtered.map((f, i) => (
          <tr
            key={String(f.id)}
            className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
          >
            <td className="p-2 border">{i + 1}</td>
            <td className="p-2 border">{f.block}</td>
            <td className="p-2 border">{f.flatNumber}</td>
            <td className="p-2 border">{f.ownerName}</td>
            <td className="p-2 border">{f.ownerMobile}</td>
            <td className="p-2 border text-right text-red-600 font-semibold">
              ₹{Number(f.pendingAmount).toLocaleString("en-IN")}
            </td>
          </tr>
        ))}
        {filtered.length === 0 && (
          <tr>
            <td colSpan={6} className="p-4 text-center text-gray-400">
              No pending flats
            </td>
          </tr>
        )}
        {filtered.length > 0 && (
          <tr className="bg-teal-50 font-bold border-t-2 border-teal-500">
            <td colSpan={5} className="p-2 border text-right">
              Total Pending:
            </td>
            <td className="p-2 border text-right text-red-700">
              ₹{total.toLocaleString("en-IN")}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          className="max-w-xs"
          placeholder="Search by flat, block, owner..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex-1" />
        {filtered.length > 0 && (
          <>
            <Button
              variant="outline"
              className="border-teal-400 text-teal-700 hover:bg-teal-50"
              onClick={() => setPreviewOpen(true)}
            >
              View Statement
            </Button>
            <Button
              variant="outline"
              className="border-teal-400 text-teal-700 hover:bg-teal-50"
              onClick={downloadPDF}
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              className="border-teal-400 text-teal-700 hover:bg-teal-50"
              onClick={handlePrint}
            >
              Print (A4)
            </Button>
          </>
        )}
      </div>

      {/* Screen table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-gray-400">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <PendingTable />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={LOGO} alt="" className="w-8 h-8 object-contain" />
              3rd Eye Homes — Pending Maintenance Statement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Header block */}
            <div className="border-2 border-teal-700 rounded-lg p-4 bg-teal-50">
              <div className="flex items-center gap-4">
                <img
                  src={LOGO}
                  alt="3rd Eye Home"
                  className="w-14 h-14 object-contain"
                />
                <div className="flex-1 text-center">
                  <h2 className="text-xl font-bold text-teal-900">
                    3rd Eye Homes
                  </h2>
                  <p className="text-sm text-gray-600">
                    Society Maintenance Management System
                  </p>
                  {societyAddress && (
                    <p className="text-xs text-gray-500">{societyAddress}</p>
                  )}
                </div>
              </div>
              <hr className="my-3 border-teal-300" />
              <h3 className="text-center font-bold text-teal-800 text-lg">
                Pending Maintenance Statement
              </h3>
              <p className="text-center text-xs text-gray-500">
                Generated on: {new Date().toLocaleDateString("en-IN")}
              </p>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <PendingTable />
            </div>

            {/* Authorized Signature */}
            <div className="flex justify-end mt-6">
              <div className="text-center">
                <div className="border-t-2 border-gray-700 w-52 mb-1 mt-8" />
                <p className="text-sm font-semibold text-gray-700">
                  Authorized Signature
                </p>
                <p className="text-sm font-bold text-teal-800">3rd Eye Home</p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-2 text-xs text-gray-400 text-center">
              3rd Eye Homes — Society Maintenance Management |{" "}
              {new Date().toLocaleDateString("en-IN")}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                className="bg-teal-700 hover:bg-teal-800 text-white"
                onClick={downloadPDF}
              >
                Download PDF
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                Print (A4)
              </Button>
              <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
