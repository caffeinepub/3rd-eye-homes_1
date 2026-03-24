// Bridge for jsPDF loaded via CDN in index.html
// The CDN script sets window.jspdf.jsPDF

declare global {
  interface Window {
    jspdf: { jsPDF: any };
    XLSX: any;
  }
}

export class jsPDF {
  private doc: any;

  constructor(options?: {
    orientation?: "portrait" | "landscape";
    unit?: "pt" | "mm" | "cm" | "in";
    format?: string | number[];
  }) {
    // jsPDF CDN exposes window.jspdf.jsPDF
    const JsPDFConstructor = window.jspdf?.jsPDF;
    if (!JsPDFConstructor) {
      throw new Error("jsPDF not loaded. Ensure CDN script is in index.html");
    }
    this.doc = new JsPDFConstructor(options);
  }

  get internal() {
    return this.doc.internal;
  }

  addPage() {
    this.doc.addPage();
    return this;
  }

  setFontSize(size: number) {
    this.doc.setFontSize(size);
    return this;
  }

  setFont(fontName: string, fontStyle?: string) {
    this.doc.setFont(fontName, fontStyle);
    return this;
  }

  text(
    text: string,
    x: number,
    y: number,
    options?: { align?: string; maxWidth?: number },
  ) {
    this.doc.text(text, x, y, options);
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number) {
    this.doc.line(x1, y1, x2, y2);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, style?: string) {
    this.doc.rect(x, y, w, h, style);
    return this;
  }

  save(filename: string) {
    this.doc.save(filename);
    return this;
  }

  setDrawColor(r: number, g?: number, b?: number) {
    this.doc.setDrawColor(r, g, b);
    return this;
  }

  setFillColor(r: number, g?: number, b?: number) {
    this.doc.setFillColor(r, g, b);
    return this;
  }

  setTextColor(r: number, g?: number, b?: number) {
    this.doc.setTextColor(r, g, b);
    return this;
  }

  addImage(
    imageData: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) {
    this.doc.addImage(imageData, format, x, y, w, h);
    return this;
  }

  getNumberOfPages() {
    return this.doc.getNumberOfPages();
  }

  setPage(pageNumber: number) {
    this.doc.setPage(pageNumber);
    return this;
  }

  output(type: string) {
    return this.doc.output(type);
  }
}
