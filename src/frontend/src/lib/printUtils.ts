const LOGO =
  "/assets/uploads/3rd_eye_logo-removebg-preview-removebg-preview-019d1f46-4f45-741e-b66d-a9115d608d7c-1.png";

const PRINT_STYLES = `
  @page { size: A4 portrait; margin: 12mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
    color: #111;
    font-size: 11px;
  }
  .doc-wrap { width: 100%; max-width: 180mm; margin: 0 auto; }
  .doc-header {
    border: 2px solid #0d9488;
    border-radius: 6px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 12px;
  }
  .doc-header img { width: 56px; height: 56px; object-fit: contain; }
  .doc-header-text { flex: 1; text-align: center; }
  .doc-header-text h1 { font-size: 20px; font-weight: 700; color: #0d9488; line-height: 1.2; }
  .doc-header-text p { font-size: 10px; color: #555; margin-top: 2px; }
  .doc-header-text .addr { font-size: 9px; color: #777; }
  .doc-title { text-align: center; margin: 8px 0 4px; }
  .doc-title h2 { font-size: 15px; font-weight: 700; }
  .doc-title p { font-size: 10px; color: #555; margin-top: 2px; }
  .doc-info { margin: 6px 0 10px; font-size: 10px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
  .doc-info span { margin-right: 18px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  thead tr { background-color: #0d9488 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  thead th { color: #fff; padding: 7px 8px; text-align: left; font-size: 10px; border: 1px solid #0a7c72; }
  thead th.right { text-align: right; }
  tbody tr:nth-child(even) { background-color: #f5f5f5; }
  tbody td { padding: 6px 8px; border: 1px solid #ddd; font-size: 10px; vertical-align: middle; }
  tbody td.right { text-align: right; }
  tbody td.red { color: #dc2626; font-weight: 600; }
  tbody td.green { color: #16a34a; font-weight: 600; }
  tfoot tr { background-color: #e0f2f1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: 700; }
  tfoot td { padding: 7px 8px; border: 1px solid #0d9488; border-top: 2px solid #0d9488; font-size: 10px; }
  tfoot td.right { text-align: right; }
  .doc-signature { margin-top: 24px; display: flex; justify-content: flex-end; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1px solid #111; width: 160px; margin: 28px auto 4px; }
  .sig-block p { font-size: 10px; }
  .sig-block .sig-name { font-weight: 700; font-size: 11px; color: #0d9488; }
  .doc-footer {
    margin-top: 16px;
    border-top: 1px solid #ccc;
    padding-top: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9px;
    color: #888;
  }
  .doc-footer .center { text-align: center; }
`;

export function printDocument(title: string, bodyHtml: string) {
  const printWin = window.open("", "_blank", "width=900,height=700");
  if (!printWin) {
    alert("Please allow popups for this site to print documents.");
    return;
  }
  const origin = window.location.origin;
  const logoSrc = origin + LOGO;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  ${bodyHtml.replace(/\$\{LOGO_SRC\}/g, logoSrc)}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  <\/script>
</body>
</html>`;
  printWin.document.write(html);
  printWin.document.close();
}

export function buildDocHeader(
  societyName: string,
  subTitle: string,
  address: string,
) {
  const origin = window.location.origin;
  const logoSrc = origin + LOGO;
  return `<div class="doc-header">
    <img src="${logoSrc}" alt="3rd Eye Homes" />
    <div class="doc-header-text">
      <h1>${societyName}</h1>
      <p>${subTitle}</p>
      ${address ? `<p class="addr">${address}</p>` : ""}
    </div>
  </div>`;
}

export function buildDocFooter(
  leftText: string,
  centerText: string,
  pageNum = 1,
) {
  return `<div class="doc-footer">
    <span>${leftText}</span>
    <span class="center">${centerText}</span>
    <span>Page ${pageNum}</span>
  </div>`;
}

export function buildSignatureBlock() {
  return `<div class="doc-signature">
    <div class="sig-block">
      <div class="sig-line"></div>
      <p>Authorized Signature</p>
      <p class="sig-name">3rd Eye Home</p>
    </div>
  </div>`;
}
