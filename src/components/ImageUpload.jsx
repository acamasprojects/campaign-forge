import { useRef } from "react";

const MAX_DIMENSION = 480;
const JPEG_QUALITY = 0.82;

/** Reads an image file, downscales it to fit within MAX_DIMENSION on its
 * longest edge, and re-encodes as JPEG — since there's no backend here,
 * portraits live directly in localStorage as data URIs, and an un-resized
 * phone photo would eat the quota fast. */
function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read that image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/** Portrait picker: shows a thumbnail + Replace/Remove once one is set, or
 * an "Add portrait" button when there isn't one yet. */
export default function ImageUpload({ value, onChange, label = "Portrait" }) {
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // so picking the same file again still fires onChange
    if (!file) return;
    try {
      onChange(await resizeImageFile(file));
    } catch (err) {
      console.error("Campaign Forge: failed to process image", err);
    }
  };

  return (
    <div className="cf-image-upload">
      {value ? (
        <div className="cf-image-upload-preview">
          <img src={value} alt="" className="cf-image-upload-thumb" />
          <div className="cf-image-upload-actions">
            <button type="button" className="cf-btn cf-btn-ghost cf-btn-small" onClick={() => inputRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="cf-btn cf-btn-danger cf-btn-small" onClick={() => onChange("")}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="cf-btn cf-btn-ghost cf-btn-small" onClick={() => inputRef.current?.click()}>
          + Add {label.toLowerCase()}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="cf-image-upload-input" onChange={handleFile} />
    </div>
  );
}
