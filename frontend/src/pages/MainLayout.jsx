import { useState, useEffect, useCallback, useRef } from "react";
import API from "../services/api";
import { connectUserSocket, disconnectUserSocket } from "../services/userSocket";
import Sidebar from "../layout/Sidebar";
import ChatList from "../layout/ChatList";
import ChatWindow from "../layout/ChatWindow";
import FriendRequestsModal from "../components/FriendRequestsModal";
import GroupInvitesModal from "../components/GroupInvitesModal";

function MainLayout({ user, onLogout, onUserUpdate, theme, onToggleTheme }) {
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showGroupInvites, setShowGroupInvites] = useState(false);

  const [reloadRooms, setReloadRooms] = useState(false);
  const [blockVersion, setBlockVersion] = useState(0);

  const [friendCount, setFriendCount] = useState(0);
  const [groupCount, setGroupCount] = useState(0);

  const [friendVersion, setFriendVersion] = useState(0);
  const [groupInviteVersion, setGroupInviteVersion] = useState(0);

  const [unreadByRoom, setUnreadByRoom] = useState({});
  const [rooms, setRooms] = useState([]);
  const [sendRoomId, setSendRoomId] = useState(null);
  const currentRoomIdRef = useRef(null);
  const roomsRef = useRef([]);
  const sendRoomIdRef = useRef(null);
  const selectedRoomRef = useRef(selectedRoom);

  useEffect(() => {
    selectedRoomRef.current = selectedRoom;
  }, [selectedRoom]);

  useEffect(() => {
    sendRoomIdRef.current = sendRoomId;
  }, [sendRoomId]);

  useEffect(() => {
    if (selectedRoom) {
      setSendRoomId(null);
      sendRoomIdRef.current = null;
    }
  }, [selectedRoom]);

  const getOtherPeerId = useCallback((room) => {
    if (!room || !room.isPrivate) return null;
    const members = Array.isArray(room.members) ? room.members : [];
    const other = members.find((m) => {
      const id = typeof m === "string" ? null : m?.id;
      return id && id !== user.id;
    });
    return other ? (typeof other === "object" ? other.id : null) : null;
  }, [user.id]);

  const loadNotifications = useCallback(async () => {
    try {
      const fr = await API.get(`/friends/pending`);
      setFriendCount(fr.data.length);

      const gi = await API.get(`/rooms/invites`);
      setGroupCount(gi.data.length);
    } catch (err) {
      console.error(err);
    }
  }, [user.id]);

  const reload = useCallback(() => {
    setReloadRooms((prev) => !prev);
    loadNotifications();
  }, [loadNotifications]);

  const loadRooms = useCallback(async (isRetry = false) => {
    try {
      const res = await API.get(`/rooms`);
      const list = Array.isArray(res.data) ? res.data : [];
      setRooms(list);
      roomsRef.current = list;
    } catch (error) {
      console.error("Load rooms failed:", error);
      setRooms([]);
      roomsRef.current = [];
      if (!isRetry) {
        setTimeout(() => loadRooms(true), 2500);
      }
    }
  }, [user.id]);

  const notifyBlockChange = useCallback(() => {
    setBlockVersion((prev) => prev + 1);
  }, []);

  const notifyFriendChange = useCallback(() => {
    setFriendVersion((prev) => prev + 1);
    loadNotifications();
  }, [loadNotifications]);

  const notifyGroupInviteChange = useCallback(() => {
    setGroupInviteVersion((prev) => prev + 1);
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRooms();
  }, [loadNotifications, loadRooms]);

  useEffect(() => {
    currentRoomIdRef.current = selectedRoom ? selectedRoom.roomId : null;
  }, [selectedRoom]);

  useEffect(() => {
    if (selectedRoom) {
      setUnreadByRoom((prev) => {
        const key = String(selectedRoom.roomId);
        if (prev[key]) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return prev;
      });
    }
  }, [selectedRoom]);

  useEffect(() => {
    connectUserSocket(user.id, (event) => {
      if (event.type === "FRIEND_REQUEST_RECEIVED") {
        notifyFriendChange();
      } else if (event.type === "FRIEND_REQUEST_ACCEPTED") {
        notifyFriendChange();
        setReloadRooms((prev) => !prev);
      } else if (event.type === "FRIEND_REQUEST_REJECTED") {
        notifyFriendChange();
      } else if (event.type === "FRIEND_REMOVED") {
        notifyFriendChange();
      } else if (event.type === "GROUP_INVITE_RECEIVED") {
        notifyGroupInviteChange();
      } else if (event.type === "USER_BLOCKED" || event.type === "USER_UNBLOCKED" || event.type === "USER_BLOCKED_BY" || event.type === "USER_UNBLOCKED_BY") {
        setBlockVersion((prev) => prev + 1);
      } else if (event.type === "ROOMS_CHANGED") {
        setReloadRooms((prev) => !prev);
        setSendRoomId(null);
        sendRoomIdRef.current = null;
      } else if (event.type === "ROOM_BACKGROUND_CHANGED") {
        const roomId = event.roomId;
        const background = event.background;
        setRooms((prev) =>
          prev.map((room) =>
            String(room.roomId) === String(roomId)
              ? { ...room, groupBackground: background }
              : room
          )
        );
        setSelectedRoom((prev) =>
          prev && String(prev.roomId) === String(roomId)
            ? { ...prev, groupBackground: background }
            : prev
        );
      } else if (event.type === "NEW_MESSAGE") {
        const incomingRoomId = event.roomId;
        const message = event.message;

        if (incomingRoomId && message) {
          const currentRoomId = currentRoomIdRef.current;
          const currentRoom = selectedRoomRef.current;

          console.log("[NEW_MSG]", { incomingRoomId, currentRoomId, currentRoomIsPrivate: currentRoom?.isPrivate, senderId: message.sender?.id, userId: user.id });

          if (currentRoomId != null && String(currentRoomId) === String(incomingRoomId)) {
            console.log("[SAME ROOM]");
            window.dispatchEvent(new CustomEvent("newMessage", { detail: event }));
          } else if (currentRoom?.isPrivate) {
            const otherPeerId = getOtherPeerId(currentRoom);
            const senderId = message.sender?.id;

            console.log("[PRIVATE CHECK]", { otherPeerId, senderId, match: otherPeerId && (senderId === otherPeerId || senderId === user.id) });

            if (otherPeerId && (senderId === otherPeerId || senderId === user.id)) {
              console.log("[CROSS ROOM APPEND]");
              window.dispatchEvent(new CustomEvent("newMessage", { detail: { ...event, crossRoom: true } }));
              setSendRoomId(incomingRoomId);
            } else {
              console.log("[DEFAULT DISPATCH]");
              window.dispatchEvent(new CustomEvent("newMessage", { detail: event }));
            }
          } else {
            console.log("[DEFAULT DISPATCH]");
            window.dispatchEvent(new CustomEvent("newMessage", { detail: event }));
          }
        }
      }
    });

    const handleOpenRoom = async (e) => {
      const roomData = e.detail;
      if (roomData && roomData.roomId) {
        try {
          setReloadRooms((prev) => !prev);
          await new Promise((resolve) => setTimeout(resolve, 300));
          const roomsRes = await API.get(`/rooms`);
          const rooms = roomsRes.data || [];
          const foundRoom = rooms.find((r) => r.roomId === roomData.roomId);
          if (foundRoom) {
            setSelectedRoom(foundRoom);
          }
        } catch (error) {
          console.error("Failed to load room:", error);
        }
      }
    };

    window.addEventListener("openRoom", handleOpenRoom);

    const handleRoomRestored = async (e) => {
      const restoredRoomId = e.detail?.roomId;
      if (restoredRoomId) {
        try {
          const roomsRes = await API.get(`/rooms`);
          const rooms = roomsRes.data || [];
          const restoredRoom = rooms.find((r) => r.roomId === restoredRoomId);
          if (restoredRoom) {
            setSelectedRoom(restoredRoom);
          }
        } catch (error) {
          console.error("Failed to load restored room:", error);
        }
      }
    };

    window.addEventListener("roomRestored", handleRoomRestored);

    return () => {
      disconnectUserSocket();
      window.removeEventListener("openRoom", handleOpenRoom);
      window.removeEventListener("roomRestored", handleRoomRestored);
    };
  }, [user.id, notifyFriendChange, notifyGroupInviteChange, getOtherPeerId]);

  return (
    <>
      <div className="app">
        <Sidebar
          user={user}
          onLogout={onLogout}
          onUserUpdate={onUserUpdate}
          onToggleTheme={onToggleTheme}
          theme={theme}
          onShowFriendRequests={() => setShowFriendRequests(true)}
          onShowGroupInvites={() => setShowGroupInvites(true)}
          friendCount={friendCount}
          groupCount={groupCount}
          showFriendRequests={showFriendRequests}
          showGroupInvites={showGroupInvites}
          onRoomsReload={reload}
          blockVersion={blockVersion}
          onBlockChange={notifyBlockChange}
        />

        <ChatList
          user={user}
          onSelectRoom={(room) => setSelectedRoom(room)}
          reloadTrigger={reloadRooms}
          onBlockChange={notifyBlockChange}
          friendVersion={friendVersion}
          rooms={rooms}
          unreadByRoom={unreadByRoom}
        />

        <ChatWindow user={user} room={selectedRoom} sendRoomId={sendRoomId} onRoomUpdated={reload} blockVersion={blockVersion} onBlockChange={notifyBlockChange} />
      </div>

      {showFriendRequests && (
        <FriendRequestsModal
          user={user}
          onClose={() => setShowFriendRequests(false)}
          onAccepted={reload}
          friendVersion={friendVersion}
        />
      )}

      {showGroupInvites && (
        <GroupInvitesModal
          user={user}
          onClose={() => setShowGroupInvites(false)}
          onAccepted={reload}
          groupInviteVersion={groupInviteVersion}
        />
      )}
    </>
  );
}

export default MainLayout;
