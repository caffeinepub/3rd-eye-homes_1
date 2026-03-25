import * as XLSX from "@/lib/xlsx-shim";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useBackend } from "../../hooks/useBackend";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface FlatOwner {
  id: bigint;
  block: string;
  flatNumber: string;
  ownerName: string;
  maintenanceAmount: bigint;
  flatStatus: string;
  ownerMobile: string;
  password: string;
  openingBalance: bigint;
  pendingAmount?: bigint;
}

interface ConflictRow {
  rowIndex: number;
  existing: FlatOwner;
  incoming: {
    block: string;
    flatNumber: string;
    ownerName: string;
    flatStatus: string;
    ownerMobile: string;
    password: string;
    maintenanceAmount: bigint;
    openingBalance: bigint;
  };
  decision: "agree" | "disagree" | null;
}

const EMPTY_FORM = {
  block: "",
  flatNumber: "",
  ownerName: "",
  maintenanceAmount: "",
  flatStatus: "Owner",
  ownerMobile: "",
  password: "",
  openingBalance: "0",
};

// Helper to read a key case-insensitively or with spaces from an Excel row
function col(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "")
      return String(row[k]);
  }
  // fallback: case-insensitive search
  const lowerKeys = keys.map((k) => k.toLowerCase().replace(/\s/g, ""));
  for (const [rk, rv] of Object.entries(row)) {
    if (lowerKeys.includes(rk.toLowerCase().replace(/\s/g, "")))
      return String(rv ?? "");
  }
  return "";
}

export default function FlatOwners() {
  const backend = useBackend();
  const [flats, setFlats] = useState<FlatOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<FlatOwner | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<Record<string, unknown>[]>([]);
  const [bulkFile, setBulkFile] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<FlatOwner | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Conflict resolution state
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [nonConflictRows, setNonConflictRows] = useState<
    {
      block: string;
      flatNumber: string;
      ownerName: string;
      flatStatus: string;
      ownerMobile: string;
      password: string;
      maintenanceAmount: bigint;
      openingBalance: bigint;
    }[]
  >([]);

  const load = useCallback(async () => {
    if (!backend) return;
    try {
      const data = await backend.getPendingFlats();
      setFlats(data as unknown as FlatOwner[]);
    } catch {
      toast.error("Failed to load flat owners.");
    }
    setLoading(false);
  }, [backend]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setOpen(true);
  };

  const deleteFlat = async () => {
    if (!backend || !deleteTarget) return;
    setDeleting(true);
    try {
      await backend.deleteFlatOwner(deleteTarget.id);
      toast.success(
        `Flat ${deleteTarget.block} - ${deleteTarget.flatNumber} deleted.`,
      );
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Failed to delete flat owner.");
    }
    setDeleting(false);
  };

  const openEdit = (f: FlatOwner) => {
    setEditing(f);
    setForm({
      block: f.block,
      flatNumber: f.flatNumber,
      ownerName: f.ownerName,
      maintenanceAmount: String(f.maintenanceAmount),
      flatStatus: f.flatStatus,
      ownerMobile: f.ownerMobile,
      password: f.password,
      openingBalance: String(f.openingBalance ?? 0),
    });
    setFormError("");
    setOpen(true);
  };

  const save = async () => {
    if (!backend) {
      toast.error("Not connected to backend.");
      return;
    }
    if (!form.block.trim()) {
      setFormError("Block is required.");
      return;
    }
    if (!form.flatNumber.trim()) {
      setFormError("Flat Number is required.");
      return;
    }
    if (!form.ownerName.trim()) {
      setFormError("Owner Name is required.");
      return;
    }
    if (!form.ownerMobile.trim()) {
      setFormError("Mobile Number is required.");
      return;
    }
    if (!form.maintenanceAmount.trim() || Number(form.maintenanceAmount) <= 0) {
      setFormError("Maintenance Amount must be greater than 0.");
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      const owner = {
        block: form.block.trim(),
        flatNumber: form.flatNumber.trim(),
        ownerName: form.ownerName.trim(),
        flatStatus: form.flatStatus,
        ownerMobile: form.ownerMobile.trim(),
        password: form.password.trim(),
        maintenanceAmount: BigInt(Number(form.maintenanceAmount) || 0),
        openingBalance: BigInt(Number(form.openingBalance) || 0),
      };
      if (editing) {
        await backend.updateFlatOwner({ ...owner, id: editing.id });
        toast.success("Flat owner updated successfully!");
      } else {
        // biome-ignore lint: ignore local type conflict
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (backend.addFlatOwner as (f: any) => Promise<bigint>)({
          ...owner,
          id: BigInt(0),
        });
        toast.success("Flat owner added successfully!");
      }
      setOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      console.error("Save flat owner error:", err);
      toast.error(
        editing ? "Failed to update flat owner." : "Failed to add flat owner.",
      );
    }
    setSaving(false);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      flats.map((f) => ({
        Block: f.block,
        FlatNo: f.flatNumber,
        Owner: f.ownerName,
        Mobile: f.ownerMobile,
        Status: f.flatStatus,
        Maintenance: Number(f.maintenanceAmount),
        OpeningBalance: Number(f.openingBalance ?? 0),
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FlatOwners");
    XLSX.writeFile(wb, "flat_owners.xlsx");
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        Block: "A",
        FlatNo: "101",
        OwnerName: "John Doe",
        Mobile: "9876543210",
        Status: "Owner",
        Maintenance: 1500,
        OpeningBalance: 0,
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "bulk_upload_template.xlsx");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // biome-ignore lint: xlsx shim
        // eslint-disable-next-line
        const rows = (
          XLSX.utils.sheet_to_json as (
            ws: unknown,
            opts?: unknown,
          ) => Record<string, unknown>[]
        )(ws, {
          defval: "",
        });
        setBulkPreview(rows);
      } catch {
        toast.error("Could not read file. Please use the template.");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Called when user clicks "Upload All" — check for conflicts first
  const handleBulkUploadClick = () => {
    if (!backend || bulkPreview.length === 0) return;

    const conflictList: ConflictRow[] = [];
    const newRows: typeof nonConflictRows = [];

    for (let i = 0; i < bulkPreview.length; i++) {
      const row = bulkPreview[i];
      const mobile = col(row, "Mobile", "mobile", "MobileNumber", "Phone");
      const block = col(row, "Block", "block");
      const flatNo = col(row, "FlatNo", "FlatNumber", "Flat No", "flat_number");
      const ownerName = col(
        row,
        "OwnerName",
        "Owner",
        "Owner Name",
        "owner_name",
      );
      const status = col(row, "Status", "status") || "Owner";
      const maintenance = Number(
        col(row, "Maintenance", "MaintenanceAmount", "Maintenance Amount") || 0,
      );
      const opening = Number(
        col(row, "OpeningBalance", "Opening Balance", "openingbalance") || 0,
      );

      if (!block || !flatNo || !ownerName || !mobile) continue;

      const existing = flats.find(
        (f) =>
          f.block.trim().toLowerCase() === block.trim().toLowerCase() &&
          f.flatNumber.trim().toLowerCase() === flatNo.trim().toLowerCase(),
      );

      const parsed = {
        block,
        flatNumber: flatNo,
        ownerName,
        flatStatus: status,
        ownerMobile: mobile,
        password: mobile.slice(-6),
        maintenanceAmount: BigInt(maintenance),
        openingBalance: BigInt(opening),
      };

      if (existing) {
        conflictList.push({
          rowIndex: i,
          existing,
          incoming: parsed,
          decision: null,
        });
      } else {
        newRows.push(parsed);
      }
    }

    if (conflictList.length > 0) {
      setConflicts(conflictList);
      setNonConflictRows(newRows);
      setConflictOpen(true);
    } else {
      // No conflicts — upload directly
      executeUploadWithDecisions(newRows, []);
    }
  };

  const setConflictDecision = (
    rowIndex: number,
    decision: "agree" | "disagree",
  ) => {
    setConflicts((prev) =>
      prev.map((c) => (c.rowIndex === rowIndex ? { ...c, decision } : c)),
    );
  };

  const allDecisionsMade = conflicts.every((c) => c.decision !== null);

  const confirmConflicts = () => {
    if (!allDecisionsMade) {
      toast.error("Please select Agree or Disagree for each duplicate entry.");
      return;
    }
    setConflictOpen(false);
    executeUploadWithDecisions(
      nonConflictRows,
      conflicts.filter((c) => c.decision === "agree"),
    );
  };

  const executeUploadWithDecisions = async (
    newRows: typeof nonConflictRows,
    agreedConflicts: ConflictRow[],
  ) => {
    if (!backend) return;
    setBulkUploading(true);
    let success = 0;
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    // Add new (non-conflicting) rows
    for (const row of newRows) {
      try {
        // biome-ignore lint: ignore local type conflict
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (backend.addFlatOwner as (f: any) => Promise<bigint>)({
          id: BigInt(0),
          ...row,
        });
        success++;
      } catch {
        failed++;
      }
    }

    // Update agreed conflict rows — preserve existing opening balance
    for (const conflict of agreedConflicts) {
      try {
        await backend.updateFlatOwner({
          id: conflict.existing.id,
          block: conflict.incoming.block,
          flatNumber: conflict.incoming.flatNumber,
          ownerName: conflict.incoming.ownerName,
          flatStatus: conflict.incoming.flatStatus,
          ownerMobile: conflict.incoming.ownerMobile,
          password: conflict.incoming.password,
          maintenanceAmount: conflict.incoming.maintenanceAmount,
          // Opening balance preserved from existing record
          openingBalance: conflict.existing.openingBalance,
        });
        updated++;
      } catch {
        failed++;
      }
    }

    // Count disagreed
    const disagreedCount = conflicts.filter(
      (c) => c.decision === "disagree",
    ).length;
    skipped = disagreedCount;

    setBulkUploading(false);
    setBulkOpen(false);
    setBulkPreview([]);
    setBulkFile("");
    setConflicts([]);
    setNonConflictRows([]);
    await load();

    const parts: string[] = [];
    if (success > 0) parts.push(`${success} new flat owner(s) added`);
    if (updated > 0)
      parts.push(
        `${updated} existing flat owner(s) updated (opening balance preserved)`,
      );
    if (skipped > 0) parts.push(`${skipped} duplicate(s) skipped (Disagree)`);
    if (failed > 0) parts.push(`${failed} row(s) failed`);
    if (parts.length > 0) toast.success(parts.join(" · "));
  };

  const filtered = flats.filter(
    (f) =>
      f.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      f.flatNumber.toLowerCase().includes(search.toLowerCase()) ||
      f.block.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <Input
          className="max-w-xs"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-ocid="flatowners.search_input"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportExcel}
            data-ocid="flatowners.export.button"
          >
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setBulkPreview([]);
              setBulkFile("");
              setBulkOpen(true);
            }}
            data-ocid="flatowners.bulk.button"
          >
            Bulk Upload
          </Button>
          <Button onClick={openAdd} data-ocid="flatowners.add.primary_button">
            + Add Flat Owner
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p
              className="p-4 text-gray-400"
              data-ocid="flatowners.loading_state"
            >
              Loading...
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3">Block</th>
                    <th className="text-left p-3">Flat No.</th>
                    <th className="text-left p-3">Owner Name</th>
                    <th className="text-left p-3">Mobile</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Maintenance</th>
                    <th className="text-right p-3">Opening Balance</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f, idx) => (
                    <tr
                      key={String(f.id)}
                      className="border-t hover:bg-gray-50"
                      data-ocid={`flatowners.item.${idx + 1}`}
                    >
                      <td className="p-3">{f.block}</td>
                      <td className="p-3">{f.flatNumber}</td>
                      <td className="p-3">{f.ownerName}</td>
                      <td className="p-3">{f.ownerMobile}</td>
                      <td className="p-3">{f.flatStatus}</td>
                      <td className="p-3 text-right">
                        ₹{Number(f.maintenanceAmount).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-medium text-orange-700">
                        ₹{Number(f.openingBalance ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(f)}
                            data-ocid={`flatowners.edit_button.${idx + 1}`}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget(f)}
                            data-ocid={`flatowners.delete_button.${idx + 1}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-4 text-center text-gray-400"
                        data-ocid="flatowners.empty_state"
                      >
                        No flat owners found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="flatowners.delete_dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-red-700">
              Delete Flat Owner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
              <p className="font-medium">
                Are you sure you want to delete this flat owner?
              </p>
              {deleteTarget && (
                <p className="mt-2">
                  <span className="font-semibold">Block:</span>{" "}
                  {deleteTarget.block} &nbsp;|&nbsp;
                  <span className="font-semibold">Flat:</span>{" "}
                  {deleteTarget.flatNumber} &nbsp;|&nbsp;
                  <span className="font-semibold">Owner:</span>{" "}
                  {deleteTarget.ownerName}
                </p>
              )}
              <p className="mt-2 text-xs text-red-600">
                This will remove all records for this flat. You can re-add the
                flat manually after deletion.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={deleteFlat}
                disabled={deleting}
                data-ocid="flatowners.confirm_delete_button"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setFormError("");
        }}
      >
        <DialogContent data-ocid="flatowners.dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Add"} Flat Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(
              [
                ["block", "Block"],
                ["flatNumber", "Flat Number"],
                ["ownerName", "Owner Name"],
                ["ownerMobile", "Mobile Number"],
                ["maintenanceAmount", "Maintenance Amount (₹)"],
              ] as [keyof typeof form, string][]
            ).map(([field, label]) => (
              <div key={field}>
                <Label htmlFor={field}>{label}</Label>
                <Input
                  id={field}
                  value={form[field]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field]: e.target.value }))
                  }
                  data-ocid={`flatowners.${field}.input`}
                />
              </div>
            ))}
            <div>
              <Label htmlFor="openingBalance">Opening Balance (₹)</Label>
              <Input
                id="openingBalance"
                type="number"
                min="0"
                value={form.openingBalance}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    openingBalance: e.target.value,
                  }))
                }
                placeholder="0"
                data-ocid="flatowners.openingBalance.input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Any outstanding amount owed before this system was started.
              </p>
            </div>
            <div>
              <Label htmlFor="flatStatus">Status</Label>
              <select
                id="flatStatus"
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.flatStatus}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, flatStatus: e.target.value }))
                }
              >
                <option>Owner</option>
                <option>Tenant</option>
                <option>Vacant</option>
              </select>
            </div>
            <div>
              <Label htmlFor="password">
                Password (default: last 6 digits of mobile)
              </Label>
              <Input
                id="password"
                placeholder="Leave blank for default"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </div>
            {formError && (
              <p
                className="text-red-500 text-sm"
                data-ocid="flatowners.form.error_state"
              >
                {formError}
              </p>
            )}
            <Button
              className="w-full"
              onClick={save}
              disabled={saving}
              data-ocid="flatowners.submit_button"
            >
              {saving ? "Saving..." : editing ? "Update" : "Add Flat Owner"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl" data-ocid="flatowners.bulk_dialog">
          <DialogHeader>
            <DialogTitle>Bulk Upload Flat Owners</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded p-3 text-sm text-teal-800">
              <p className="font-medium mb-1">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Download the template Excel file below.</li>
                <li>
                  Fill in your flat owners (one per row). Required: Block,
                  FlatNo, OwnerName, Mobile.
                </li>
                <li>Upload the filled file and click "Upload All".</li>
                <li className="font-medium text-teal-900">
                  If any Block &amp; Flat number already exists, you will be
                  asked to Agree or Disagree before uploading.
                </li>
              </ol>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              Download Template
            </Button>
            <div>
              <Label>Select Excel / CSV File</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
                <span className="text-sm text-gray-500">
                  {bulkFile || "No file selected"}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
            {bulkPreview.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  {bulkPreview.length} row(s) ready to upload:
                </p>
                <div className="overflow-x-auto max-h-48 border rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {Object.keys(bulkPreview[0]).map((k) => (
                          <th key={k} className="text-left p-2 border-b">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.slice(0, 20).map((row) => (
                        <tr key={JSON.stringify(row)} className="border-t">
                          {Object.values(row).map((v) => (
                            <td
                              key={`${JSON.stringify(row)}-${String(v)}`}
                              className="p-2"
                            >
                              {String(v)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {bulkPreview.length > 20 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Showing first 20 of {bulkPreview.length} rows.
                  </p>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleBulkUploadClick}
                disabled={bulkUploading || bulkPreview.length === 0}
              >
                {bulkUploading
                  ? "Uploading..."
                  : `Upload All (${bulkPreview.length} rows)`}
              </Button>
              <Button variant="outline" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={conflictOpen} onOpenChange={setConflictOpen}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          data-ocid="flatowners.conflict_dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-orange-700">
              ⚠️ Duplicate Entries Found — Review Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded p-3 text-sm text-orange-800">
              <p className="font-medium">
                The following Block &amp; Flat numbers already exist in the
                system.
              </p>
              <p className="mt-1">
                For each entry, choose:
                <span className="font-semibold text-green-700"> Agree</span> —
                update with new data (opening balance will remain unchanged), or
                <span className="font-semibold text-red-700"> Disagree</span> —
                keep the existing record as-is.
              </p>
            </div>

            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.rowIndex}
                  className={`border rounded-lg p-4 ${
                    conflict.decision === "agree"
                      ? "border-green-300 bg-green-50"
                      : conflict.decision === "disagree"
                        ? "border-red-200 bg-red-50"
                        : "border-orange-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-semibold text-gray-800">
                        Block: {conflict.existing.block} | Flat:{" "}
                        {conflict.existing.flatNumber}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          conflict.decision === "agree" ? "default" : "outline"
                        }
                        className={
                          conflict.decision === "agree"
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "border-green-500 text-green-700 hover:bg-green-50"
                        }
                        onClick={() =>
                          setConflictDecision(conflict.rowIndex, "agree")
                        }
                      >
                        ✓ Agree
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          conflict.decision === "disagree"
                            ? "default"
                            : "outline"
                        }
                        className={
                          conflict.decision === "disagree"
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "border-red-400 text-red-600 hover:bg-red-50"
                        }
                        onClick={() =>
                          setConflictDecision(conflict.rowIndex, "disagree")
                        }
                      >
                        ✗ Disagree
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-100 rounded p-3">
                      <p className="font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                        Current (Existing)
                      </p>
                      <div className="space-y-0.5 text-gray-700">
                        <p>
                          <span className="font-medium">Name:</span>{" "}
                          {conflict.existing.ownerName}
                        </p>
                        <p>
                          <span className="font-medium">Mobile:</span>{" "}
                          {conflict.existing.ownerMobile}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {conflict.existing.flatStatus}
                        </p>
                        <p>
                          <span className="font-medium">Maintenance:</span> ₹
                          {Number(
                            conflict.existing.maintenanceAmount,
                          ).toLocaleString()}
                        </p>
                        <p className="text-orange-700 font-semibold">
                          <span className="font-medium">Opening Bal:</span> ₹
                          {Number(
                            conflict.existing.openingBalance,
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded p-3 border border-blue-200">
                      <p className="font-semibold text-blue-600 mb-1 uppercase tracking-wide">
                        New (From Upload)
                      </p>
                      <div className="space-y-0.5 text-gray-700">
                        <p>
                          <span className="font-medium">Name:</span>{" "}
                          {conflict.incoming.ownerName}
                        </p>
                        <p>
                          <span className="font-medium">Mobile:</span>{" "}
                          {conflict.incoming.ownerMobile}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {conflict.incoming.flatStatus}
                        </p>
                        <p>
                          <span className="font-medium">Maintenance:</span> ₹
                          {Number(
                            conflict.incoming.maintenanceAmount,
                          ).toLocaleString()}
                        </p>
                        <p className="text-orange-500 text-xs italic">
                          <span className="font-medium">Opening Bal:</span> Will
                          remain ₹
                          {Number(
                            conflict.existing.openingBalance,
                          ).toLocaleString()}{" "}
                          (unchanged)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-gray-500">
                {conflicts.filter((c) => c.decision !== null).length} of{" "}
                {conflicts.length} reviewed
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConflictOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmConflicts}
                  disabled={!allDecisionsMade}
                  className={
                    allDecisionsMade
                      ? "bg-teal-600 hover:bg-teal-700 text-white"
                      : ""
                  }
                >
                  Confirm &amp; Proceed ({conflicts.length} duplicates)
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
