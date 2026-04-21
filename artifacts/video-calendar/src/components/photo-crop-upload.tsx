import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useUpload } from "@workspace/object-storage-web";
import { Camera, Loader2, Crop as CropIcon, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function photoStorageUrl(objectPath: string | null | undefined): string | undefined {
  if (!objectPath) return undefined;
  if (objectPath.startsWith("http")) return objectPath;
  return `/api/storage${objectPath}`;
}

interface PhotoCropUploadProps {
  currentPhotoUrl?: string | null;
  name: string;
  color: string;
  onUploaded: (objectPath: string) => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

async function cropImageToBlob(image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const size = Math.min(pixelCrop.width, pixelCrop.height, 512);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível gerar a imagem"));
      },
      "image/jpeg",
      0.92
    );
  });
}

export function PhotoCropUpload({ currentPhotoUrl, name, color, onUploaded }: PhotoCropUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      onUploaded(response.objectPath);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrcUrl(url);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setCropOpen(true);
    e.target.value = "";
  };

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const initialCrop = centerAspectCrop(naturalWidth, naturalHeight, 1);
    setCrop(initialCrop);
  }, []);

  const handleConfirm = async () => {
    if (!imgRef.current || !completedCrop || !srcUrl) return;
    setIsProcessing(true);
    try {
      const blob = await cropImageToBlob(imgRef.current, completedCrop);
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      await uploadFile(file);
      setCropOpen(false);
      URL.revokeObjectURL(srcUrl);
      setSrcUrl(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setCropOpen(false);
    if (srcUrl) {
      URL.revokeObjectURL(srcUrl);
      setSrcUrl(null);
    }
  };

  const src = photoStorageUrl(currentPhotoUrl);
  const isBusy = isUploading || isProcessing;

  return (
    <>
      <div className="flex justify-center">
        <div
          className="relative group cursor-pointer"
          onClick={() => !isBusy && inputRef.current?.click()}
        >
          <Avatar className="h-20 w-20 border-2" style={{ borderColor: color }}>
            <AvatarImage src={src} alt={name} />
            <AvatarFallback style={{ backgroundColor: color, color: "#fff", fontSize: "1.5rem" }}>
              {name.substring(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            {isBusy ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isBusy}
          />
        </div>
      </div>

      <Dialog open={cropOpen} onOpenChange={(o) => !o && handleCancel()}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="h-4 w-4" />
              Recortar foto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Arraste para reposicionar e redimensione para enquadrar o rosto.
            </p>

            {srcUrl && (
              <div className="flex justify-center rounded-lg overflow-hidden bg-muted">
                <ReactCrop
                  crop={crop}
                  onChange={(_, pct) => setCrop(pct)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  minWidth={50}
                  minHeight={50}
                >
                  <img
                    ref={imgRef}
                    src={srcUrl}
                    alt="Recortar"
                    onLoad={handleImageLoad}
                    style={{ maxHeight: "360px", maxWidth: "100%", display: "block" }}
                  />
                </ReactCrop>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isBusy}
              >
                <X className="h-4 w-4 mr-1.5" />
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={isBusy || !completedCrop}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Usar esta foto
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
