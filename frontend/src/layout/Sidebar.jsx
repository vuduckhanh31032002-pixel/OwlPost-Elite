import { useState } from "react";
import {
  FaComments,
  FaUserFriends,
  FaUsers,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaBan,
  FaTrash,
  FaSearch,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { GiOwl } from "react-icons/gi";
import Profile from "../pages/Profile";
import BlockedListModal from "../components/FriendsListModal";
import DeletedChatsModal from "../components/DeletedChatsModal";
import UserSearchModal from "../components/UserSearchModal";
import defaultAvatar from "../assets/default-avatar.png";

function Sidebar({
  user,
  onLogout,
  onUserUpdate,
  onToggleTheme,
  theme,
  onShowFriendRequests,
  onShowGroupInvites,
  friendCount,
  groupCount,
  showFriendRequests,
  showGroupInvites,
  onRoomsReload,
  blockVersion,
  onBlockChange,
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [showDeletedChats, setShowDeletedChats] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const activeSidebarItem = showProfile
    ? "profile"
    : showFriendRequests
    ? "friendRequests"
    : showGroupInvites
      ? "groupInvites"
      : "messages";

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  return (
    <>
      <div className="sidebar">
        <div className="app-mark" title="Cú Tín">
          <GiOwl />
        </div>

        <img
          src={user.avatar || defaultAvatar}
          onClick={() => setShowProfile(true)}
          className={`sidebar-avatar ${activeSidebarItem === "profile" ? "active" : ""}`}
          alt="avatar"
        />

        <button
          title="Tìm người dùng"
          onClick={() => setShowUserSearch(true)}
        >
          <FaSearch />
        </button>

        <button
          title="Tin nhắn"
          className={activeSidebarItem === "messages" ? "active" : ""}
        >
          <FaComments />
        </button>

        <div className="sidebar-icon-wrapper">
          <button
            title="Lời mời kết bạn"
            className={activeSidebarItem === "friendRequests" ? "active" : ""}
            onClick={onShowFriendRequests}
          >
            <FaUserFriends />
          </button>
          {friendCount > 0 && <span className="badge">{friendCount}</span>}
        </div>

        <button
          title="Danh sách bị chặn"
          onClick={() => setShowBlockedList(true)}
        >
          <FaBan />
        </button>

        <button
          title="Chat đã xóa"
          onClick={() => setShowDeletedChats(true)}
        >
          <FaTrash />
        </button>

        <div className="sidebar-icon-wrapper">
          <button
            title="Lời mời vào nhóm"
            className={activeSidebarItem === "groupInvites" ? "active" : ""}
            onClick={onShowGroupInvites}
          >
            <FaUsers />
          </button>
          {groupCount > 0 && <span className="badge">{groupCount}</span>}
        </div>

        <button
          title={theme === "light" ? "Chuyển nền tối" : "Chuyển nền sáng"}
          onClick={onToggleTheme}
        >
          {theme === "light" ? <FaMoon /> : <FaSun />}
        </button>

        <button title="Đăng xuất" onClick={handleLogoutClick}>
          <FaSignOutAlt />
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Xác nhận đăng xuất</h3>
              <span onClick={() => setShowLogoutConfirm(false)}>✖</span>
            </div>
            <div className="modal-body modal-body-centered">
              <p className="empty-state-centered" style={{ fontSize: "15px", color: "#374151", fontWeight: 500 }}>
                Bạn có chắc chắn muốn đăng xuất?
              </p>
              <div className="invite-actions" style={{ justifyContent: "center", marginTop: "16px" }}>
                <button className="btn-reject" onClick={() => setShowLogoutConfirm(false)}>
                  Hủy
                </button>
                <button className="btn-accept" onClick={handleLogoutConfirm}>
                  Chấp nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <Profile
          user={user}
          onClose={() => setShowProfile(false)}
          onSaved={onUserUpdate}
          onRoomsReload={onRoomsReload}
        />
      )}

      {showBlockedList && (
        <BlockedListModal
          user={user}
          onClose={() => setShowBlockedList(false)}
          blockVersion={blockVersion}
          onBlockChange={onBlockChange}
        />
      )}

      {showDeletedChats && (
        <DeletedChatsModal
          user={user}
          onClose={() => setShowDeletedChats(false)}
          onRoomRestored={onRoomsReload}
        />
      )}

      {showUserSearch && (
        <UserSearchModal
          user={user}
          onClose={() => setShowUserSearch(false)}
        />
      )}
    </>
  );
}

export default Sidebar;
