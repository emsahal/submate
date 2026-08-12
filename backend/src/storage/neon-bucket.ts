import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

/**
 * Neon Object Storage adapter — S3-compatible, path-style only.
 * Screenshots are stored here; the database keeps only object references
 * (metadata), never binary data.
 */

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  if (!config.storageEndpointUrl || !config.storageAccessKeyId || !config.storageSecretAccessKey) {
    throw new Error(
      "Neon Object Storage is not configured (AWS_ENDPOINT_URL_S3 / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).",
    );
  }
  client = new S3Client({
    region: config.storageRegion,
    endpoint: config.storageEndpointUrl,
    credentials: {
      accessKeyId: config.storageAccessKeyId,
      secretAccessKey: config.storageSecretAccessKey,
    },
    forcePathStyle: true, // Neon storage requires path-style addressing.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return client;
}

export function storageConfigured(): boolean {
  return Boolean(
    config.storageEndpointUrl && config.storageAccessKeyId && config.storageSecretAccessKey,
  );
}

/** Object key layout: screenshots/<userId>/<uuid>.<ext> */
export function buildObjectKey(userId: string, extension: string): string {
  const id = crypto.randomUUID();
  return `screenshots/${userId}/${id}.${extension}`;
}

export interface StoredObject {
  bucket: string;
  key: string;
  size: number;
  eTag?: string;
}

export async function uploadObject(
  key: string,
  body: Buffer<ArrayBufferLike> | Uint8Array,
  mimeType: string,
  bucket = config.storageBucket,
): Promise<StoredObject> {
  const result = await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
      Metadata: {
        "x-amz-meta-uploaded-at": new Date().toISOString(),
      },
    }),
  );
  return {
    bucket,
    key,
    size: body.byteLength,
    eTag: result.ETag,
  };
}

export async function deleteObject(key: string, bucket = config.storageBucket): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function headObject(key: string, bucket = config.storageBucket) {
  return getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
}

/** Short-lived read URL, safe to hand to the browser. */
export async function presignedReadUrl(key: string, bucket = config.storageBucket, expiresIn = 3600): Promise<string> {
  if (!storageConfigured()) return "";
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

/** Server-side read; used by AI analysis and admin verification. */
export async function downloadObject(key: string, bucket = config.storageBucket): Promise<{ bytes: Buffer; mimeType?: string }> {
  const res = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = Buffer.from((await res.Body?.transformToByteArray()) ?? new Uint8Array());
  return { bytes, mimeType: res.ContentType };
}