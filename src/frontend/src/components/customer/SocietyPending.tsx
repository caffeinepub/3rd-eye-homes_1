import { useEffect, useState } from "react";
import { useBackend } from "../../hooks/useBackend";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";

export default function SocietyPending() {
  const backend = useBackend();
  const [flats, setFlats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!backend) return;
    backend
      .getPendingFlats()
      .then((f) => {
        setFlats(f);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [backend]);

  const filtered = flats
    .filter((f) => Number(f.pendingAmount) > 0)
    .filter(
      (f) =>
        f.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        f.flatNumber.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="space-y-4">
      <Input
        className="max-w-xs"
        placeholder="Search flat or owner..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-gray-400">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3">Block</th>
                    <th className="text-left p-3">Flat No.</th>
                    <th className="text-left p-3">Owner</th>
                    <th className="text-right p-3">Pending (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={String(f.id)} className="border-t">
                      <td className="p-3">{f.block}</td>
                      <td className="p-3">{f.flatNumber}</td>
                      <td className="p-3">{f.ownerName}</td>
                      <td className="p-3 text-right text-red-600">
                        ₹{Number(f.pendingAmount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-400">
                        No pending flats
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
