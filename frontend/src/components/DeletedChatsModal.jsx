import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

function DeletedChatsModal({ user, onClose, onRoomRestored }) {
  const [deletedRooms, setDeletedRooms] = useState([]);
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState(null);

  const loadDeletedRooms = useCallback(async () => {
    try {
      const res = await API.get(`/rooms/deleted`);
      setDeletedRooms(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Load deleted rooms failed:", error);
      setDeletedRooms([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDeletedRooms();
  }, [loadDeletedRooms]);

  const handleRestore = async (roomId) => {
    try {
      const res = await API.post(`/rooms/${roomId}/restore`);
      console.log("[RESTORE OK]", roomId, res.status, res.data);
      setDeletedRooms((prev) => prev.filter((r) => r.roomId !== roomId));
      onRoomRestored?.();
      window.dispatchEvent(new CustomEvent("roomRestored", { detail: { roomId } }));
    } catch (error) {
      console.error("[RESTORE FAIL]", roomId, error.response?.status, error.response?.data, error.message);
      const reason = error.response?.data || error.message || "unknown";
      alert(`Khôi phục thất bại!\nRoomId: ${roomId}\nLý do: ${reason}`);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmPermanentDelete) return;
    const roomId = confirmPermanentDelete.roomId;
    try {
      await API.delete(`/rooms/${roomId}/permanent`);
      setDeletedRooms((prev) => prev.filter((r) => r.roomId !== roomId));
      setConfirmPermanentDelete(null);
      onRoomRestored?.();
    } catch (error) {
      console.error("Permanent delete failed:", error);
      alert("Xóa hoàn toàn thất bại!");
    }
  };

  const getRoomName = (room) => {
    if (!room.isPrivate) return room.groupName || "Nhóm";
    const other = room.members?.find((m) => m.id !== user.id);
    return other?.fullName || other?.id || "Cuộc trò chuyện";
  };

  const getRoomAvatar = (room) => {
    if (!room.isPrivate) return room.groupAvatar || null;
    const other = room.members?.find((m) => m.id !== user.id);
    return other?.avatar || null;
  };

  const getRoomAvatarLabel = (room) => {
    const name = getRoomName(room);
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chat đã xóa</h3>
          <span onClick={onClose}>✖</span>
        </div>

        <div className="modal-body modal-body-centered">
          {deletedRooms.length === 0 && (
            <p className="empty-state-centered">Không có chat đã xóa</p>
          )}

          {deletedRooms.map((room) => (
            <div key={room.roomId} className="modal-user friend-request-item">
              {getRoomAvatar(room) ? (
                <img src={getRoomAvatar(room)} alt="" className="invite-avatar" />
              ) : (
                <div className="invite-avatar-placeholder">{getRoomAvatarLabel(room)}</div>
              )}

              <div className="invite-info">
                <div className="invite-name">{getRoomName(room)}</div>
                <small>{room.isPrivate ? "Chat riêng tư" : "Nhóm"}</small>
              </div>

              <div className="invite-actions">
                <button
                  className="btn-secondary"
                  onClick={() => handleRestore(room.roomId)}
                >
                  Khôi phục
                </button>
                <button
                  className="btn-danger"
                  onClick={() => setConfirmPermanentDelete(room)}
                >
                  Xóa hoàn toàn
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {confirmPermanentDelete && (
        <div className="modal-overlay confirm-overlay" onClick={() => setConfirmPermanentDelete(null)}>
          <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Xác nhận xóa hoàn toàn</h3>
              <span onClick={() => setConfirmPermanentDelete(null)}>✖</span>
            </div>
            <div className="modal-body">
              <p className="confirm-message">
                Bạn có chắc chắn muốn xóa vĩnh viễn cuộc hội thoại này không?
              </p>
              <div className="confirm-actions">
                <button className="btn-danger" onClick={handlePermanentDelete}>
                  Xóa hoàn toàn
                </button>
                <button className="btn-secondary" onClick={() => setConfirmPermanentDelete(null)}>
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeletedChatsModal;
