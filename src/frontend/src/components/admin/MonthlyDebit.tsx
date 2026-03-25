import { useEffect, useState } from "react";
import { useBackend } from "../../hooks/useBackend";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getYearRange() {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current - 3; y <= current + 3; y++) years.push(y);
  return years;
}

type DebitResult = { added: bigint; skipped: bigint } | null;

export default function MonthlyDebit() {
  const backend = useBackend();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebitResult>(null);

  const years = getYearRange();
  const description = `${MONTHS[month]} ${year} Maintenance`;
  const date = `${year}-${String(month + 1).padStart(2, "0")}-01`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset result when month/year changes
  useEffect(() => {
    setResult(null);
  }, [month, year]);

  const generate = async () => {
    if (!backend) {
      alert("Not connected to backend.");
      return;
    }
    setLoading(true);
    try {
      const res = await backend.generateMonthlyDebit(description, date);
      setResult(res);
    } catch {
      alert("Failed to generate monthly debit entries.");
    }
    setLoading(false);
  };

  const added = result ? Number(result.added) : 0;
  const skipped = result ? Number(result.skipped) : 0;

  return (
    <div className="max-w-md space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate Monthly Maintenance Debit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Select the month and year, then generate debit entries for all
            active flats. Flats already charged for the selected month will be
            skipped automatically.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="month">Month</Label>
              <select
                id="month"
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="year">Year</Label>
              <select
                id="year"
                className="w-full border rounded px-3 py-2 text-sm mt-1"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 border rounded px-3 py-2 text-sm">
            <span className="text-gray-500">Description: </span>
            <span className="font-medium">{description}</span>
          </div>

          {result !== null && (
            <div
              className={`border rounded p-3 text-sm ${
                added > 0
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-yellow-50 border-yellow-200 text-yellow-700"
              }`}
            >
              {added > 0 && (
                <p>
                  <strong>{added}</strong> flat{added !== 1 ? "s" : ""} charged
                  for <strong>{description}</strong>.
                </p>
              )}
              {skipped > 0 && (
                <p className="mt-1">
                  <strong>{skipped}</strong> flat{skipped !== 1 ? "s" : ""}{" "}
                  already had this month's debit and{" "}
                  {skipped !== 1 ? "were" : "was"} skipped.
                </p>
              )}
              {added === 0 && skipped > 0 && (
                <p className="mt-1 font-medium">
                  All flats are already charged for {description}. No duplicate
                  entries created.
                </p>
              )}
            </div>
          )}

          <Button className="w-full" onClick={generate} disabled={loading}>
            {loading ? "Generating..." : "Generate Monthly Debit"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
