import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import API from "../services/api";
import defaultAvatar from "../assets/default-avatar.png";

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTH_OPTIONS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const YEAR_OPTIONS = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - i));

function Profile({ user, onClose, onSaved, onRoomsReload }) {
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    email: user.email || "",
    username: user.username || "",
    phoneNumber: user.phoneNumber || "",
    dayOfBirth: user.dayOfBirth || "",
    monthOfBirth: user.monthOfBirth || "",
    yearOfBirth: user.yearOfBirth || "",
    password: "",
    avatar: user.avatar || "",
  });

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const handleChange = (e) => {
    const fieldName = e.target.name === "profilePhoneNumber" ? "phoneNumber" : e.target.name === "profilePassword" ? "password" : e.target.name;
    setForm({ ...form, [fieldName]: e.target.value });
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn file ảnh.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageSrc(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async () => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
    );

    return canvas.toDataURL("image/jpeg");
  };

  const handleSave = async () => {
    try {
      let finalAvatar = form.avatar;
      if (imageSrc && croppedAreaPixels) {
        finalAvatar = await getCroppedImg();
      }

      const updatedData = {
        fullName: form.fullName.trim(),
        phoneNumber: user.authProvider === "GOOGLE" ? null : form.phoneNumber.trim(),
        dayOfBirth: form.dayOfBirth,
        monthOfBirth: form.monthOfBirth,
        yearOfBirth: form.yearOfBirth,
        avatar: finalAvatar,
      };

      if (user.authProvider !== "GOOGLE" && form.password && form.password.trim() !== "") {
        updatedData.password = form.password;
      }

      const res = await API.put(`/users/${user.id}`, updatedData);
      const updatedUser = {
        ...res.data,
        authProvider: res.data.authProvider || user.authProvider,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      onSaved?.(updatedUser);
      onRoomsReload?.();
      alert("Cập nhật thành công!");
      onClose();
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Lỗi cập nhật!");
    }
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-box" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2>Hồ sơ cá nhân</h2>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>

        <div className="avatar-section">
          {imageSrc ? (
            <div style={{ position: "relative", width: "100%", height: 300 }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          ) : (
            <img src={form.avatar || defaultAvatar} className="profile-avatar" alt="avatar" />
          )}

          <label className="upload-btn">
            Đổi ảnh
            <input type="file" hidden onChange={handleAvatarUpload} />
          </label>
        </div>

        <div className="profile-inputs">
          <label>Họ tên</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} />

          <label>Email</label>
          <input name="email" value={form.email} readOnly className="readonly-input" />

          <label>Tên người dùng</label>
          <input name="username" value={form.username} readOnly className="readonly-input" />

          <label>Số điện thoại</label>
          <input
            name="profilePhoneNumber"
            value={user.authProvider === "GOOGLE" ? "" : form.phoneNumber}
            onChange={handleChange}
            placeholder="Số điện thoại"
            autoComplete="off"
          />

          <div className="birth-grid">
            <div>
              <label>Ngày sinh</label>
              <select name="dayOfBirth" value={form.dayOfBirth} onChange={handleChange} className="profile-select">
                <option value="">Ngày</option>
                {DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Tháng</label>
              <select name="monthOfBirth" value={form.monthOfBirth} onChange={handleChange} className="profile-select">
                <option value="">Tháng</option>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Năm</label>
              <select name="yearOfBirth" value={form.yearOfBirth} onChange={handleChange} className="profile-select">
                <option value="">Năm</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {!user.authProvider || user.authProvider !== "GOOGLE" ? (
            <>
              <label>Mật khẩu mới</label>
              <input
                type="password"
                name="profilePassword"
                value={form.password}
                onChange={handleChange}
                placeholder="Để trống nếu không đổi"
                autoComplete="new-password"
              />
            </>
          ) : null}
        </div>

        <div className="profile-actions">
          <button className="save-btn" onClick={handleSave}>Lưu thông tin</button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
