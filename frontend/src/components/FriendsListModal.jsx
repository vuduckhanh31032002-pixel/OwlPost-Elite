import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

function BlockedListModal({ user, onClose, blockVersion, onBlockChange }) {
  const [blockedUsers, setBlockedUsers] = useState([]);

  const loadBlockedUsers = useCallback(async () => {
    try {
      const res = await API.get(`/users/blocked/${user.id}`);
      setBlockedUsers(res.data || []);
    } catch (error) {
      console.error("Load blocked users failed:", error);
      setBlockedUsers([]);
    }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBlockedUsers();
  }, [loadBlockedUsers, blockVersion]);

  const handleUnblock = async (blockedId) => {
    try {
      await API.delete("/users/block", {
        params: { blockerId: user.id, blockedId },
      });
      setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedId));
      onBlockChange?.();
    } catch (error) {
      console.error("Unblock failed:", error);
      alert("Bỏ chặn thất bại!");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Danh sách bị chặn</h3>
          <span onClick={onClose}>✖</span>
        </div>

        <div className="modal-body modal-body-centered">
          {blockedUsers.length === 0 && <p className="empty-state-centered">Chưa chặn người nào</p>}

          {blockedUsers.map((u) => (
            <div key={u.id} className="modal-user friend-request-item">
              <div className="invite-info">
                <div className="invite-name">{u.fullName}</div>
                <small>{u.email}</small>
              </div>

              <div className="invite-actions">
                <button className="btn-secondary" onClick={() => handleUnblock(u.id)}>Bỏ chặn</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BlockedListModal;
