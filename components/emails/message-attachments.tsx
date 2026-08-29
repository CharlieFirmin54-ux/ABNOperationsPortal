"use client";

import { useState } from "react";
import { Download, FileImage, FileText, Paperclip } from "lucide-react";
import {
  attachmentHref,
  isImageAttachment,
  isInlinePreviewable,
  isPdfAttachment,
} from "@/lib/email-attachments";
import { formatBytes } from "@/lib/format";
import type { EmailAttachment } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MessageAttachments({
  messageId,
  attachments = [],
}: {
  messageId: string;
  attachments?: EmailAttachment[];
}) {
  const [previewPartId, setPreviewPartId] = useState<string | null>(null);
  const preview =
    attachments.find((file) => file.partId === previewPartId) ?? null;
  const previewUrl = preview
    ? attachmentHref(messageId, preview.partId)
    : null;

  return (
    <section className="max-w-2xl space-y-3">
      <div className="flex items-center gap-2">
        <Paperclip className="size-3.5 text-zinc-500" />
        <h4 className="text-sm font-medium text-white">Attachments</h4>
        {attachments.length > 0 && (
          <span className="text-xs text-zinc-600">({attachments.length})</span>
        )}
      </div>

      {attachments.length === 0 ? (
        <p className="text-sm text-zinc-600">No attachments on this message.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((file) => {
            const href = attachmentHref(messageId, file.partId);
            const downloadHref = attachmentHref(messageId, file.partId, true);
            const previewable = isInlinePreviewable(
              file.contentType,
              file.filename
            );
            const active = previewPartId === file.partId;
            const sizeLabel = formatBytes(file.size);
            return (
              <li key={file.partId}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (previewable) {
                        setPreviewPartId((current) =>
                          current === file.partId ? null : file.partId
                        );
                      } else {
                        window.open(
                          downloadHref,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }
                    }}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-white/10 bg-[#161616] px-3 py-2.5 text-left hover:bg-[#1f1f1f]",
                      active && "border-white/20 bg-[#1f1f1f]"
                    )}
                  >
                    {isImageAttachment(file.contentType) ? (
                      <FileImage className="size-4 shrink-0 text-zinc-400" />
                    ) : (
                      <FileText className="size-4 shrink-0 text-zinc-400" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">
                        {file.filename}
                      </span>
                      <span className="block text-xs text-zinc-600">
                        {sizeLabel || file.contentType}
                      </span>
                    </span>
                  </button>
                  <a
                    href={previewable ? href : downloadHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#161616] text-zinc-400 hover:bg-[#1f1f1f] hover:text-white"
                    aria-label={
                      previewable
                        ? `Open ${file.filename}`
                        : `Download ${file.filename}`
                    }
                  >
                    <Download className="size-4" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {preview && previewUrl && isImageAttachment(preview.contentType) && (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
          {/* Preview comes from the same-origin attachment API. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={preview.filename}
            className="max-h-[28rem] w-full object-contain"
          />
        </div>
      )}

      {preview && previewUrl && isPdfAttachment(preview.contentType, preview.filename) && (
        <iframe
          title={preview.filename}
          src={previewUrl}
          className="h-[28rem] w-full rounded-lg border border-white/10 bg-white"
        />
      )}
    </section>
  );
}
