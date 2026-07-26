import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { logWarn } from "@/lib/observability/log";

/** Private bucket for signature PNG objects. Path: `{businessId}/{submissionId}.png` */
export const SIGNATURES_BUCKET = "signatures";

type StorageClient = SupabaseClient<Database>;

/**
 * Decode a `data:image/png;base64,...` URL into raw PNG bytes.
 * Returns null when the prefix is missing or the payload is empty/invalid.
 */
export function pngBytesFromDataUrl(dataUrl: string): Uint8Array | null {
  const prefix = "data:image/png;base64,";
  if (!dataUrl.startsWith(prefix)) return null;
  const b64 = dataUrl.slice(prefix.length).trim();
  if (!b64) return null;
  try {
    return new Uint8Array(Buffer.from(b64, "base64"));
  } catch {
    return null;
  }
}

export function sha256HexBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Upload a signature PNG to the private `signatures` bucket.
 * Object path (also stored in submission.signature_url): `{businessId}/{submissionId}.png`
 */
export async function uploadSignaturePng(
  serviceClient: StorageClient,
  input: { businessId: string; submissionId: string; bytes: Uint8Array },
): Promise<{ path: string } | null> {
  const path = `${input.businessId}/${input.submissionId}.png`;
  const { error } = await serviceClient.storage
    .from(SIGNATURES_BUCKET)
    .upload(path, input.bytes, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) {
    logWarn("signature.upload_failed", {
      path,
      message: error.message,
    });
    return null;
  }
  return { path };
}

/** Best-effort delete; never throws. */
export async function deleteSignatureObject(
  client: StorageClient,
  path: string,
): Promise<void> {
  if (!path || path.startsWith("data:")) return;
  try {
    const { error } = await client.storage
      .from(SIGNATURES_BUCKET)
      .remove([path]);
    if (error) {
      logWarn("signature.delete_failed", { path, message: error.message });
    }
  } catch (err) {
    logWarn("signature.delete_failed", {
      path,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Resolve a stored signature to a data URL for PDF embedding.
 * - Legacy rows: `data:image/png;base64,...` returned as-is
 * - New rows: storage path → download from `signatures` bucket
 */
export async function resolveSignatureDataUrl(
  client: StorageClient,
  signatureUrl: string | null,
): Promise<string | null> {
  if (!signatureUrl) return null;
  if (signatureUrl.startsWith("data:")) return signatureUrl;

  const { data, error } = await client.storage
    .from(SIGNATURES_BUCKET)
    .download(signatureUrl);

  if (error || !data) {
    logWarn("signature.download_failed", {
      path: signatureUrl,
      message: error?.message ?? "empty",
    });
    return null;
  }

  const buf = Buffer.from(await data.arrayBuffer());
  return `data:image/png;base64,${buf.toString("base64")}`;
}
