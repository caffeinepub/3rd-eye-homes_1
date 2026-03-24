// Type declarations for libraries loaded via CDN
declare module "jspdf" {
  export class jsPDF {
    constructor(options?: {
      orientation?: "portrait" | "landscape";
      unit?: "pt" | "mm" | "cm" | "in";
      format?: string | number[];
    });
    internal: {
      pageSize: { width: number; height: number };
    };
    addPage(): jsPDF;
    setFontSize(size: number): jsPDF;
    setFont(fontName: string, fontStyle?: string): jsPDF;
    text(
      text: string,
      x: number,
      y: number,
      options?: {
        align?: "left" | "center" | "right" | "justify";
        maxWidth?: number;
      },
    ): jsPDF;
    line(x1: number, y1: number, x2: number, y2: number): jsPDF;
    rect(x: number, y: number, w: number, h: number, style?: string): jsPDF;
    save(filename: string): jsPDF;
    output(type: string): string | ArrayBuffer;
    setDrawColor(r: number, g?: number, b?: number): jsPDF;
    setFillColor(r: number, g?: number, b?: number): jsPDF;
    setTextColor(r: number, g?: number, b?: number): jsPDF;
    addImage(
      imageData: string | HTMLImageElement,
      format: string,
      x: number,
      y: number,
      w: number,
      h: number,
    ): jsPDF;
    getNumberOfPages(): number;
    setPage(pageNumber: number): jsPDF;
  }
}

declare module "xlsx" {
  export const utils: {
    book_new(): any;
    aoa_to_sheet(data: any[][]): any;
    json_to_sheet(data: any[]): any;
    book_append_sheet(wb: any, ws: any, name: string): void;
    sheet_to_json(ws: any, options?: any): any[];
  };
  export function writeFile(wb: any, filename: string): void;
  export function read(data: any, options?: any): any;
}
