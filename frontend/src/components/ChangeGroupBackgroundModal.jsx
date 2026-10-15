import { useState } from "react";
import API from "../services/api";

const PRESET_BACKGROUNDS = [
  { id: "ocean", name: "Xanh biển", style: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { id: "purple", name: "Tím", style: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)" },
  { id: "pink", name: "Hồng", style: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { id: "sunset", name: "Hoàng hôn", style: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
  { id: "sky", name: "Bầu trời", style: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { id: "sea", name: "Biển", style: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" },
  { id: "nature", name: "Thiên nhiên", style: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
  { id: "space", name: "Không gian", style: "linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)" },
  { id: "blue-purple", name: "Xanh-tím", style: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)" },
  { id: "pink-purple", name: "Hồng-tím", style: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)" },
  { id: "dark", name: "Nền tối", style: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" },
  { id: "light", name: "Nền sáng", style: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" },
];

const IMAGE_BACKGROUNDS = [
  { id: "img-1", name: "Ảnh 1", path: "/backgrounds/background1.jpg" },
  { id: "img-2", name: "Ảnh 2", path: "/backgrounds/background2.jpg" },
  { id: "img-3", name: "Ảnh 3", path: "/backgrounds/background3.jpg" },
  { id: "img-4", name: "Ảnh 4", path: "/backgrounds/background4.jpg" },
  { id: "img-5", name: "Ảnh 5", path: "/backgrounds/background5.jpg" },
  { id: "img-6", name: "Ảnh 6", path: "/backgrounds/background6.jpg" },
  { id: "img-7", name: "Ảnh 7", path: "/backgrounds/background7.jpg" },
  { id: "img-8", name: "Ảnh 8", path: "/backgrounds/background8.jpg" },
  { id: "img-9", name: "Ảnh 9", path: "/backgrounds/background9.jpg" },
  { id: "img-10", name: "Ảnh 10", path: "/backgrounds/background10.jpg" },
];

function ChangeGroupBackgroundModal({ room, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState("color");
  const [selectedColorBg, setSelectedColorBg] = useState(room.groupBackground || null);
  const [selectedImageBg, setSelectedImageBg] = useState(null);
  const [saving, setSaving] = useState(false);

  const isColorSelected = selectedColorBg && !selectedImageBg;
  const isImageSelected = !!selectedImageBg;

  const getPreviewStyle = () => {
    if (isImageSelected) {
      return {
        background: "none",
        backgroundImage: `url(${selectedImageBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#0f172a",
      };
    }
    if (selectedColorBg) {
      return { background: selectedColorBg };
    }
    return {};
  };

  const getSelectedValue = () => {
    if (isImageSelected) return selectedImageBg;
    return selectedColorBg || "";
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      const bodyValue = getSelectedValue();
      await API.put(`/rooms/${room.roomId}/background`, bodyValue, {
        headers: { "Content-Type": "text/plain" },
      });
      onSaved?.(bodyValue || null);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Lỗi cập nhật nền nhóm!");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await API.put(`/rooms/${room.roomId}/background`, "", {
        headers: { "Content-Type": "text/plain" },
      });
      onSaved?.(null);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Lỗi xóa nền nhóm!");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectColor = (style) => {
    setSelectedColorBg(style);
    setSelectedImageBg(null);
  };

  const handleSelectImage = (path) => {
    setSelectedImageBg(path);
    setSelectedColorBg(null);
  };

  const isSelected = (style) => selectedColorBg === style && !selectedImageBg;
  const isImageActive = (path) => selectedImageBg === path;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box change-background-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chọn nền cuộc trò chuyện</h3>
          <span onClick={onClose}>✖</span>
        </div>

        <div className="modal-body">
          <div className="background-preview-chat" style={getPreviewStyle()}>
            <div className="preview-message-wrap">
              <div className="preview-bubble preview-other">
                <p>Xin chào! 👋</p>
              </div>
              <div className="preview-bubble preview-me">
                <p>Nền này đẹp quá!</p>
              </div>
            </div>
          </div>

          <div className="background-tabs">
            <button
              className={`background-tab ${activeTab === "color" ? "active" : ""}`}
              onClick={() => setActiveTab("color")}
            >
              Nền màu
            </button>
            <button
              className={`background-tab ${activeTab === "image" ? "active" : ""}`}
              onClick={() => setActiveTab("image")}
            >
              Nền ảnh
            </button>
          </div>

          {activeTab === "color" && (
            <div className="background-grid">
              <button
                className={`background-option background-none ${!selectedColorBg && !selectedImageBg ? "active" : ""}`}
                onClick={() => { setSelectedColorBg(null); setSelectedImageBg(null); }}
                title="Không có nền"
              >
                <span className="none-icon">✕</span>
                {!selectedColorBg && !selectedImageBg && <span className="checkmark">✓</span>}
              </button>
              {PRESET_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  className={`background-option ${isSelected(bg.style) ? "active" : ""}`}
                  style={{ background: bg.style }}
                  onClick={() => handleSelectColor(bg.style)}
                  title={bg.name}
                >
                  {isSelected(bg.style) && <span className="checkmark">✓</span>}
                </button>
              ))}
            </div>
          )}

          {activeTab === "image" && (
            <div className="background-grid image-grid">
              {IMAGE_BACKGROUNDS.map((img) => (
                <button
                  key={img.id}
                  className={`background-option image-option ${isImageActive(img.path) ? "active" : ""}`}
                  onClick={() => handleSelectImage(img.path)}
                  title={img.name}
                >
                  <img src={img.path} alt={img.name} loading="lazy" />
                  {isImageActive(img.path) && <span className="checkmark image-checkmark">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          {room.groupBackground && (
            <button className="btn-secondary" onClick={handleRemove} disabled={saving}>
              Xóa nền
            </button>
          )}
          <button
            className="btn-primary"
            onClick={handleApply}
            disabled={saving || (getSelectedValue() === (room.groupBackground || ""))}
          >
            {saving ? "Đang lưu..." : "Áp dụng"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChangeGroupBackgroundModal;
