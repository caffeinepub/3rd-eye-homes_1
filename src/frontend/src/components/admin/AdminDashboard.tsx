import { useEffect, useState } from "react";
import { useBackend } from "../../hooks/useBackend";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function AdminDashboard() {
  const backend = useBackend();
  const [pendingFlats, setPendingFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!backend) return;
    backend
      .getPendingFlats()
      .then((f) => {
        setPendingFlats(f);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [backend]);

  const totalPending = pendingFlats.reduce(
    (s, f) => s + Number(f.pendingAmount),
    0,
  );
  const pendingCount = pendingFlats.filter(
    (f) => Number(f.pendingAmount) > 0,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              Total Pending Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              ₹{totalPending.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">
              Flats with Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Flats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {pendingFlats.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Flats Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2">Block</th>
                    <th className="text-left p-2">Flat No.</th>
                    <th className="text-left p-2">Owner</th>
                    <th className="text-right p-2">Pending (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingFlats
                    .filter((f) => Number(f.pendingAmount) > 0)
                    .slice(0, 10)
                    .map((f) => (
                      <tr key={String(f.id)} className="border-t">
                        <td className="p-2">{f.block}</td>
                        <td className="p-2">{f.flatNumber}</td>
                        <td className="p-2">{f.ownerName}</td>
                        <td className="p-2 text-right text-red-600">
                          ₹{Number(f.pendingAmount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  {pendingFlats.filter((f) => Number(f.pendingAmount) > 0)
                    .length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-400">
                        No pending amounts
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
