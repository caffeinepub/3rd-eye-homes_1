import { useEffect, useState } from "react";
import { useBackend } from "../../hooks/useBackend";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

export default function AdminProfile() {
  const backend = useBackend();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [voucherCategories, setVoucherCategories] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!backend) return;
    backend
      .getSocietyProfile()
      .then((p) => {
        if (p) {
          setName(p.name);
          setAddress(p.address ?? "");
          setLicenseNumber(p.licenseNumber);
          setVoucherCategories(p.voucherCategories.join(", "));
        }
      })
      .catch(() => {});
  }, [backend]);

  const save = async () => {
    if (!backend) return;
    try {
      await backend.updateSocietyProfile({
        name,
        address,
        licenseNumber,
        voucherCategories: voucherCategories
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("Failed to save.");
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Society Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sname">Society Name</Label>
            <Input
              id="sname"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="saddress">Location Address</Label>
            <Textarea
              id="saddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter full society address (street, city, state, pincode)"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="lic">License Number</Label>
            <Input
              id="lic"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="vcat">Voucher Categories (comma separated)</Label>
            <Input
              id="vcat"
              value={voucherCategories}
              onChange={(e) => setVoucherCategories(e.target.value)}
              placeholder="Maintenance, Repairs, Cleaning"
            />
          </div>
          {saved && (
            <div className="bg-green-50 border border-green-200 rounded p-2 text-green-700 text-sm">
              Saved successfully!
            </div>
          )}
          <Button className="w-full" onClick={save}>
            Save Profile
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Credentials</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Admin email: admin@3rdeye.com</p>
          <p className="text-sm text-gray-500 mt-1">
            To change the admin password, contact the system administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
