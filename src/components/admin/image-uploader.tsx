"use client";

import { useState } from "react";
import { createUploadSignature } from "@/actions/cloudinary";
import { Button } from "@/components/ui/button";

export interface UploadedImage {
  url: string;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
}

async function uploadDirectToCloudinary(file: File): Promise<string> {
  const signature = await createUploadSignature();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);

  // El archivo va DIRECTO a Cloudinary desde el navegador — nunca pasa por
  // nuestro servidor (evita el límite de ~4.5MB por request de Vercel).
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    throw new Error("Cloudinary rechazó la subida.");
  }

  const data = await response.json();
  return data.secure_url as string;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const url = await uploadDirectToCloudinary(file);
      onChange([...images, { url }]);
    } catch {
      // El resto del formulario no se pierde: solo falla la subida de esta
      // imagen puntual (Historia 4.3, caso borde).
      setError("No se pudo subir la imagen. Probá de nuevo.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {images.map((image, index) => (
          <div key={image.url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL externa de Cloudinary, no necesita next/image acá */}
            <img src={image.url} alt="" className="h-24 w-24 rounded-md object-cover" />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-destructive text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div>
        <input
          id="image-upload-input"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />
        <label htmlFor="image-upload-input">
          <Button type="button" variant="outline" disabled={isUploading} asChild>
            <span>{isUploading ? "Subiendo..." : "Agregar imagen"}</span>
          </Button>
        </label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
