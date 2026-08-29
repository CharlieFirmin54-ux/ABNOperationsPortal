import { DEMO_ATTACHMENT_PART_ID } from "@/lib/email-attachments";

function buildDemoPdf(): Buffer {
  const stream =
    "BT /F1 16 Tf 72 720 Td (ABN Property Maintenance) Tj 0 -24 Td (Demo inbox attachment - boiler no heat.) Tj ET\n";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }

  const xrefStart = Buffer.byteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body += xref;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}

const DEMO_PDF = buildDemoPdf();

export type DemoAttachmentFile = {
  filename: string;
  contentType: string;
  content: Buffer;
};

export function getDemoAttachment(
  messageId: string,
  partId: string
): DemoAttachmentFile | null {
  if (!messageId.startsWith("mail-")) return null;
  if (partId !== DEMO_ATTACHMENT_PART_ID) return null;
  return {
    filename: "boiler-no-heat.pdf",
    contentType: "application/pdf",
    content: DEMO_PDF,
  };
}
