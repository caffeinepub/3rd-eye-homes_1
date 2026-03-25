import { useEffect, useRef, useState } from "react";
import { Input } from "./input";
import { Label } from "./label";

interface Flat {
  id: bigint | number;
  flatNumber: string;
  block: string;
  ownerName: string;
  pendingAmount?: bigint | number;
  [key: string]: any;
}

interface Props {
  flats: Flat[];
  selectedId: string;
  onSelect: (flat: Flat | null, id: string) => void;
  label?: string;
  dataOcid?: string;
}

export default function FlatSearchSelect({
  flats,
  selectedId,
  onSelect,
  label = "Select Flat",
  dataOcid,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display text when selectedId changes externally
  useEffect(() => {
    if (!selectedId) {
      setSearchText("");
      return;
    }
    const found = flats.find((f) => String(f.id) === selectedId);
    if (found) {
      setSearchText(
        `${found.block} - ${found.flatNumber} (${found.ownerName})`,
      );
    }
  }, [selectedId, flats]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredFlats = flats.filter((f) => {
    const q = searchText.toLowerCase();
    return (
      f.flatNumber?.toLowerCase().includes(q) ||
      f.block?.toLowerCase().includes(q) ||
      f.ownerName?.toLowerCase().includes(q) ||
      `${f.block}-${f.flatNumber}`.toLowerCase().includes(q) ||
      `${f.block} ${f.flatNumber}`.toLowerCase().includes(q)
    );
  });

  const handleSelect = (flat: Flat) => {
    setSearchText(`${flat.block} - ${flat.flatNumber} (${flat.ownerName})`);
    setShowDropdown(false);
    onSelect(flat, String(flat.id));
  };

  const handleClear = () => {
    setSearchText("");
    setShowDropdown(false);
    onSelect(null, "");
  };

  return (
    <div>
      <Label>{label}</Label>
      <div ref={containerRef} className="relative mt-1">
        <div className="relative">
          <Input
            placeholder="Search by flat no, block or owner name..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              onSelect(null, "");
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="pr-8"
            data-ocid={dataOcid}
          />
          {searchText && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              &times;
            </button>
          )}
        </div>

        {showDropdown && (
          <div className="absolute z-50 w-full bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-56 overflow-y-auto">
            {filteredFlats.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500">
                No flats found
              </div>
            ) : (
              filteredFlats.map((f) => (
                <button
                  key={String(f.id)}
                  type="button"
                  onClick={() => handleSelect(f)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-teal-50 border-b last:border-b-0 flex justify-between items-center"
                >
                  <span>
                    <span className="font-semibold text-teal-800">
                      {f.block} - {f.flatNumber}
                    </span>
                    <span className="ml-2 text-gray-600">{f.ownerName}</span>
                  </span>
                  {f.pendingAmount !== undefined && (
                    <span className="text-xs text-gray-400 ml-2 shrink-0">
                      Pending: ₹{Number(f.pendingAmount).toLocaleString()}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {!showDropdown && !selectedId && flats.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {flats.length} flat(s) available — start typing to filter
          </p>
        )}
      </div>
    </div>
  );
}
