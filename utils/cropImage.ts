export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues
    image.src = url
  })

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return ""
  }

  // set canvas size to match the bounding box
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // draw cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // Max dimensions for avatars to save storage space
  const MAX_SIZE = 400;
  let finalWidth = canvas.width;
  let finalHeight = canvas.height;
  
  if (finalWidth > MAX_SIZE || finalHeight > MAX_SIZE) {
    const ratio = Math.min(MAX_SIZE / finalWidth, MAX_SIZE / finalHeight);
    finalWidth = finalWidth * ratio;
    finalHeight = finalHeight * ratio;
    
    const compressedCanvas = document.createElement('canvas');
    compressedCanvas.width = finalWidth;
    compressedCanvas.height = finalHeight;
    const compressedCtx = compressedCanvas.getContext('2d');
    if (compressedCtx) {
      compressedCtx.drawImage(canvas, 0, 0, finalWidth, finalHeight);
      return compressedCanvas.toDataURL('image/jpeg', 0.8);
    }
  }

  // As Base64 string with compression
  return canvas.toDataURL('image/jpeg', 0.8)
}
