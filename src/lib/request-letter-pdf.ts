import "server-only";

import { createRequire } from "node:module";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { formatApprovalDate, formatApprovalTime } from "@/lib/event-approval";
import { requestLetterFields, type RequestLetter } from "@/lib/request-letter";
import { universityName } from "@/lib/university";

const navy = "#152961";
const muted = "#596784";
const border = "#E3E8F2";
const nodeRequire = createRequire(join(process.cwd(), "package.json"));

export async function renderRequestLetterPdf(letter: RequestLetter, url: string) {
  const { modules } = QRCode.create(url);
  const document = new PDFDocument({ size: "A4", margin: 45, info: { Title: `Request letter – ${letter.title}`, Author: universityName } });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
  });

  const regular = nodeRequire.resolve("@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff");
  const bold = nodeRequire.resolve("@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff");
  const italic = nodeRequire.resolve("@fontsource/noto-sans/files/noto-sans-latin-400-italic.woff");
  document.registerFont("Regular", regular).registerFont("Bold", bold).registerFont("Italic", italic);

  const margin = document.page.margins.left;
  const width = document.page.width - margin * 2;
  const rule = () => {
    document.moveTo(margin, document.y).lineTo(margin + width, document.y).lineWidth(0.7).stroke(border);
    document.y += 7;
  };
  const body = (text: string) => document.font("Regular").fontSize(10).fillColor("#0F1422").text(text, { lineGap: 2 }).moveDown(0.45);

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

  const columnWidth = width / 2 - 14;
  const signatures = [
    { label: "Faculty e-sign", name: letter.faculty, signedAt: letter.facultySignedAt },
    { label: "Dean e-sign", name: letter.dean, signedAt: letter.deanSignedAt },
  ];
  document.font("Italic").fontSize(12);
  const namesHeight = Math.max(...signatures.map(({ name }) => document.heightOfString(name, { width: columnWidth })));
  if (document.y + namesHeight + 135 > document.page.maxY()) document.addPage();
  document.moveDown(0.45);
  rule();
  const signatureY = document.y;
  signatures.forEach(({ label, name, signedAt }, index) => {
    const x = margin + index * (columnWidth + 28);
    document.font("Bold").fontSize(9).fillColor(muted).text(label, x, signatureY, { width: columnWidth });
    document.font(signedAt ? "Italic" : "Regular").fontSize(12).fillColor(navy).text(name, { width: columnWidth });
    document.font("Regular").fontSize(8).fillColor(muted).text(signedAt ? formatApprovalTime(signedAt) : "Signature unavailable", { width: columnWidth });
  });

  const verificationY = signatureY + namesHeight + 38;
  const qrSize = 78;
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
