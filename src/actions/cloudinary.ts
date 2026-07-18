"use server";

import { cloudinary, CLOUDINARY_UPLOAD_FOLDER } from "@/lib/cloudinary";
import { requireAdminSession } from "@/lib/require-admin-session";

export interface UploadSignature {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

/**
 * Genera una firma temporal para que el navegador suba la imagen DIRECTO a
 * Cloudinary (Historia 4.3) — el archivo nunca pasa por nuestro servidor, así
 * que el límite de ~4.5MB por request de Vercel no aplica. El api_secret
 * nunca se manda al cliente, solo el resultado de firmarlo.
 */
export async function createUploadSignature(): Promise<UploadSignature> {
  await requireAdminSession();

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder: CLOUDINARY_UPLOAD_FOLDER };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!,
  );

  return {
    timestamp,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder: CLOUDINARY_UPLOAD_FOLDER,
  };
}
