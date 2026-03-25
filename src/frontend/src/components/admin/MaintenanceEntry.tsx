import { jsPDF } from "@/lib/jspdf-shim";
import { useEffect, useState } from "react";
import { useBackend } from "../../hooks/useBackend";
import FlatSearchSelect from "../ui/FlatSearchSelect";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

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

export default function MaintenanceEntry() {
  const backend = useBackend();
  const [flats, setFlats] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [success, setSuccess] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (backend)
      backend
        .getPendingFlats()
        .then(setFlats)
        .catch(() => {});
  }, [backend]);

  const selectedFlat = flats.find((f) => String(f.id) === selectedId);

  const submit = async () => {
    if (!backend || !selectedFlat || !amount) return;
    setSaving(true);
    try {
      const receiptId = `RCP${Date.now()}`;
      await backend.addPayment({
        id: BigInt(0),
        flatId: selectedFlat.id,
        amount: BigInt(Number(amount)),
        paymentMode,
        date,
        receiptId,
      });
      setSuccess({ receiptId, flat: selectedFlat, amount, paymentMode, date });
      setAmount("");
      setSelectedId("");
    } catch {
      alert("Failed to save payment.");
    }
    setSaving(false);
  };

  const printReceipt = () => {
    if (!success) return;
    const doc = new jsPDF();
    addLogoToPdf(doc);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Maintenance Receipt", 105, 38, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.line(20, 42, 190, 42);
    doc.setFontSize(11);
    doc.text(`Receipt No: ${success.receiptId}`, 20, 55);
    doc.text(`Date: ${success.date}`, 20, 65);
    doc.text(
      `Flat No: ${success.flat.flatNumber} (${success.flat.block})`,
      20,
      75,
    );
    doc.text(`Owner: ${success.flat.ownerName}`, 20, 85);
    doc.text(`Amount: Rs. ${Number(success.amount).toLocaleString()}`, 20, 95);
    doc.text(`Payment Mode: ${success.paymentMode}`, 20, 105);
    doc.line(20, 115, 190, 115);
    doc.setFontSize(12);
    doc.text("Thank you for your payment!", 105, 130, { align: "center" });
    doc.save(`Receipt_${success.receiptId}.pdf`);
  };

  return (
    <div className="space-y-4 max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src={LOGO} alt="" className="w-6 h-6 object-contain" />
            Add Maintenance Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FlatSearchSelect
            flats={flats}
            selectedId={selectedId}
            onSelect={(_, id) => setSelectedId(id)}
            label="Select Flat"
            dataOcid="maintenance.select"
          />

          {selectedFlat && (
            <div className="bg-blue-50 rounded p-3 text-sm">
              <p>
                <strong>Owner:</strong> {selectedFlat.ownerName}
              </p>
              <p>
                <strong>Mobile:</strong> {selectedFlat.ownerMobile}
              </p>
              <p>
                <strong>Monthly Amt:</strong> ₹
                {Number(selectedFlat.maintenanceAmount).toLocaleString()}
              </p>
              <p>
                <strong>Pending:</strong> ₹
                {Number(selectedFlat.pendingAmount).toLocaleString()}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              data-ocid="maintenance.amount.input"
            />
          </div>
          <div>
            <Label htmlFor="payMode">Payment Mode</Label>
            <select
              id="payMode"
              className="w-full border rounded px-3 py-2 text-sm"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option>Cash</option>
              <option>Online</option>
            </select>
          </div>
          <div>
            <Label htmlFor="entryDate">Date</Label>
            <Input
              id="entryDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={submit}
            disabled={saving || !selectedFlat}
            data-ocid="maintenance.submit_button"
          >
            {saving ? "Saving..." : "Save Payment"}
          </Button>
        </CardContent>
      </Card>

      {success && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <img src={LOGO} alt="" className="w-6 h-6 object-contain" />
              Payment Saved!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              Receipt No: <strong>{success.receiptId}</strong>
            </p>
            <p className="text-sm">
              Flat: <strong>{success.flat.flatNumber}</strong> | Amount:{" "}
              <strong>₹{Number(success.amount).toLocaleString()}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                onClick={printReceipt}
                variant="outline"
                data-ocid="maintenance.download.button"
              >
                Download Receipt PDF
              </Button>
              <Button
                variant="outline"
                data-ocid="maintenance.whatsapp.button"
                onClick={() => {
                  const msg = `Receipt No: ${success.receiptId}%0AFlat: ${success.flat.flatNumber}%0AAmount: Rs.${success.amount}%0ADate: ${success.date}%0APayment Mode: ${success.paymentMode}`;
                  window.open(
                    `https://wa.me/${success.flat.ownerMobile}?text=${msg}`,
                  );
                }}
              >
                Share on WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
