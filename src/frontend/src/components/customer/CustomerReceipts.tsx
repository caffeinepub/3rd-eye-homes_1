import { jsPDF } from "@/lib/jspdf-shim";
import { useEffect, useState } from "react";
import { useBackend } from "../../hooks/useBackend";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

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

export default function CustomerReceipts({
  flatId,
  ownerName,
  flatNumber,
}: Props) {
  const backend = useBackend();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewReceipt, setViewReceipt] = useState<any | null>(null);

  useEffect(() => {
    if (!backend) return;
    backend
      .getFlatStatement(flatId)
      .then(({ credits }) => {
        setReceipts(
          [...credits].sort((a: any, b: any) => b.date.localeCompare(a.date)),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [backend, flatId]);

  const downloadReceipt = (r: any) => {
    const doc = new jsPDF();
    addLogoToPdf(doc);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Maintenance Receipt", 105, 38, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.line(20, 42, 190, 42);
    doc.setFontSize(11);
    doc.text(`Receipt No: ${r.receiptId}`, 20, 55);
    doc.text(`Date: ${r.date}`, 20, 65);
    doc.text(`Flat No: ${flatNumber}`, 20, 75);
    doc.text(`Owner: ${ownerName}`, 20, 85);
    doc.text(`Amount: Rs. ${Number(r.amount).toLocaleString()}`, 20, 95);
    doc.text(`Payment Mode: ${r.paymentMode}`, 20, 105);
    doc.line(20, 115, 190, 115);
    doc.setFontSize(12);
    doc.text("Thank you for your payment!", 105, 130, { align: "center" });
    doc.save(`Receipt_${r.receiptId}.pdf`);
  };

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-gray-400" data-ocid="receipts.loading_state">
              Loading...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3">Receipt No.</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Mode</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r: any, idx: number) => (
                    <tr
                      key={String(r.id)}
                      className="border-t"
                      data-ocid={`receipts.item.${idx + 1}`}
                    >
                      <td className="p-3">{r.receiptId}</td>
                      <td className="p-3">{r.date}</td>
                      <td className="p-3">{r.paymentMode}</td>
                      <td className="p-3 text-right">
                        ₹{Number(r.amount).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewReceipt(r)}
                            data-ocid={`receipts.view.button.${idx + 1}`}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadReceipt(r)}
                            data-ocid={`receipts.download.button.${idx + 1}`}
                          >
                            PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {receipts.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-4 text-center text-gray-400"
                        data-ocid="receipts.empty_state"
                      >
                        No receipts yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Preview Modal */}
      <Dialog
        open={!!viewReceipt}
        onOpenChange={(v) => !v && setViewReceipt(null)}
      >
        <DialogContent data-ocid="receipts.dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img
                src={LOGO}
                alt="3rd Eye Home"
                className="w-8 h-8 object-contain"
              />
              Receipt Preview
            </DialogTitle>
          </DialogHeader>
          {viewReceipt && (
            <div className="space-y-4">
              <div className="border rounded p-4 bg-gray-50">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={LOGO}
                    alt="3rd Eye Home"
                    className="w-10 h-10 object-contain"
                  />
                  <div>
                    <h3 className="font-bold text-lg">3rd Eye Home</h3>
                    <p className="text-sm text-gray-500">
                      Society Maintenance Management
                    </p>
                  </div>
                </div>
                <hr className="mb-3" />
                <h4 className="font-semibold text-center mb-3">
                  Maintenance Receipt
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Receipt No.</div>
                  <div className="font-medium">{viewReceipt.receiptId}</div>
                  <div className="text-gray-500">Date</div>
                  <div className="font-medium">{viewReceipt.date}</div>
                  <div className="text-gray-500">Flat No.</div>
                  <div className="font-medium">{flatNumber}</div>
                  <div className="text-gray-500">Owner</div>
                  <div className="font-medium">{ownerName}</div>
                  <div className="text-gray-500">Amount</div>
                  <div className="font-bold text-green-600 text-base">
                    ₹{Number(viewReceipt.amount).toLocaleString()}
                  </div>
                  <div className="text-gray-500">Payment Mode</div>
                  <div className="font-medium">{viewReceipt.paymentMode}</div>
                </div>
                <hr className="mt-3 mb-2" />
                <p className="text-center text-sm text-gray-600">
                  Thank you for your payment!
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => downloadReceipt(viewReceipt)}
                  data-ocid="receipts.modal.download.button"
                >
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewReceipt(null)}
                  data-ocid="receipts.modal.close.button"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
