// Bridge for XLSX (SheetJS) loaded via CDN in index.html
declare global {
  interface Window {
    XLSX: any;
  }
}

function getXLSX() {
  if (!window.XLSX) {
    throw new Error("XLSX not loaded. Ensure CDN script is in index.html");
  }
  return window.XLSX;
}

export const utils = {
  book_new: () => getXLSX().utils.book_new(),
  aoa_to_sheet: (data: any[][]) => getXLSX().utils.aoa_to_sheet(data),
  json_to_sheet: (data: any[]) => getXLSX().utils.json_to_sheet(data),
  book_append_sheet: (wb: any, ws: any, name: string) =>
    getXLSX().utils.book_append_sheet(wb, ws, name),
  sheet_to_json: (ws: any, options?: any) =>
    getXLSX().utils.sheet_to_json(ws, options),
};

export function writeFile(wb: any, filename: string) {
  return getXLSX().writeFile(wb, filename);
}

export function read(data: any, options?: any) {
  return getXLSX().read(data, options);
}
