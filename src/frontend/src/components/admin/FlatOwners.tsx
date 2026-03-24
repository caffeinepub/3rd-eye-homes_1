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

  const executeBulkUpload = async () => {
    if (!backend || bulkPreview.length === 0) return;
    setBulkUploading(true);
    let success = 0;
    let failed = 0;
    for (const row of bulkPreview) {
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

      if (!block || !flatNo || !ownerName || !mobile) {
        failed++;
        continue;
      }

      try {
        // biome-ignore lint: ignore local type conflict
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (backend.addFlatOwner as (f: any) => Promise<bigint>)({
          id: BigInt(0),
          block,
          flatNumber: flatNo,
          ownerName,
          flatStatus: status,
          ownerMobile: mobile,
          password: mobile.slice(-6),
          maintenanceAmount: BigInt(maintenance),
          openingBalance: BigInt(opening),
        });
        success++;
      } catch {
        failed++;
      }
    }
    setBulkUploading(false);
    setBulkOpen(false);
    setBulkPreview([]);
    setBulkFile("");
    await load();
    if (success > 0)
      toast.success(`${success} flat owner(s) added successfully!`);
    if (failed > 0)
      toast.error(
        `${failed} row(s) skipped (missing required fields or error).`,
      );
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(f)}
                          data-ocid={`flatowners.edit_button.${idx + 1}`}
                        >
                          Edit
                        </Button>
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
                onClick={executeBulkUpload}
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
    </div>
  );
}
