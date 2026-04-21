import { useRef } from "react";
import { useUpload } from "@workspace/object-storage-web";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  name: string;
  color: string;
  onUploaded: (objectPath: string) => void;
}

export function photoStorageUrl(objectPath: string | null | undefined): string | undefined {
  if (!objectPath) return undefined;
  if (objectPath.startsWith("http")) return objectPath;
  return `/api/storage${objectPath}`;
}

export function PhotoUpload({ currentPhotoUrl, name, color, onUploaded }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (response) => {
      onUploaded(response.objectPath);
    },
  });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = "";
  };

  const src = photoStorageUrl(currentPhotoUrl);

  return (
    <div className="flex justify-center">
      <div className="relative group cursor-pointer" onClick={() => !isUploading && inputRef.current?.click()}>
        <Avatar className="h-20 w-20 border-2" style={{ borderColor: color }}>
          <AvatarImage src={src} alt={name} />
          <AvatarFallback style={{ backgroundColor: color, color: "#fff", fontSize: "1.5rem" }}>
            {name.substring(0, 2).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          {isUploading ? (
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
          onChange={handleChange}
          disabled={isUploading}
        />
      </div>
      <p className="sr-only">Clique na foto para alterar</p>
    </div>
  );
}
