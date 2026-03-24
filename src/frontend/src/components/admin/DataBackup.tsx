import { useRef, useState } from "react";
import { toast } from "sonner";
import { useBackend } from "../../hooks/useBackend";
import { loadAllExpenses, updateMaxExpenseId } from "../../lib/expenseUtils";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const LOGO =
  "/assets/uploads/3rd_eye_logo-removebg-preview-removebg-preview-019d1f46-4f45-741e-b66d-a9115d608d7c-1.png";

interface BackupData {
  version: number;
  exportedAt: string;
  societyProfile: unknown;
  flatOwners: unknown[];
  flatStatements: {
    flatId: string;
    flatNumber: string;
    block: string;
    ownerName: string;
    credits: unknown[];
    debits: unknown[];
    openingBalance: string;
  }[];
  expenses: unknown[];
}

export default function DataBackup() {
  const backend = useBackend();
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset finances state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleDownload = async () => {
    if (!backend) return;
    setDownloading(true);
    setRestoreStatus([]);
    try {
      toast.info("Collecting data for backup...");

      const [profile, flats, allExpenses] = await Promise.all([
        backend.getSocietyProfile().catch(() => null),
        backend.getPendingFlats().catch(() => []),
        loadAllExpenses(() => backend.getAllExpenses()).catch(() => []),
      ]);

      const flatStatements = await Promise.all(
        flats.map(async (f) => {
          const st = await backend.getFlatStatement(f.id).catch(() => ({
            credits: [],
            debits: [],
            openingBalance: BigInt(0),
          }));
          return {
            flatId: String(f.id),
            flatNumber: f.flatNumber,
            block: f.block,
            ownerName: f.ownerName,
            credits: (
              st.credits as Array<{
                id: bigint;
                flatId: bigint;
                date: string;
                paymentMode: string;
                receiptId: string;
                amount: bigint;
              }>
            ).map((c) => ({
              id: String(c.id),
              flatId: String(c.flatId),
              date: c.date,
              paymentMode: c.paymentMode,
              receiptId: c.receiptId,
              amount: String(c.amount),
            })),
            debits: (
              st.debits as Array<{
                id: bigint;
                flatId: bigint;
                date: string;
                description: string;
                amount: bigint;
              }>
            ).map((d) => ({
              id: String(d.id),
              flatId: String(d.flatId),
              date: d.date,
              description: d.description,
              amount: String(d.amount),
            })),
            openingBalance: String(st.openingBalance),
          };
        }),
      );

      const backup: BackupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        societyProfile: profile,
        flatOwners: flats.map((f) => ({
          id: String(f.id),
          ownerName: f.ownerName,
          flatNumber: f.flatNumber,
          block: f.block,
          ownerMobile: f.ownerMobile,
          maintenanceAmount: String(f.maintenanceAmount),
          openingBalance: String(f.openingBalance),
          flatStatus: f.flatStatus,
          password: f.password,
        })),
        flatStatements,
        expenses: allExpenses.map((e) => ({
          id: String(e.id),
          date: e.date,
          category: e.category,
          description: e.description,
          amount: String(e.amount),
        })),
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `3rdEyeHomes_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        `Backup downloaded! ${flats.length} flat owners, ${allExpenses.length} expenses.`,
      );
    } catch (err) {
      toast.error("Backup failed. Please try again.");
      console.error(err);
    }
    setDownloading(false);
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !backend) return;

    setRestoring(true);
    setRestoreStatus([]);
    const log = (msg: string) => setRestoreStatus((prev) => [...prev, msg]);

    try {
      const text = await file.text();
      const backup: BackupData = JSON.parse(text);

      if (!backup.version || !backup.flatOwners) {
        toast.error("Invalid backup file format.");
        setRestoring(false);
        return;
      }

      log(`Backup from: ${backup.exportedAt}`);
      log(
        `Found ${backup.flatOwners.length} flat owners, ${backup.expenses.length} expenses`,
      );

      if (backup.societyProfile) {
        await backend
          .updateSocietyProfile(
            backup.societyProfile as Parameters<
              typeof backend.updateSocietyProfile
            >[0],
          )
          .catch(() => {});
        log("Society profile restored.");
      }

      let ownerCount = 0;
      const flatIdMap: Record<string, bigint> = {};
      for (const rawOwner of backup.flatOwners as Array<{
        id: string;
        ownerName: string;
        flatNumber: string;
        block: string;
        ownerMobile: string;
        maintenanceAmount: string;
        openingBalance: string;
        flatStatus: string;
        password: string;
      }>) {
        try {
          const newId = await backend.addFlatOwner({
            id: BigInt(0),
            ownerName: rawOwner.ownerName,
            flatNumber: rawOwner.flatNumber,
            block: rawOwner.block,
            ownerMobile: rawOwner.ownerMobile,
            maintenanceAmount: BigInt(rawOwner.maintenanceAmount || "0"),
            openingBalance: BigInt(rawOwner.openingBalance || "0"),
            flatStatus: rawOwner.flatStatus || "Active",
            password: rawOwner.password || rawOwner.ownerMobile.slice(-6),
          });
          flatIdMap[rawOwner.id] = newId;
          ownerCount++;
        } catch {
          log(`  Skipped owner ${rawOwner.ownerName} (may already exist)`);
        }
      }
      log(`Restored ${ownerCount} flat owners.`);

      let paymentCount = 0;
      let debitCount = 0;
      for (const st of backup.flatStatements as Array<{
        flatId: string;
        credits: Array<{
          flatId: string;
          date: string;
          paymentMode: string;
          receiptId: string;
          amount: string;
        }>;
        debits: Array<{
          flatId: string;
          date: string;
          description: string;
          amount: string;
        }>;
      }>) {
        const newFlatId = flatIdMap[st.flatId];
        if (!newFlatId) continue;

        for (const c of st.credits) {
          try {
            await backend.addPayment({
              id: BigInt(0),
              flatId: newFlatId,
              date: c.date,
              paymentMode: c.paymentMode,
              receiptId: c.receiptId,
              amount: BigInt(c.amount),
            });
            paymentCount++;
          } catch {
            /* skip */
          }
        }

        for (const d of st.debits) {
          try {
            await backend.addDebitEntry({
              id: BigInt(0),
              flatId: newFlatId,
              date: d.date,
              description: d.description,
              amount: BigInt(d.amount),
            });
            debitCount++;
          } catch {
            /* skip */
          }
        }
      }
      log(`Restored ${paymentCount} payments, ${debitCount} debit entries.`);

      let expCount = 0;
      for (const rawExp of backup.expenses as Array<{
        date: string;
        category: string;
        description: string;
        amount: string;
      }>) {
        try {
          const newExpId = await backend.addExpense({
            id: BigInt(0),
            date: rawExp.date,
            category: rawExp.category,
            description: rawExp.description,
            amount: BigInt(rawExp.amount),
          });
          updateMaxExpenseId(newExpId);
          expCount++;
        } catch {
          /* skip */
        }
      }
      log(`Restored ${expCount} expenses.`);

      log("Restore complete!");
      toast.success("Data restored successfully!");
    } catch (err) {
      toast.error("Restore failed. Check the backup file format.");
      log(`Error: ${String(err)}`);
    }
    setRestoring(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReset = async () => {
    if (!backend || confirmText !== "RESET") return;
    setResetting(true);
    try {
      await backend.resetFinancialData();
      toast.success(
        "All financial data has been reset. Flat owners and admin profile are intact.",
      );
      setShowResetConfirm(false);
      setConfirmText("");
    } catch (err) {
      toast.error("Reset failed. Please try again.");
      console.error(err);
    }
    setResetting(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Download Backup */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src={LOGO} alt="" className="w-6 h-6 object-contain" />
            Download Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Download a complete backup of all your data — flat owners,
            maintenance records, payments, debit entries, expenses, and society
            profile — as a JSON file. Keep this file safe for future use.
          </p>
          <div className="bg-teal-50 border border-teal-200 rounded p-3 text-sm text-teal-800">
            <strong>What is included:</strong>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>Society profile and settings</li>
              <li>All flat owners with opening balances</li>
              <li>All maintenance payments received</li>
              <li>All monthly debit entries</li>
              <li>All expense records</li>
            </ul>
          </div>
          <Button
            className="w-full bg-teal-700 hover:bg-teal-800 text-white"
            onClick={handleDownload}
            disabled={downloading}
            data-ocid="backup.download.button"
          >
            {downloading ? "Preparing backup..." : "Download Backup (JSON)"}
          </Button>
        </CardContent>
      </Card>

      {/* Restore Backup */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <img src={LOGO} alt="" className="w-6 h-6 object-contain" />
            Restore from Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Upload a previously downloaded backup file to restore all data. This
            will add all records from the backup to the system.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded p-3 text-sm text-orange-800">
            <strong>Important:</strong> Restoring a backup adds data on top of
            existing records. For a clean restore, it is best to use a fresh app
            instance. Duplicate records may appear if you restore into an app
            that already has data.
          </div>
          <div>
            <label
              htmlFor="restore-file-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select backup file (.json)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreFile}
              disabled={restoring}
              className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
              id="restore-file-input"
              data-ocid="backup.restore.input"
            />
          </div>
          {restoring && (
            <p className="text-sm text-teal-700 font-medium animate-pulse">
              Restoring data, please wait...
            </p>
          )}
          {restoreStatus.length > 0 && (
            <div className="bg-gray-50 border rounded p-3 text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
              {restoreStatus.map((line, i) => (
                <div
                  key={`${i}-${line.slice(0, 20)}`}
                  className={
                    line.startsWith("Error")
                      ? "text-red-600"
                      : line === "Restore complete!"
                        ? "text-green-700 font-bold"
                        : "text-gray-700"
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Financial Data */}
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <span className="text-lg">⚠️</span>
            Reset Financial Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Use this before handing the app over to members for live use. This
            will permanently erase all financial records and start fresh.
          </p>
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
            <strong>What will be deleted:</strong>
            <ul className="mt-1 ml-4 list-disc space-y-1">
              <li>All maintenance payments received</li>
              <li>All monthly debit entries</li>
              <li>All expense records</li>
              <li>All opening balances (reset to zero)</li>
            </ul>
            <div className="mt-2 font-semibold">
              What will NOT be deleted: Admin profile, flat owner details,
              society settings.
            </div>
          </div>

          {!showResetConfirm ? (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowResetConfirm(true)}
              data-ocid="reset.finance.open.button"
            >
              Reset All Financial Data
            </Button>
          ) : (
            <div className="space-y-3 border border-red-300 rounded-lg p-4 bg-red-50">
              <p className="text-sm font-semibold text-red-800">
                Are you absolutely sure? This cannot be undone.
              </p>
              <p className="text-xs text-red-700">
                Type <strong>RESET</strong> below to confirm.
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type RESET to confirm"
                className="w-full border border-red-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                data-ocid="reset.confirm.input"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleReset}
                  disabled={confirmText !== "RESET" || resetting}
                  data-ocid="reset.finance.confirm.button"
                >
                  {resetting ? "Resetting..." : "Confirm Reset"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowResetConfirm(false);
                    setConfirmText("");
                  }}
                  disabled={resetting}
                  data-ocid="reset.finance.cancel.button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
