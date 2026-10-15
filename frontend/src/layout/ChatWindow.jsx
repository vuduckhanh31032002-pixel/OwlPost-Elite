import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { FaPaperPlane, FaPaperclip, FaTimesCircle, FaFacebookMessenger, FaSlidersH, FaSearch, FaUsers, FaRegImages, FaRegFileAlt, FaRocket, FaSmile, FaEdit, FaImage, FaPalette, FaLink, FaBan, FaSpinner } from "react-icons/fa";
import { SiZalo } from "react-icons/si";
import API from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";
import MessageBubble from "../components/MessageBubble";
import EmojiPicker from "../components/EmojiPicker";
import RenameGroupModal from "../components/RenameGroupModal";
import ChangeGroupAvatarModal from "../components/ChangeGroupAvatarModal";
import ChangeGroupBackgroundModal from "../components/ChangeGroupBackgroundModal";

const MAX_MEDIA_SIZE = 50 * 1024 * 1024;
const PAGE_SIZE = 50;
const isImageOrVideo = (url = "") => {
  const lower = url.toLowerCase();
  return lower.startsWith("data:image/") || lower.startsWith("data:video/") || [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".mp4", ".webm", ".ogg", ".mov", ".mkv"].some((ext) => lower.includes(ext));
};
const extractLinks = (text = "") => text.match(/https?:\/\/[^\s]+/g) || [];

function ChatWindow({ user, room, sendRoomId, onRoomUpdated, blockVersion, onBlockChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showRoomPanel, setShowRoomPanel] = useState(true);
  const [activeTab, setActiveTab] = useState("members");
  const [panelQuery, setPanelQuery] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(room);
  const [blockStatus, setBlockStatus] = useState({ iBlocked: false, blockedBy: false });
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const prevUserAvatarRef = useRef(user?.avatar);
  const currentRoomRef = useRef(currentRoom);
  const isAtBottomRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const pageLoadingRef = useRef(false);
  const pendingRestoreRef = useRef(false);
  const scrollRestoreRef = useRef({ oldScrollTop: 0, oldScrollHeight: 0 });
  const messagesRef = useRef([]);
  const hasMoreRef = useRef(false);

  useEffect(() => {
    setCurrentRoom(room);
  }, [room]);

  useEffect(() => {
    if (!currentRoom) {
      setMessages([]);
      hasMoreRef.current = false;
      return;
    }

    let cancelled = false;
    pageLoadingRef.current = true;

    const load = async () => {
      try {
        const res = await API.get(`/messages/${currentRoom.roomId}`, {
          params: { size: PAGE_SIZE },
        });
        const fetchedDesc = Array.isArray(res.data) ? res.data : [];
        const currentAsc = [...fetchedDesc].reverse();

        let crossAsc = [];
        if (currentRoom.isPrivate && user) {
          const members = Array.isArray(currentRoom.members) ? currentRoom.members : [];
          const other = members.find((m) => {
            const id = typeof m === "string" ? null : m?.id;
            return id && id !== user.id;
          });
          const otherId = other ? (typeof other === "object" ? other.id : null) : null;

          if (otherId) {
            try {
              const deletedRes = await API.get(`/rooms/deleted`);
              const deletedRooms = deletedRes.data || [];
              const selectedTime = currentRoom.createdAt ? new Date(currentRoom.createdAt).getTime() : null;
              const samePeerRoom = deletedRooms.find((r) => {
                if (!r.isPrivate) return false;
                if (r.roomId === currentRoom.roomId) return false;
                const other2 = r.members?.find((m) => m.id !== user.id);
                if (!other2 || other2.id !== otherId) return false;
                if (selectedTime != null && r.createdAt) {
                  const hiddenTime = new Date(r.createdAt).getTime();
                  return hiddenTime > selectedTime;
                }
                return r.roomId > currentRoom.roomId;
              });

              if (samePeerRoom) {
                const msgRes = await API.get(`/messages/${samePeerRoom.roomId}`, {
                  params: { size: PAGE_SIZE },
                });
                const crossDesc = Array.isArray(msgRes.data) ? msgRes.data : [];
                crossAsc = [...crossDesc].reverse();
              }
            } catch (e) {
              console.error("[CROSS ROOM LOAD ERROR]", e);
            }
          }
        }

        if (cancelled) return;

        const merged = [...currentAsc, ...crossAsc];
        merged.sort((a, b) => new Date(a.sentTime).getTime() - new Date(b.sentTime).getTime());
        setMessages(merged);
        hasMoreRef.current = currentAsc.length >= PAGE_SIZE;
        isAtBottomRef.current = true;
      } catch {
        if (!cancelled) {
          setMessages([]);
          hasMoreRef.current = false;
        }
      } finally {
        if (!cancelled) {
          pageLoadingRef.current = false;
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      pageLoadingRef.current = false;
    };
  }, [currentRoom, user.id]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    connectSocket(currentRoom?.roomId, (msg) => setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])));
    return () => disconnectSocket();
  }, [currentRoom?.roomId]);

  useEffect(() => {
    currentRoomRef.current = currentRoom;
  }, [currentRoom]);

  useEffect(() => {
    const handleNewMessage = (e) => {
      const detail = e.detail;
      if (!detail) return;
      const incomingRoomId = detail.roomId;
      const message = detail.message;
      if (!incomingRoomId || !message) return;

      const room = currentRoomRef.current;
      const isSameRoom = room && String(room.roomId) === String(incomingRoomId);

      if (isSameRoom) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      } else if (detail.crossRoom && room) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    window.addEventListener("newMessage", handleNewMessage);
    return () => window.removeEventListener("newMessage", handleNewMessage);
  }, []);

  const loadOlder = useCallback(async () => {
    const room = currentRoomRef.current;
    if (!room || loadingMoreRef.current || !hasMoreRef.current) return;
    const container = messagesContainerRef.current;
    const currentMessages = messagesRef.current;
    if (currentMessages.length === 0) return;

    loadingMoreRef.current = true;

    const oldScrollTop = container ? container.scrollTop : 0;
    const oldScrollHeight = container ? container.scrollHeight : 0;

    try {
      const oldest = currentMessages[0];
      const res = await API.get(`/messages/${room.roomId}`, {
        params: { size: PAGE_SIZE, lastId: oldest.id },
      });
      const olderDesc = Array.isArray(res.data) ? res.data : [];
      const olderAsc = [...olderDesc].reverse();

      if (olderAsc.length > 0) {
        scrollRestoreRef.current = { oldScrollTop, oldScrollHeight };
        pendingRestoreRef.current = true;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const deduped = olderAsc.filter((m) => !existingIds.has(m.id));
          return deduped.length > 0 ? [...deduped, ...prev] : prev;
        });
        hasMoreRef.current = olderAsc.length >= PAGE_SIZE;
      } else {
        hasMoreRef.current = false;
      }
    } catch {
      hasMoreRef.current = false;
    } finally {
      loadingMoreRef.current = false;
    }
  }, []);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
    if (isAtBottomRef.current) return;
    if (scrollTop <= 20 && hasMoreRef.current && !loadingMoreRef.current && !pageLoadingRef.current) {
      void loadOlder();
    }
  }, [loadOlder]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (pendingRestoreRef.current && messagesContainerRef.current) {
      pendingRestoreRef.current = false;
      const { oldScrollTop, oldScrollHeight } = scrollRestoreRef.current;
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
    }
  }, [messages]);

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!currentRoom || currentRoom.isPrivate) return;
    setBlockStatus({ iBlocked: false, blockedBy: false });
  }, [currentRoom]);

  useEffect(() => {
    if (!currentRoom || !currentRoom.isPrivate) return;
    const members = Array.isArray(currentRoom.members) ? currentRoom.members : [];
    const otherMember = members.find((m) => {
      const id = typeof m === "string" ? null : m?.id;
      return id && id !== user.id;
    });
    const otherUserId = typeof otherMember === "object" ? otherMember?.id : null;
    if (!otherUserId) return;

    API.get("/users/block-status", { params: { userId: user.id, otherUserId } })
      .then((res) => setBlockStatus(res.data))
      .catch(() => setBlockStatus({ iBlocked: false, blockedBy: false }));
  }, [currentRoom, user.id, blockVersion]);

  const handleUnblock = async () => {
    const members = Array.isArray(currentRoom?.members) ? currentRoom.members : [];
    const otherMember = members.find((m) => {
      const id = typeof m === "string" ? null : m?.id;
      return id && id !== user.id;
    });
    const otherUserId = typeof otherMember === "object" ? otherMember?.id : null;
    if (!otherUserId) return;

    try {
      await API.delete("/users/block", { params: { blockerId: user.id, blockedId: otherUserId } });
      setBlockStatus({ iBlocked: false, blockedBy: false });
      onBlockChange?.();
    } catch (error) {
      console.error("Unblock failed:", error);
      alert("Bỏ chặn thất bại!");
    }
  };

  useEffect(() => {
    if (prevUserAvatarRef.current !== user?.avatar && user?.avatar) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender?.id === user.id ? { ...msg, sender: { ...msg.sender, avatar: user.avatar } } : msg
        )
      );
    }
    prevUserAvatarRef.current = user?.avatar;
  }, [user?.avatar, user?.id]);

  useEffect(() => {
    if (!showEmoji) return;
    const handleClick = (e) => {
      const target = e.target;
      if (target.closest(".emoji-picker-wrap") || target.closest(".emoji-btn")) return;
      setShowEmoji(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmoji]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const handleChooseFile = () => fileInputRef.current?.click();
  const processFile = (file) => {
    const isImage = file.type.startsWith("image/"); const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { alert("Chỉ hỗ trợ ảnh hoặc video."); return; }
    if (file.size > MAX_MEDIA_SIZE) {
      alert("File quá lớn. Vui lòng chọn ảnh/video nhỏ hơn 50MB.");
      return;
    }
    uploadFile(file);
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await API.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreviewFile({
        name: res.data.filename,
        type: res.data.contentType,
        url: res.data.url,
        size: res.data.size,
      });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload thất bại!");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    processFile(file); e.target.value = "";
  };
  const handlePaste = (e) => {
    const files = Array.from(e.clipboardData?.files || []);
    const imageFile = files.find((file) => file.type.startsWith("image/"));
    if (!imageFile) return;
    e.preventDefault();
    processFile(imageFile);
  };
  const clearPreview = () => { setPreviewFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; };

  const handleSend = async () => {
    if (!input.trim() && !previewFile) return;
    setIsSending(true);
    try {
      const targetRoomId = sendRoomId || currentRoom.roomId;
      const res = await API.post("/messages/send", { roomId: targetRoomId, senderId: user.id, content: input, imageUrl: previewFile?.url || null });
      setMessages((prev) => (prev.some((m) => m.id === res.data.id) ? prev : [...prev, res.data]));
    } catch (error) {
      console.error("Send message failed:", error); alert("Gửi tin nhắn thất bại!");
    } finally { setInput(""); clearPreview(); setIsSending(false); }
  };

  const members = useMemo(() => {
    const list = Array.isArray(currentRoom?.members) ? currentRoom.members : [];
    return list.map((m) => {
      const name = typeof m === "string" ? m : m?.fullName || m?.email || "?";
      return { name, role: name === user.fullName ? "Bạn" : "Member" };
    });
  }, [currentRoom, user.fullName]);
  const mediaItems = useMemo(() => messages.filter((m) => m.imageUrl && isImageOrVideo(m.imageUrl)), [messages]);
  const fileItems = useMemo(() => messages.filter((m) => m.imageUrl && !isImageOrVideo(m.imageUrl)), [messages]);
  const linkItems = useMemo(() => { const result = []; messages.forEach((m) => extractLinks(m.content || "").forEach((link) => result.push({ id: `${m.id}-${link}`, link, sender: m.sender }))); return result; }, [messages]);
  const normalizedQuery = panelQuery.trim().toLowerCase();
  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(normalizedQuery));
  const filteredMedia = mediaItems.filter((m) => (m.content || "").toLowerCase().includes(normalizedQuery));
  const filteredFiles = fileItems.filter((m) => (m.content || "").toLowerCase().includes(normalizedQuery));
  const filteredLinks = linkItems.filter((item) => item.link.toLowerCase().includes(normalizedQuery));

  if (!currentRoom) return <div className="chatwindow-empty owl-empty"><h2>Welcome to OwlPost Elite</h2><p>Chọn một cuộc trò chuyện ở bên trái để bắt đầu.</p></div>;

  const isGroup = !currentRoom.isPrivate;

  const getOtherMember = (room) => {
    if (!room || !room.isPrivate) return null;
    const members = Array.isArray(room.members) ? room.members : [];
    return members.find((m) => {
      const id = typeof m === "string" ? null : m?.id;
      return id && id !== user.id;
    });
  };

  const otherMember = getOtherMember(currentRoom);
  const roomName = isGroup
    ? currentRoom.groupName || "Nhóm chat"
    : (otherMember && typeof otherMember === "object" ? otherMember.fullName || otherMember.email : "Cuộc trò chuyện");
  const roomAvatar = isGroup
    ? currentRoom.groupAvatar
    : (otherMember && typeof otherMember === "object" ? otherMember.avatar : null);

  const handleRenameSaved = (newName) => {
    setCurrentRoom((prev) => ({ ...prev, groupName: newName }));
    onRoomUpdated?.();
  };

  const handleAvatarSaved = (newAvatar) => {
    setCurrentRoom((prev) => ({ ...prev, groupAvatar: newAvatar }));
    onRoomUpdated?.();
  };

  const handleBackgroundSaved = (newBackground) => {
    setCurrentRoom((prev) => ({ ...prev, groupBackground: newBackground }));
    onRoomUpdated?.();
  };

  const getBackgroundStyle = () => {
    const bg = currentRoom.groupBackground;
    if (!bg) return {};
    if (bg.startsWith("/backgrounds/")) {
      return {
        background: "none",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#0f172a",
      };
    }
    return { background: bg };
  };

  const chatBackgroundStyle = getBackgroundStyle();

  return (
    <div className="chatwindow chat-stage">
      <div className="chat-core">
        <div className="chat-header">
          <div className="chat-header-main">
            <div className="chat-room-avatar">
              {roomAvatar ? (
                <img src={roomAvatar} alt={roomName} />
              ) : (
                <div className="chat-room-avatar-placeholder">{roomName.charAt(0).toUpperCase()}</div>
              )}
            </div>
            <div>
              <div className="chat-room-name">{roomName}</div>
              <div className="chat-room-sub">{isGroup ? "Nhóm chat" : "Cuộc trò chuyện riêng"}</div>
            </div>
          </div>
          <div className="chat-header-social">
            <a href="https://www.facebook.com/messages" target="_blank" rel="noreferrer" title="Mở Facebook Messenger"><FaFacebookMessenger /></a>
            <a href="https://chat.zalo.me" target="_blank" rel="noreferrer" title="Mở Zalo Web"><SiZalo /></a>
            <button className="panel-toggle" onClick={() => setShowRoomPanel((v) => !v)} title="Mở/Tắt Room Console"><FaSlidersH /></button>
          </div>
        </div>
        <div className="messages" style={chatBackgroundStyle} ref={messagesContainerRef}>{messages.map((msg, index) => <MessageBubble key={msg.id} msg={msg} previousMsg={index > 0 ? messages[index - 1] : null} currentUser={user} room={currentRoom} />)}<div ref={bottomRef} /></div>
        {previewFile && <div className="media-preview-bar"><div className="media-preview-title">Đính kèm: {previewFile.name}</div>{previewFile.type.startsWith("image/") ? <img src={previewFile.url} alt="preview" className="media-preview-image" /> : <video className="media-preview-video" controls><source src={previewFile.url} /></video>}<button className="media-remove-btn" onClick={clearPreview}><FaTimesCircle /> Bỏ đính kèm</button></div>}
        {blockStatus.iBlocked && (
          <div className="blocked-banner">
            <FaBan /> Bạn đã chặn người này
            <button className="unblock-btn" onClick={handleUnblock}>Bỏ chặn</button>
          </div>
        )}
        {blockStatus.blockedBy && (
          <div className="blocked-banner blocked-by-banner">
            <FaBan /> Bạn đã bị người này chặn
          </div>
        )}
        <div className="inputbox">
          <textarea
            ref={inputRef}
            placeholder="Nhập tin nhắn..."
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent?.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            onPaste={handlePaste}
            disabled={blockStatus.iBlocked || blockStatus.blockedBy}
          />
          <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleFileChange} />
          <button className="emoji-btn" onClick={() => setShowEmoji((v) => !v)} title="Emoji" disabled={blockStatus.iBlocked || blockStatus.blockedBy}><FaSmile /></button>
          <button className="attach-btn" onClick={handleChooseFile} title="Thêm ảnh/video" disabled={blockStatus.iBlocked || blockStatus.blockedBy || isUploading}>
            {isUploading ? <FaSpinner className="fa-spin" /> : <FaPaperclip />}
          </button>
          <button onClick={handleSend} disabled={isSending || isUploading || blockStatus.iBlocked || blockStatus.blockedBy}>
            {isSending ? <FaSpinner className="fa-spin" /> : <FaPaperPlane />} Gửi
          </button>
          {showEmoji && (
            <div className="emoji-picker-wrap">
              <EmojiPicker onSelect={(emoji) => { setInput((prev) => prev + emoji); inputRef.current?.focus(); }} onClose={() => setShowEmoji(false)} />
            </div>
          )}
        </div>
      </div>
      {showRoomPanel && (
        <aside className="room-console">
          <div className="console-head">
            <div>
              <h3>Orion Room Console</h3>
              <p>Bảng điều phối chuyên sâu cho OwlPost Elite.</p>
            </div>
          </div>
          <button className="launch-btn"><FaRocket /> Pro</button>
          <div className="console-actions group-management">
            {isGroup && (
              <>
                <button onClick={() => setShowRenameModal(true)} title="Đổi tên nhóm"><FaEdit /> Đổi tên</button>
                <button onClick={() => setShowAvatarModal(true)} title="Đổi ảnh nhóm"><FaImage /> Đổi ảnh</button>
              </>
            )}
            <button onClick={() => setShowBackgroundModal(true)} title="Đổi nền"><FaPalette /> Đổi nền</button>
          </div>
          <div className="panel-search"><FaSearch /><input value={panelQuery} onChange={(e) => setPanelQuery(e.target.value)} placeholder="Tìm trong panel..." /></div>
          <div className="panel-tabs">
            <button className={activeTab === "members" ? "active" : ""} onClick={() => setActiveTab("members")}><FaUsers /> Members</button>
            <button className={activeTab === "media" ? "active" : ""} onClick={() => setActiveTab("media")}><FaRegImages /> Media</button>
            <button className={activeTab === "files" ? "active" : ""} onClick={() => setActiveTab("files")}><FaRegFileAlt /> Files</button>
            <button className={activeTab === "links" ? "active" : ""} onClick={() => setActiveTab("links")}><FaLink /> Links</button>
          </div>
          <div className="panel-content console-card">
            {activeTab === "members" && (
              <ul>
                {filteredMembers.length === 0 && <li>Không có thành viên phù hợp.</li>}
                {filteredMembers.map((m) => <li key={m.name}>{m.name} • {m.role}</li>)}
              </ul>
            )}
            {activeTab === "media" && (
              <ul>
                {filteredMedia.length === 0 && <li>Chưa có media phù hợp.</li>}
                {filteredMedia.slice(0, 10).map((m) => <li key={m.id}>Media từ {m.sender?.fullName || "thành viên"}</li>)}
              </ul>
            )}
            {activeTab === "files" && (
              <ul>
                {filteredFiles.length === 0 && <li>Chưa có file phù hợp.</li>}
                {filteredFiles.slice(0, 10).map((m) => <li key={m.id}>Tệp đính kèm từ {m.sender?.fullName || "thành viên"}</li>)}
              </ul>
            )}
            {activeTab === "links" && (
              <ul>
                {filteredLinks.length === 0 && <li>Chưa có link phù hợp.</li>}
                {filteredLinks.slice(0, 12).map((item) => <li key={item.id}><a href={item.link} target="_blank" rel="noreferrer">{item.link}</a></li>)}
              </ul>
            )}
          </div>
          <div className="console-card">
            <h4>Privacy Capsule</h4>
            <p>Mọi thông tin trong nhóm được bảo mật và mã hóa đầu cuối.</p>
          </div>
        </aside>
      )}

      {showRenameModal && (
        <RenameGroupModal
          room={currentRoom}
          onClose={() => setShowRenameModal(false)}
          onSaved={handleRenameSaved}
        />
      )}

      {showAvatarModal && (
        <ChangeGroupAvatarModal
          room={currentRoom}
          onClose={() => setShowAvatarModal(false)}
          onSaved={handleAvatarSaved}
        />
      )}

      {showBackgroundModal && (
        <ChangeGroupBackgroundModal
          room={currentRoom}
          onClose={() => setShowBackgroundModal(false)}
          onSaved={handleBackgroundSaved}
        />
      )}
    </div>
  );
}

export default ChatWindow;
