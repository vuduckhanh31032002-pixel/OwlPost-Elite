import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

function GroupInvitesModal({ user, onClose, onAccepted, groupInviteVersion }) {
  const [invites, setInvites] = useState([]);

  const loadInvites = useCallback(async () => {
    try {
      const res = await API.get(`/rooms/invites`);
      setInvites(res.data || []);
    } catch (error) {
      console.error("Load group invites failed:", error);
      setInvites([]);
    }
  }, [groupInviteVersion]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInvites();
  }, [loadInvites, groupInviteVersion]);

  const handleAccept = async (inviteId) => {
    try {
      await API.post(`/rooms/invites/accept/${inviteId}`);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      if (onAccepted) onAccepted();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi chấp nhận lời mời");
    }
  };

  const handleReject = async (inviteId) => {
    try {
      await API.delete(`/rooms/invites/reject/${inviteId}`);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      console.error(err);
      alert("Lỗi khi từ chối lời mời");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Lời mời vào nhóm</h3>
          <span onClick={onClose}>✖</span>
        </div>

        <div className="modal-body modal-body-centered">
          {invites.length === 0 && <p className="empty-state-centered">Không có lời mời</p>}

          {invites.map((invite) => (
            <div key={invite.id} className="modal-user friend-request-item">
              <div className="invite-info">
                <div className="invite-name">{invite.room.groupName}</div>
                <small>Mời bởi: {invite.sender.fullName}</small>
              </div>

              <div className="invite-actions">
                <button className="btn-accept" onClick={() => handleAccept(invite.id)}>Chấp nhận</button>
                <button className="btn-reject" onClick={() => handleReject(invite.id)}>Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GroupInvitesModal;
