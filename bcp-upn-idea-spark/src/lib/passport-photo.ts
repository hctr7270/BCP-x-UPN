export async function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Selecciona una imagen válida.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    return cropPhoto(image, image.naturalWidth, image.naturalHeight);
  } catch { throw new Error("No se pudo leer la foto. Prueba con JPG o PNG."); }
  finally { URL.revokeObjectURL(url); }
}
export function cropPhoto(image: CanvasImageSource, width: number, height: number): string {
  const canvas = document.createElement("canvas"); canvas.width = 360; canvas.height = 480;
  const ctx = canvas.getContext("2d"); if (!ctx || !width || !height) throw new Error("La cámara todavía no está lista.");
  const cropWidth = Math.min(width, height * .75), cropHeight = cropWidth / .75;
  ctx.drawImage(image, (width - cropWidth) / 2, (height - cropHeight) / 2, cropWidth, cropHeight, 0, 0, 360, 480);
  return canvas.toDataURL("image/jpeg", .8);
}