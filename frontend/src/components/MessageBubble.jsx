import { useEffect, useMemo, useState, memo } from "react";
import { FaDownload, FaShareAlt, FaRegFileVideo, FaRegImage, FaTimes, FaChevronLeft, FaChevronRight, FaPaperPlane, FaSearch } from "react-icons/fa";
import API from "../services/api";

const MAX_MEDIA_SIZE = 50 * 1024 * 1024;

function formatDateDivider(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isDifferentDay(previousDateString, currentDateString) {
  if (!previousDateString) return true;

  const previous = new Date(previousDateString);
  const current = new Date(currentDateString);

  return previous.getFullYear() !== current.getFullYear()
    || previous.getMonth() !== current.getMonth()
    || previous.getDate() !== current.getDate();
}

function getFileType(url = "") {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:image/")) return "image";
  if (lower.startsWith("data:video/")) return "video";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].some((ext) => lower.includes(ext))) return "image";
  if ([".mp4", ".webm", ".ogg", ".mov", ".mkv"].some((ext) => lower.includes(ext))) return "video";
  return "file";
}

function getAttachmentType(url = "") {
  const match = url.match(/^data:([^;]+);/i);
  return match?.[1] || "";
}

function ImageViewer({ src, onClose, onShare }) {
  const handleDownload = async () => {
    try {
      const res = await fetch(src, { credentials: "include" });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
      alert("Tải xuống thất bại!");
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!src) return null;

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-shell" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-toolbar-side">
          <button type="button" onClick={handleDownload} title="Tải xuống"><FaDownload /></button>
          <button type="button" onClick={onShare} title="Chia sẻ"><FaShareAlt /></button>
        </div>
        <button type="button" className="viewer-close" onClick={onClose} title="Đóng"><FaTimes /></button>
        <div className="viewer-stage">
          <img src={src} alt="preview" />
        </div>
      </div>
    </div>
  );
}

function ShareModal({ open, onClose, user, src, content, onSent }) {
  const [rooms, setRooms] = useState([]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (!open) return;
    API.get(`/rooms`).then((res) => setRooms(res.data || [])).catch(() => setRooms([]));
  }, [open, user.id]);

  const filteredRooms = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return rooms.filter((room) => {
      const name = room.isPrivate ? (room.members?.find((m) => (typeof m === "string" ? m : m?.fullName) !== user.fullName) || room.groupName) : room.groupName;
      const displayName = typeof name === "string" ? name : name?.fullName || name?.email || room.groupName || "";
      return displayName.toLowerCase().includes(q);
    });
  }, [rooms, keyword, user.fullName]);

  const handleSendToRoom = async (roomId) => {
    try {
      await API.post("/messages/send", { roomId, senderId: user.id, content: content || "", imageUrl: src });
      onSent?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Chuyển tiếp thất bại!");
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><h3>Chuyển tiếp</h3><span onClick={onClose}>✖</span></div>
        <div className="modal-body">
          <div className="modal-search"><FaSearch /><input placeholder="Tìm kiếm người và nhóm" value={keyword} onChange={(e) => setKeyword(e.target.value)} /></div>
          <div className="modal-list">
             {filteredRooms.map((room) => {
              const otherMember = room.isPrivate ? room.members?.find((m) => (typeof m === "string" ? m : m?.fullName) !== user.fullName) : null;
              const displayName = otherMember ? (typeof otherMember === "string" ? otherMember : otherMember?.fullName || otherMember?.email || "") : room.groupName;
              return (
                <div key={room.roomId} className="modal-user">
                  <div className="modal-avatar">{displayName?.charAt(0)}</div>
                  <div><div>{displayName}</div><small>{room.isPrivate ? "Đoạn chat" : "Nhóm chat"}</small></div>
                  <button className="btn-primary" onClick={() => handleSendToRoom(room.roomId)}><FaPaperPlane /> Gửi</button>
                </div>
              );
            })}
            {filteredRooms.length === 0 && <p>Không tìm thấy cuộc trò chuyện phù hợp.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function getSenderColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

const MessageBubble = memo(function MessageBubble({ msg, previousMsg, currentUser, room }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const isMe = msg.sender?.id === currentUser.id;
  const time = msg.sentTime ? new Date(msg.sentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const hasMedia = Boolean(msg.imageUrl);
  const mediaType = getFileType(msg.imageUrl || "");
  const attachmentType = getAttachmentType(msg.imageUrl || "");
  const showDateDivider = Boolean(msg.sentTime) && isDifferentDay(previousMsg?.sentTime, msg.sentTime);
  const isGroup = !room?.isPrivate;

  const avatarUrl = msg.sender?.avatar || "";
  const senderName = msg.sender?.fullName || "";

  const Avatar = (
    <div className="msg-avatar" style={avatarUrl ? {} : { background: getSenderColor(senderName) }}>
      {avatarUrl ? <img src={avatarUrl} alt={senderName} /> : senderName?.charAt(0)}
    </div>
  );

  return (
    <>
      {showDateDivider && <div className="date-divider">{formatDateDivider(msg.sentTime)}</div>}
      <div className={`message-row ${isMe ? "me" : "other"}${isGroup && !isMe ? " group-other" : ""}`}>
        {isGroup && !isMe && (
          <div className="group-other-col">
            <div className="msg-sender-name">{senderName}</div>
            <div className="group-other-main">
              {Avatar}
              <div className={`bubble ${isMe ? "me" : "other"}`}>
                {msg.content && <div className="msg-text">{msg.content}</div>}
                {hasMedia && (
                  <div className="message-media-wrap">
                    {mediaType === "image" && <button type="button" className="message-image-wrap" onClick={() => setViewerOpen(true)}><img src={msg.imageUrl} alt="attachment" className="message-image" /></button>}
                    {mediaType === "video" && (
                      <video className="message-video" controls preload="metadata">
                        <source src={msg.imageUrl} type={attachmentType || undefined} />
                        Trình duyệt của bạn không hỗ trợ phát video.
                      </video>
                    )}
                    {mediaType === "file" && (<a href={msg.imageUrl} target="_blank" rel="noreferrer" className="file-chip"><FaRegFileVideo /><span>Tệp đính kèm</span></a>)}
                  </div>
                )}
                <div className="time">{time}</div>
              </div>
            </div>
          </div>
        )}
        {!(isGroup && !isMe) && (
          <div className={`bubble ${isMe ? "me" : "other"}`}>
            {msg.content && <div className="msg-text">{msg.content}</div>}
            {hasMedia && (
              <div className="message-media-wrap">
                {mediaType === "image" && <button type="button" className="message-image-wrap" onClick={() => setViewerOpen(true)}><img src={msg.imageUrl} alt="attachment" className="message-image" /></button>}
                {mediaType === "video" && (
                  <video className="message-video" controls preload="metadata">
                    <source src={msg.imageUrl} type={attachmentType || undefined} />
                    Trình duyệt của bạn không hỗ trợ phát video.
                  </video>
                )}
                {mediaType === "file" && (<a href={msg.imageUrl} target="_blank" rel="noreferrer" className="file-chip"><FaRegFileVideo /><span>Tệp đính kèm</span></a>)}
              </div>
            )}
            <div className="time">{time}</div>
          </div>
        )}
      </div>
      {viewerOpen && mediaType === "image" && msg.imageUrl && <ImageViewer src={msg.imageUrl} onClose={() => setViewerOpen(false)} onShare={() => setShareOpen(true)} />}
    <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} user={currentUser} src={msg.imageUrl} content={msg.content} />
  </>
  );
});

export default MessageBubble;
