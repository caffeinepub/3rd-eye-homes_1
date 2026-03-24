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

export default function MonthlyDebit() {
  const backend = useBackend();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const years = getYearRange();
  const description = `${MONTHS[month]} ${year} Maintenance`;
  const date = `${year}-${String(month + 1).padStart(2, "0")}-01`;

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset done when month/year changes
  useEffect(() => {
    setDone(false);
  }, [month, year]);

  const generate = async () => {
    if (!backend) {
      alert("Not connected to backend.");
      return;
    }
    setLoading(true);
    try {
      await backend.generateMonthlyDebit(description, date);
      setDone(true);
    } catch {
      alert("Failed to generate monthly debit entries.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Generate Monthly Maintenance Debit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Select the month and year, then generate debit entries for all
            active flats.
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

          {done && (
            <div className="bg-green-50 border border-green-200 rounded p-3 text-green-700 text-sm">
              Monthly debit entries for <strong>{description}</strong> generated
              successfully!
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
