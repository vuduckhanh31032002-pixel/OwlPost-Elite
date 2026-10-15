import { useState, useEffect, useCallback, useRef } from "react";
import API from "../services/api";

function SearchUserModal({ user, onClose, friendVersion }) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState(new Set());
  const [pendingRequests, setPendingRequests] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const loadFriends = useCallback(async () => {
    try {
      const res = await API.get(`/friends`);
      const friendIds = new Set((res.data || []).map((f) => f.id));
      setFriends(friendIds);
    } catch (error) {
      console.error("Load friends failed:", error);
    }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    try {
      const res = await API.get(`/friends/pending`);
      const pendingIds = new Set((res.data || []).map((r) => r.receiver.id));
      setPendingRequests(pendingIds);
    } catch (error) {
      console.error("Load pending requests failed:", error);
    }
  }, []);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFriends();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPendingRequests();
  }, [loadFriends, loadPendingRequests, friendVersion]);

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

  const handleAdd = async (id) => {
    try {
      await API.post(`/friends/request?receiverId=${id}`);
      setPendingRequests((prev) => new Set([...prev, id]));
      alert("Đã gửi lời mời");
    } catch (error) {
      console.error("Add friend failed:", error);
      if (error.response?.status === 500) {
        alert("Đã gửi lời mời trước đó hoặc đã là bạn!");
      } else {
        alert("Có lỗi xảy ra!");
      }
    }
  };

  const getButtonState = (userId) => {
    if (friends.has(userId)) return "friends";
    if (pendingRequests.has(userId)) return "pending";
    return "add";
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-zalo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header add-friend-header">
          <h3>Thêm bạn</h3>
          <button type="button" className="add-friend-close" onClick={onClose} aria-label="Đóng">
            ✖
          </button>
        </div>

        <div className="modal-body add-friend-body">
          <div className="modal-search add-friend-search">
            <input
              placeholder="Nhập tên hoặc gmail"
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
            {results.map((u) => {
              const buttonState = getButtonState(u.id);
              return (
                <div key={u.id} className="modal-user add-friend-user">
                  <img src={u.avatar || "/src/assets/default-avatar.png"} alt={u.fullName} />
                  <div className="add-friend-user-info">
                    <div className="add-friend-user-name">{u.fullName}</div>
                    <small>{u.email}</small>
                  </div>
                  {buttonState === "friends" && (
                    <span className="friend-status-badge">Đã là bạn bè</span>
                  )}
                  {buttonState === "pending" && (
                    <span className="friend-status-badge">Đã gửi lời mời</span>
                  )}
                  {buttonState === "add" && (
                    <button className="add-friend-btn" onClick={() => handleAdd(u.id)}>Kết bạn</button>
                  )}
                </div>
              );
            })}
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

export default SearchUserModal;
