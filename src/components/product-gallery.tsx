"use client";

import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PLACEHOLDER_PRODUCT_IMAGE } from "@/lib/placeholder-image";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: string;
  url: string;
}

export function ProductGallery({
  images,
  productName,
}: {
  images: GalleryImage[];
  productName: string;
}) {
  // Producto sin fotos cargadas todavía: se muestra el placeholder en vez de
  // un contenedor vacío/roto.
  const displayImages: GalleryImage[] =
    images.length > 0 ? images : [{ id: "placeholder", url: PLACEHOLDER_PRODUCT_IMAGE }];
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeImage = displayImages[selected] ?? displayImages[0]!;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted"
        aria-label="Ampliar imagen"
      >
        <Image
          src={activeImage.url}
          alt={productName}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </button>

      {displayImages.length > 1 && (
        <div className="flex gap-2">
          {displayImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Ver foto ${index + 1}`}
              aria-current={index === selected}
              className={cn(
                "relative aspect-square w-16 shrink-0 overflow-hidden rounded-md border-2",
                index === selected ? "border-primary" : "border-transparent",
              )}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          showCloseButton
          className="max-w-[calc(100%-2rem)] border-none bg-transparent p-0 shadow-none sm:max-w-3xl"
        >
          <DialogTitle className="sr-only">{productName}</DialogTitle>
          <div className="relative aspect-square w-full sm:aspect-[4/3]">
            <Image
              src={activeImage.url}
              alt={productName}
              fill
              sizes="90vw"
              className="object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
