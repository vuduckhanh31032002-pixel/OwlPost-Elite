import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import API from "../services/api";

function ChangeGroupAvatarModal({ room, onClose, onSaved }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageSrc(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async () => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
    );

    return canvas.toDataURL("image/jpeg");
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      alert("Vui lòng chọn ảnh");
      return;
    }

    setSaving(true);
    try {
      const croppedImage = await getCroppedImg();
      await API.put(`/rooms/${room.roomId}/avatar`, croppedImage, {
        headers: { "Content-Type": "text/plain" },
      });
      onSaved?.(croppedImage);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Lỗi cập nhật ảnh nhóm!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box change-avatar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Đổi ảnh nhóm</h3>
          <span onClick={onClose}>✖</span>
        </div>

        <div className="modal-body">
          {imageSrc ? (
            <div className="cropper-container">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
              <div className="cropper-controls">
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="zoom-slider"
                />
              </div>
            </div>
          ) : (
            <div className="avatar-upload-area">
              <div className="current-avatar-preview">
                {room.groupAvatar ? (
                  <img src={room.groupAvatar} alt="current avatar" />
                ) : (
                  <div className="avatar-placeholder">
                    {(room.groupName || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <label className="upload-btn">
                Chọn ảnh từ máy
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          {imageSrc && (
            <>
              <button
                className="btn-secondary"
                onClick={() => {
                  setImageSrc(null);
                  setCroppedAreaPixels(null);
                }}
                disabled={saving}
              >
                Chọn ảnh khác
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChangeGroupAvatarModal;
