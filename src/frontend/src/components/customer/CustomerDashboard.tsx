import { useEffect, useState } from "react";
import { useBackend } from "../../hooks/useBackend";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface Props {
  flatId: bigint;
  ownerName: string;
  flatNumber: string;
  block: string;
}

export default function CustomerDashboard({
  flatId,
  ownerName,
  flatNumber,
  block,
}: Props) {
  const backend = useBackend();
  const [pendingAmount, setPendingAmount] = useState<bigint>(BigInt(0));
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!backend) return;
    Promise.all([
      backend.getPendingAmount(flatId),
      backend.getFlatStatement(flatId),
    ])
      .then(([pending, stmt]) => {
        setPendingAmount(pending);
        const paid = stmt.credits.reduce(
          (s: number, c: any) => s + Number(c.amount),
          0,
        );
        setTotalPaid(paid);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [backend, flatId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              Flat Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-bold text-lg">
              {block} - {flatNumber}
            </p>
            <p className="text-gray-500 text-sm">{ownerName}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {loading ? "..." : `₹${totalPaid.toLocaleString()}`}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {loading ? "..." : `₹${Number(pendingAmount).toLocaleString()}`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
