import { useState } from "react";
import API from "../services/api";

function RenameGroupModal({ room, onClose, onSaved }) {
  const [name, setName] = useState(room.groupName || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Vui lòng nhập tên nhóm");
      return;
    }

    setSaving(true);
    try {
      await API.put(`/rooms/${room.roomId}/rename?name=${encodeURIComponent(name.trim())}`);
      onSaved?.(name.trim());
      onClose();
    } catch (err) {
      console.error(err);
      alert("Lỗi đổi tên nhóm!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box rename-group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Đổi tên nhóm</h3>
          <span onClick={onClose}>✖</span>
        </div>

        <div className="modal-body">
          <label className="field-label">Tên nhóm mới</label>
          <input
            className="auth-input"
            type="text"
            placeholder="Nhập tên nhóm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RenameGroupModal;
