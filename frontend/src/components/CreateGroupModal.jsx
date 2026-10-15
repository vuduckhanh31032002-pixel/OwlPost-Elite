import { useEffect, useState } from "react";
import API from "../services/api";

function CreateGroupModal({ user, onClose }) {
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => {
    API.get(`/friends`).then((res) => {
      setFriends(res.data);
    });
  }, [user.id]);

  const toggle = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const handleCreate = async () => {
    if (!name || selected.length === 0) {
      alert("Vui lòng nhập tên nhóm và chọn thành viên");
      return;
    }

    try {
      await API.post("/rooms/group", {
        groupName: name,
        memberIds: selected,
      });

      onClose();
    } catch (err) {
      console.error(err);
      alert("Lỗi tạo nhóm!");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Tạo nhóm</h3>
          <span onClick={onClose}>✖</span>
        </div>

        <div className="modal-body">
          <input
            className="group-name-input"
            placeholder="Nhập tên nhóm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {friends.map((f) => (
            <div key={f.id} className="modal-user">
              <input
                type="checkbox"
                checked={selected.includes(f.id)}
                onChange={() => toggle(f.id)}
              />
              <span>{f.fullName}</span>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-primary" onClick={handleCreate}>
            Tạo nhóm
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroupModal;
