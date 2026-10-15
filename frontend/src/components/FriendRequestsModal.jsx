import { useEffect, useState, useCallback } from "react";
import API from "../services/api";

function FriendRequestsModal({ user, onClose, onAccepted, friendVersion }) {
  const [requests, setRequests] = useState([]);

  const loadRequests = useCallback(async () => {
    try {
      const res = await API.get(`/friends/pending`);
      setRequests(res.data || []);
    } catch (error) {
      console.error("Load requests failed:", error);
      setRequests([]);
    }
  }, [friendVersion]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests();
  }, [loadRequests, friendVersion]);

  const handleAccept = async (id) => {
    try {
      await API.post(`/friends/accept/${id}`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      await new Promise((resolve) => setTimeout(resolve, 250));
      onAccepted?.();
    } catch (error) {
      console.error("Accept failed:", error);
      alert("Chấp nhận lời mời thất bại!");
    }
  };

  const handleReject = async (id) => {
    try {
      await API.post(`/friends/reject/${id}`);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Reject failed:", error);
      alert("Từ chối lời mời thất bại!");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Lời mời kết bạn</h3>
          <span onClick={onClose}>✖</span>
        </div>

          <div className="modal-body modal-body-centered">
          {requests.length === 0 && <p className="empty-state-centered">Không có lời mời</p>}

          {requests.map((r) => (
            <div key={r.id} className="modal-user friend-request-item">
              <div className="invite-info">
                <div className="invite-name">{r.sender.fullName}</div>
                <small>{r.sender.email}</small>
              </div>

              <div className="invite-actions">
                <button className="btn-accept" onClick={() => handleAccept(r.id)}>Chấp nhận</button>
                <button className="btn-reject" onClick={() => handleReject(r.id)}>Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FriendRequestsModal;
