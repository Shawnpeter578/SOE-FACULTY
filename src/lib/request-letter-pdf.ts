import "server-only";

import { createRequire } from "node:module";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { formatApprovalDate, formatApprovalTime } from "@/lib/event-approval";
import { defaultLetterBody, defaultLetterClosing, letterArrangementRows, requestLetterFields, type RequestLetter } from "@/lib/request-letter";
import { SIGNATURE_GRID_MAX, signatureStrokes } from "@/lib/profile-signature";
import { universityName } from "@/lib/university";

const navy = "#152961";
const muted = "#596784";
const border = "#E3E8F2";
const nodeRequire = createRequire(join(process.cwd(), "package.json"));

export async function renderRequestLetterPdf(letter: RequestLetter, url: string) {
  const { modules } = QRCode.create(url);
  const document = new PDFDocument({ size: "A4", margin: letter.usesLegacyLetterFormat ? 45 : 57, info: { Title: `Request letter – ${letter.title}`, Author: universityName } });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });

  const regular = nodeRequire.resolve("@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff");
  const bold = nodeRequire.resolve("@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff");
  const italic = nodeRequire.resolve("@fontsource/noto-sans/files/noto-sans-latin-400-italic.woff");
  const currency = nodeRequire.resolve("@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff");
  document.registerFont("Regular", regular).registerFont("Bold", bold).registerFont("Italic", italic).registerFont("Currency", currency);

  const margin = document.page.margins.left;
  const width = document.page.width - margin * 2;
  const rule = () => {
    document.moveTo(margin, document.y).lineTo(margin + width, document.y).lineWidth(0.7).stroke(border);
    document.y += 7;
  };
  const body = (text: string) => document.font("Regular").fontSize(10).fillColor("#0F1422").text(text, { lineGap: 2 }).moveDown(0.45);

  if (letter.usesLegacyLetterFormat) {
    document.font("Bold").fontSize(18).fillColor(navy).text(universityName);
    if (letter.department) document.font("Regular").fontSize(10).fillColor(muted).text(letter.department);
    document.moveDown(0.5);
    rule();
    document.font("Regular").fontSize(8).fillColor(muted).text("REQUEST FOR EVENT PERMISSION", { continued: true });
    document.text(letter.createdAt ? formatApprovalDate(letter.createdAt) : "", { align: "right" }).moveDown(0.9);
    body("To the Vice-Chancellor");
    document.font("Bold").fontSize(11).fillColor(navy).text(`Subject: Request for approval of ${letter.title}`).moveDown(0.5);
    body(`We request permission to conduct ${letter.title}.`);
    body(letter.description);
    if (letter.objectives) body(`Objectives: ${letter.objectives}`);
    rule();
    for (const [label, value] of requestLetterFields(letter)) {
      const printableValue = label === "Budget estimate" ? value.replace("₹", "INR ") : value;
      body(`${label}: ${printableValue}`);
    }
    if (letter.requirements) body(`Requirements: ${letter.requirements}`);
    body("The Dean has approved this request for submission to your office.");
  } else {
    renderPermissionLetterContent(document, letter, margin, width);
  }

  const columnWidth = width / 2 - 14;
  const signatures = [
    { label: letter.usesLegacyLetterFormat ? "Faculty e-sign" : "Faculty endorsement", name: letter.faculty, signedAt: letter.facultySignedAt, date: letter.facultySignedAt, fallback: "Signature unavailable", mark: letter.facultySignature },
    { label: letter.deanSignedAt ? "Dean e-sign" : "Dean approval", name: letter.dean, signedAt: letter.deanSignedAt,
      date: letter.deanSignedAt ?? letter.deanApprovedAt, fallback: "Approved in EventDesk", mark: letter.deanApprovalSignature },
  ];
  const marksHeight = Math.max(...signatures.map(({ mark }) => mark?.kind === "typed"
    ? document.font("Italic").fontSize(13).heightOfString(mark.value, { width: columnWidth })
    : mark?.kind === "drawn" ? 28 : 0));
  const namesHeight = Math.max(...signatures.map(({ name }) => document.font("Regular").fontSize(12).heightOfString(name, { width: columnWidth })));
  const qrSize = 74;
  if (document.y + namesHeight + marksHeight + qrSize + 54 > document.page.maxY()) document.addPage();
  document.moveDown(0.45);
  rule();
  const signatureY = document.y;
  signatures.forEach(({ label, name, signedAt, date, fallback, mark }, index) => {
    const x = margin + index * (columnWidth + 28);
    document.font("Bold").fontSize(9).fillColor(muted).text(label, x, signatureY, { width: columnWidth });
    if (mark?.kind === "typed") {
      document.font("Italic").fontSize(13).fillColor(navy).text(mark.value, { width: columnWidth });
    } else if (mark?.kind === "drawn") {
      const top = document.y;
      document.save().lineWidth(1.1).lineCap("round").lineJoin("round");
      for (const stroke of signatureStrokes(mark.value)) {
        stroke.forEach(([pointX, pointY], pointIndex) => {
          const px = x + pointX / SIGNATURE_GRID_MAX * 95;
          const py = top + pointY / SIGNATURE_GRID_MAX * 26;
          if (pointIndex === 0) document.moveTo(px, py);
          else document.lineTo(px, py);
        });
      }
      document.stroke(navy).restore();
      document.y = top + 28;
    }
    document.font(signedAt && !mark ? "Italic" : "Regular").fontSize(12).fillColor(navy).text(name, { width: columnWidth });
    document.font("Regular").fontSize(8).fillColor(muted).text(date ? formatApprovalTime(date) : fallback, { width: columnWidth });
  });

  const verificationY = signatureY + namesHeight + marksHeight + 38;
  const qrX = margin + width - qrSize;
  document.rect(margin, verificationY + 22, width - qrSize - 12, 34).lineWidth(0.7).stroke(border);
  document.font("Bold").fontSize(9).fillColor(navy).text(`Letter ID   ${letter.letterId}`, margin + 10, verificationY + 33, { width: width - qrSize - 32, link: url });
  const moduleSize = qrSize / (modules.size + 8);
  for (let row = 0; row < modules.size; row++) {
    for (let column = 0; column < modules.size; column++) {
      if (modules.get(row, column)) {
        document.rect(qrX + (column + 4) * moduleSize, verificationY + (row + 4) * moduleSize, moduleSize, moduleSize);
      }
    }
  }
  document.fill("#000000").link(qrX, verificationY, qrSize, qrSize, url);
  document.end();
  return result;
}

function renderPermissionLetterContent(document: PDFKit.PDFDocument, letter: RequestLetter, margin: number, width: number) {
  const department = letter.department && (letter.department.startsWith("Department of ") ? letter.department : `Department of ${letter.department}`);
  document.font("Times-Bold").fontSize(22).fillColor(navy).text(universityName);
  if (department) document.font("Regular").fontSize(10).fillColor(muted).text(department);
  document.moveDown(0.8);
  document.moveTo(margin, document.y).lineTo(margin + width, document.y).lineWidth(0.8).stroke(navy);
  document.y += 16;

  const addressY = document.y;
  if (letter.createdAt) {
    document.font("Regular").fontSize(10).fillColor(muted).text(formatApprovalDate(letter.createdAt), margin, addressY, { width, align: "right" });
  }
  document.font("Bold").fontSize(10).fillColor(navy).text("To", margin, addressY);
  document.font("Bold").fillColor("#0F1422").text("The Vice-Chancellor");
  document.font("Regular").text(universityName).moveDown(1.2);
  document.font("Times-Bold").fontSize(18).fillColor(navy).text(`Request for permission to conduct ${letter.title}`).moveDown(0.7);
  document.font("Regular").fontSize(10).fillColor("#0F1422").text(letter.body ?? defaultLetterBody(letter), { lineGap: 3 }).moveDown(0.85);

  const firstColumn = width * 0.3;
  const valueX = margin + firstColumn + 8;
  const valueWidth = width - firstColumn - 16;
  if (document.y + 52 > document.page.maxY()) document.addPage();
  const tableTop = document.y;
  document.rect(margin, tableTop, width, 26).fill("#E8ECF6");
  document.font("Bold").fontSize(10).fillColor(navy).text("Event details", margin + 8, tableTop + 6, { width: firstColumn - 16 });
  document.text("Proposed arrangements", valueX, tableTop + 6, { width: valueWidth });
  document.y = tableTop + 26;

  for (const [label, value] of letterArrangementRows(letter)) {
    const isCurrency = label === "Estimated budget" && value.startsWith("₹");
    const rowHeight = document.font("Regular").heightOfString(value, { width: valueWidth, lineGap: 2 }) + 8;
    const pageContentHeight = document.page.maxY() - document.page.margins.top;
    if (document.y + rowHeight > document.page.maxY() && rowHeight < pageContentHeight) document.addPage();
    const rowY = document.y;
    const rowPage = document.page;
    document.fillColor(muted).text(label, margin + 8, rowY + 4, { width: firstColumn - 16 });
    document.fillColor("#0F1422");
    if (isCurrency) {
      document.font("Currency").text("₹", valueX, rowY + 4, { width: valueWidth, continued: true });
      document.font("Regular").text(value.slice(1));
    } else {
      document.text(value, valueX, rowY + 4, { width: valueWidth, lineGap: 2 });
    }
    document.y = rowPage === document.page ? Math.max(rowY + rowHeight, document.y + 4) : document.y + 4;
    document.moveTo(margin, document.y).lineTo(margin + width, document.y).lineWidth(0.6).stroke(border);
  }

  document.moveDown(0.85);
  const closing = letter.closing ?? defaultLetterClosing;
  if (closing) document.font("Regular").fillColor("#0F1422").text(closing, margin, document.y, { width, lineGap: 3 }).moveDown(0.45);
  document.font("Bold").fillColor("#0F1422").text(letter.faculty, margin, document.y, { width });
  if (department) document.font("Regular").text(department);
}
