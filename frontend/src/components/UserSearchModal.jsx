import { useState, useEffect, useCallback, useRef } from "react";
import API from "../services/api";

function UserSearchModal({ user, onClose }) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const handleSearch = useCallback(async (searchKeyword) => {
    const query = searchKeyword.trim().toLowerCase();
    if (!query) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await API.get(`/users/search?keyword=${query}&currentUserId=${user.id}`);
      setResults(res.data || []);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!keyword.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(keyword);
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [keyword, handleSearch]);

  const handleChat = async (targetUserId) => {
    try {
      const res = await API.get(`/rooms/find-private`, {
        params: { user2Id: targetUserId },
      });

      if (res.data && res.data.roomId) {
        onClose();
        window.dispatchEvent(new CustomEvent("openRoom", { detail: res.data }));
      } else {
        const createRes = await API.post("/rooms/private", null, {
          params: { user2Id: targetUserId },
        });
        onClose();
        window.dispatchEvent(new CustomEvent("openRoom", { detail: { roomId: createRes.data } }));
      }
    } catch (error) {
      console.error("Open chat failed:", error);
      alert("Mở chat thất bại!");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-zalo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header add-friend-header">
          <h3>Tìm người dùng</h3>
          <button type="button" className="add-friend-close" onClick={onClose} aria-label="Đóng">
            ✖
          </button>
        </div>

        <div className="modal-body add-friend-body">
          <div className="modal-search add-friend-search">
            <input
              placeholder="Nhập tên hoặc email"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button onClick={() => handleSearch(keyword)} disabled={loading}>
              {loading ? "..." : "Tìm kiếm"}
            </button>
          </div>

          <div className="modal-list add-friend-results">
            {loading && <p className="empty-state-centered">Đang tìm...</p>}
            {!loading && results.length === 0 && keyword.trim() && (
              <p className="empty-state-centered">Không tìm thấy người dùng</p>
            )}
            {results.map((u) => (
              <div key={u.id} className="modal-user add-friend-user">
                <img src={u.avatar || "/src/assets/default-avatar.png"} alt={u.fullName} />
                <div className="add-friend-user-info">
                  <div className="add-friend-user-name">{u.fullName}</div>
                  <small>{u.email}</small>
                </div>
                <button className="add-friend-btn" onClick={() => handleChat(u.id)}>Nhắn tin</button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserSearchModal;
