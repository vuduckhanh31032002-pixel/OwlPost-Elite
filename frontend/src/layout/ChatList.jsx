import { useEffect, useState, useCallback, useRef } from "react";
import { FaSearch, FaUserPlus, FaUsersCog, FaFire, FaEllipsisV, FaUserTimes, FaTrash, FaSignOutAlt, FaUserPlus as FaUserPlusIcon } from "react-icons/fa";
import API from "../services/api";
import SearchUserModal from "../components/SearchUserModal";
import CreateGroupModal from "../components/CreateGroupModal";
import defaultAvatar from "../assets/default-avatar.png";

function ChatList({ user, onSelectRoom, reloadTrigger, onBlockChange, friendVersion, rooms: roomsProp, unreadByRoom: unreadByRoomProp }) {
  const [rooms, setRooms] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [friends, setFriends] = useState(new Set());
  const [pendingFriends, setPendingFriends] = useState(new Set());
  const menuRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Array.isArray(roomsProp)) {
      setRooms(roomsProp);
    }
  }, [roomsProp]);

  const loadRooms = useCallback(async () => {
    try {
      const res = await API.get(`/rooms`);
      const list = Array.isArray(res.data) ? res.data : [];
      setRooms(list);
    } catch (error) {
      console.error("Load rooms failed:", error);
      setRooms([]);
    }
  }, [user.id]);

  const loadFriends = useCallback(async () => {
    try {
      const res = await API.get(`/friends`);
      const friendIds = new Set((res.data || []).map((f) => f.id));
      setFriends(friendIds);
    } catch (error) {
      console.error("Load friends failed:", error);
    }
  }, []);

  const loadPendingFriends = useCallback(async () => {
    try {
      const res = await API.get(`/friends/pending`);
      const pendingIds = new Set((res.data || []).map((r) => r.receiver.id));
      setPendingFriends(pendingIds);
    } catch (error) {
      console.error("Load pending friends failed:", error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRooms();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFriends();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPendingFriends();
  }, [user.id, reloadTrigger, loadRooms, loadFriends, loadPendingFriends, friendVersion]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getOtherMemberId = (room) => {
    const members = Array.isArray(room.members) ? room.members : [];
    const other = members.find((m) => {
      const id = typeof m === "string" ? null : m?.id;
      return id && id !== user.id;
    });
    return other ? (typeof other === "object" ? other.id : null) : null;
  };

  const handleUnfriend = async () => {
    if (!confirmAction) return;
    const friendId = getOtherMemberId(confirmAction.room);
    if (!friendId) return;
    try {
      await API.delete("/friends", {
        params: { userId: user.id, friendId },
      });
      setConfirmAction(null);
      setOpenMenuId(null);
      setFriends((prev) => {
        const newFriends = new Set(prev);
        newFriends.delete(friendId);
        return newFriends;
      });
      loadRooms();
    } catch (error) {
      console.error("Unfriend failed:", error);
      alert("Hủy kết bạn thất bại!");
    }
  };

  const handleDeleteConversation = async () => {
    if (!confirmAction) return;
    try {
      await API.delete(`/rooms/${confirmAction.room.roomId}/delete`);
      setConfirmAction(null);
      setOpenMenuId(null);
      loadRooms();
    } catch (error) {
      console.error("Delete conversation failed:", error);
      alert("Xóa cuộc hội thoại thất bại!");
    }
  };

  const handleBlockUser = async () => {
    if (!confirmAction) return;
    const blockedId = getOtherMemberId(confirmAction.room);
    if (!blockedId) return;
    try {
      await API.post("/users/block", null, {
        params: { blockerId: user.id, blockedId },
      });
      setConfirmAction(null);
      setOpenMenuId(null);
      loadRooms();
      onBlockChange?.();
    } catch (error) {
      console.error("Block user failed:", error);
      alert("Chặn người dùng thất bại!");
    }
  };

  const handleAddFriend = async (targetUserId) => {
    try {
      await API.post(`/friends/request?receiverId=${targetUserId}`);
      setPendingFriends((prev) => new Set([...prev, targetUserId]));
      alert("Đã gửi lời mời kết bạn");
    } catch (error) {
      console.error("Add friend failed:", error);
      if (error.response?.status === 500) {
        alert("Đã gửi lời mời trước đó hoặc đã là bạn!");
      } else {
        alert("Có lỗi xảy ra!");
      }
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirmAction) return;
    try {
      await API.delete(`/rooms/${confirmAction.room.roomId}/leave`);
      setConfirmAction(null);
      setOpenMenuId(null);
      loadRooms();
    } catch (error) {
      console.error("Leave group failed:", error);
      alert("Rời nhóm thất bại!");
    }
  };

  const getPrivateRoomName = (room) => {
    const members = Array.isArray(room.members) ? room.members : [];
    const otherMember = members.find((m) => {
      const name = typeof m === "string" ? m : m?.fullName;
      return name && name.trim() !== user.fullName?.trim();
    });

    if (typeof otherMember === "string") return { name: otherMember, avatar: null };
    if (otherMember && typeof otherMember === "object") {
      return { name: otherMember.fullName || otherMember.email || "Cuộc trò chuyện", avatar: otherMember.avatar || null };
    }
    return { name: "Cuộc trò chuyện", avatar: null };
  };

  const filteredRooms = rooms.filter((room) => {
    const name = (room.isPrivate ? getPrivateRoomName(room).name : room.groupName || "").trim().toLowerCase();
    const query = keyword.trim().toLowerCase();

    if (!query) return true;

    return name.startsWith(query);
  });

  const getRoomAvatar = (room) => {
    if (room.isPrivate) {
      const other = getPrivateRoomName(room);
      if (other.avatar) return other.avatar;
      const members = Array.isArray(room.members) ? room.members : [];
      const otherMember = members.find((m) => {
        const name = typeof m === "string" ? m : m?.fullName;
        return name && name.trim() !== user.fullName?.trim();
      });
      if (otherMember && typeof otherMember === "object" && otherMember.avatar) return otherMember.avatar;
      return null;
    }
    return room.groupAvatar || null;
  };

  const getRoomAvatarLabel = (room) => {
    if (room.isPrivate) {
      const other = getPrivateRoomName(room);
      return other.name?.trim()?.charAt(0)?.toUpperCase() || "?";
    }
    return (room.groupName || "?").trim().charAt(0).toUpperCase();
  };

  const renderConfirmDialog = () => {
    if (!confirmAction) return null;

    const configs = {
      unfriend: {
        message: `Bạn có chắc chắn muốn hủy kết bạn với ${confirmAction.name} không?`,
        action: handleUnfriend,
        label: "Hủy kết bạn",
      },
      delete: {
        message: `Bạn có chắc chắn muốn xóa cuộc hội thoại với ${confirmAction.name} không?`,
        action: handleDeleteConversation,
        label: "Xóa",
      },
      block: {
        message: `Bạn có chắc chắn muốn chặn ${confirmAction.name} không?`,
        action: handleBlockUser,
        label: "Chặn",
      },
      leave: {
        message: `Bạn có chắc chắn muốn rời nhóm ${confirmAction.name} không?`,
        action: handleLeaveGroup,
        label: "Rời nhóm",
      },
    };

    const config = configs[confirmAction.type];
    if (!config) return null;

    return (
      <div className="modal-overlay confirm-overlay" onClick={() => setConfirmAction(null)}>
        <div className="modal-box confirm-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Xác nhận</h3>
            <span onClick={() => setConfirmAction(null)}>✖</span>
          </div>
          <div className="modal-body">
            <p className="confirm-message">{config.message}</p>
            <div className="confirm-actions">
              <button className="btn-reject" onClick={config.action}>{config.label}</button>
              <button className="btn-secondary" onClick={() => setConfirmAction(null)}>Hủy</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chatlist">
      <div className="chatlist-brand">
        <div>
          <h3>OwlPost Elite</h3>
          <p>Owl-powered social messaging</p>
        </div>
        <div className="trend-pill">
          <FaFire /> Trực tuyến
        </div>
      </div>

      <div className="chatlist-header">
        <div className="search-wrapper">
          <FaSearch />
          <input
            placeholder="Tìm kiếm cuộc trò chuyện"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div className="chat-icons">
          <button onClick={() => setShowSearch(true)} title="Thêm bạn bè">
            <FaUserPlus />
          </button>
          <button onClick={() => setShowGroup(true)} title="Tạo nhóm">
            <FaUsersCog />
          </button>
        </div>
      </div>

      {filteredRooms.length === 0 && keyword.trim() && (
        <div className="empty-search-state">Không tìm thấy cuộc trò chuyện</div>
      )}

      {filteredRooms.map((room) => {
        const displayName = room.isPrivate ? getPrivateRoomName(room).name : room.groupName;
        const avatarUrl = getRoomAvatar(room);
        const isMenuOpen = openMenuId === room.roomId;
        const unread = unreadByRoomProp?.[String(room.roomId)] || 0;

        return (
          <div
            key={room.roomId}
            className={`chat-item ${selectedRoomId === room.roomId ? "active" : ""} ${isMenuOpen ? "menu-open" : ""}`}
            onClick={() => {
              setSelectedRoomId(room.roomId);
              onSelectRoom(room);
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="chat-avatar-img" />
            ) : (
              <div className="chat-avatar">{getRoomAvatarLabel(room)}</div>
            )}

            <div className="chat-info">
              <div className="chat-name">{displayName}</div>
              <div className="chat-last">
                {room.lastMessage || "Bắt đầu cuộc trò chuyện mới"}
              </div>
            </div>

            {unread > 0 && (
              <span className="chat-unread-badge">{unread > 99 ? "99+" : unread}</span>
            )}

            <button
              className="chat-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(isMenuOpen ? null : room.roomId);
              }}
              title="Tùy chọn"
            >
              <FaEllipsisV />
            </button>

            {isMenuOpen && (
              <div className="chat-dropdown-menu" ref={menuRef}>
                {room.isPrivate ? (() => {
                  const otherUserId = getOtherMemberId(room);
                  const isFriend = friends.has(otherUserId);
                  const isPending = pendingFriends.has(otherUserId);
                  return (
                    <>
                      {isFriend ? (
                        <button className="dropdown-item" onClick={() => setConfirmAction({ type: "unfriend", name: displayName, room })}>
                          <FaUserTimes /> Hủy kết bạn
                        </button>
                      ) : isPending ? (
                        <button className="dropdown-item" disabled>
                          <FaUserPlusIcon /> Đã gửi lời mời
                        </button>
                      ) : (
                        <button className="dropdown-item" onClick={() => otherUserId && handleAddFriend(otherUserId)}>
                          <FaUserPlusIcon /> Kết bạn
                        </button>
                      )}
                      <button className="dropdown-item" onClick={() => setConfirmAction({ type: "delete", name: displayName, room })}>
                        <FaTrash /> Xóa đoạn hội thoại
                      </button>
                      <button className="dropdown-item" onClick={() => setConfirmAction({ type: "block", name: displayName, room })}>
                        <FaSignOutAlt /> Chặn người
                      </button>
                    </>
                  );
                })() : (
                  <>
                    <button className="dropdown-item" onClick={() => setConfirmAction({ type: "leave", name: displayName, room })}>
                      <FaSignOutAlt /> Rời nhóm
                    </button>
                    <button className="dropdown-item" onClick={() => setConfirmAction({ type: "delete", name: displayName, room })}>
                      <FaTrash /> Xóa cuộc hội thoại
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {showSearch && (
        <SearchUserModal
          user={user}
          onClose={() => {
            setShowSearch(false);
            loadRooms();
          }}
          friendVersion={friendVersion}
        />
      )}

      {showGroup && (
        <CreateGroupModal
          user={user}
          onClose={() => {
            setShowGroup(false);
            loadRooms();
          }}
        />
      )}

      {renderConfirmDialog()}
    </div>
  );
}

export default ChatList;
