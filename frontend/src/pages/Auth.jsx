import { useEffect, useMemo, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { GiOwl } from "react-icons/gi";
import { FaStar, FaShield, FaBolt, FaArrowLeft, FaCircleQuestion, FaClock, FaImage, FaUsers } from "react-icons/fa6";
import { FcGoogle } from "react-icons/fc";
import API from "../services/api";

const SHOWCASE_SLIDES = [
  {
    title: "Bạn bè online mọi lúc",
    desc: "Nhìn thấy nhịp trò chuyện đang diễn ra ngay trong màn hình chào mừng.",
    detail: "Live chat, media sharing và nhóm trò chuyện đều hiển thị theo thời gian thực, giúp không gian OwlPost luôn sinh động và dễ theo dõi hơn.",
  },
  {
    title: "Tin nhắn bùng nổ cảm hứng",
    desc: "OwlPost Elite tạo không gian nhắn tin sáng, mượt và giàu cảm hứng.",
    detail: "Thiết kế hiện đại giúp mọi cuộc trò chuyện trở nên trực quan hơn, đồng thời vẫn giữ được cảm giác gọn gàng và tinh tế cho người dùng.",
  },
  {
    title: "Nhanh, đẹp, riêng tư",
    desc: "Gửi ảnh/video và kết nối theo phong cách riêng của bài làm bạn.",
    detail: "Bảng điều khiển riêng biệt hỗ trợ quản lý nhóm, media và liên kết rất gọn gàng, phù hợp cho cả học tập lẫn trao đổi hàng ngày.",
  },
];

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTH_OPTIONS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const YEAR_OPTIONS = Array.from({ length: 80 }, (_, i) => String(new Date().getFullYear() - i));

function Auth({ onLogin }) {
  const [screen, setScreen] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    username: "",
    day: "",
    month: "",
    year: "",
  });

  const resetForm = () => {
    setForm({
      fullName: "",
      email: "",
      password: "",
      username: "",
      day: "",
      month: "",
      year: "",
    });
    setShowPassword(false);
  };

  const hasGoogleClientId = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const currentSlide = useMemo(() => SHOWCASE_SLIDES[slideIndex], [slideIndex]);

  const handleChange = (e) => {
    const fieldName = e.target.name === "signupEmail" ? "email" : e.target.name === "signupPassword" ? "password" : e.target.name;
    setForm({ ...form, [fieldName]: e.target.value });
  };

  const handleLogin = async () => {
    const res = await API.post("/users/login", {
      email: form.email.trim(),
      password: form.password,
    });

    const { user, token } = res.data;
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
    onLogin(user);
  };

  const handleSignup = async () => {
    const trimmedFullName = form.fullName.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPassword = form.password.trim();
    const trimmedUsername = form.username.trim();

    if (!trimmedEmail || !trimmedPassword || !form.day || !form.month || !form.year || !trimmedFullName || !trimmedUsername) {
      alert("Vui lòng nhập đầy đủ thông tin đăng ký.");
      return;
    }

    const res = await API.post("/users/register", {
      fullName: trimmedFullName,
      email: trimmedEmail,
      password: form.password,
      username: trimmedUsername,
      dayOfBirth: form.day,
      monthOfBirth: form.month,
      yearOfBirth: form.year,
    });

    const { user, token } = res.data;
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
    onLogin(user);
    alert("Đăng ký thành công!");
  };

  const handleSubmit = async () => {
    try {
      if (screen === "login") {
        await handleLogin();
      } else {
        await handleSignup();
      }
    } catch (err) {
      console.log(err);
      alert(screen === "login" ? "Sai thông tin!" : "Đăng ký thất bại!");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse?.credential;
      if (!token) {
        alert("Không lấy được token Google.");
        return;
      }

      setGoogleLoading(true);
      const res = await API.post("/users/google-login", {
        idToken: token,
      });

      const { user } = res.data;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("token", res.data.token);
      onLogin(user);
    } catch (err) {
      console.error("Google login backend error:", err?.response?.data || err?.message || err);
      alert("Đăng nhập Google thất bại. Kiểm tra backend đã restart chưa.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGoogleLoading(false);
    alert("Google Sign-In bị lỗi, thử lại nhé.");
  };

  return (
    <div className={`auth-shell ${screen === "signup" ? "signup-view" : "login-view"}`}>
      <section className={`auth-hero hero-${slideIndex}`}>
        <div className="hero-brand">
          <div className="hero-brand-mark">
            <GiOwl />
          </div>
          <div>
            <div className="hero-brand-name">OwlPost Elite</div>
            <div className="hero-brand-sub">Social messaging with an owl soul</div>
          </div>
        </div>

        <div className="hero-card">
          <h1>{currentSlide.title}</h1>
          <p>{currentSlide.desc}</p>
          <p className="hero-card-detail">{currentSlide.detail}</p>

          <div className="hero-feature-list">
            <div className="hero-feature-item">
              <FaBolt />
              <div>
                <strong>Realtime chat</strong>
                <span>Nhắn tin tức thì, phản hồi liên tục trong từng room.</span>
              </div>
            </div>

            <div className="hero-feature-item">
              <FaUsers />
              <div>
                <strong>Nhóm & bạn bè</strong>
                <span>Tạo room, mời bạn, quản lý lời mời rất gọn gàng và nhanh.</span>
              </div>
            </div>

            <div className="hero-feature-item">
              <FaImage />
              <div>
                <strong>Media sharing</strong>
                <span>Đính kèm ảnh/video, xem trước và chia sẻ cực mượt.</span>
              </div>
            </div>
          </div>

          <div className="hero-stats">
            <div>
              <FaBolt />
              <span>Realtime</span>
            </div>
            <div>
              <FaShield />
              <span>Private</span>
            </div>
            <div>
              <FaStar />
              <span>Premium</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-wrap">
        <div className={`auth-form-card ${screen === "signup" ? "signup-card" : "login-card"}`}>
          {screen === "login" ? (
            <>
              <div className="form-topline">OwlPost Elite</div>
              <h2>Đăng nhập</h2>
              <p className="form-desc">Chào mừng bạn quay lại với không gian trò chuyện của riêng mình.</p>

              <input
                className="auth-input"
                name="email"
                type="email"
                placeholder="Số di động, tên người dùng hoặc email"
                onChange={handleChange}
              />

              <div className="password-field">
                <input
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Mật khẩu"
                  onChange={handleChange}
                />
                <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                  👁
                </button>
              </div>

              <button className="primary-btn" onClick={handleSubmit}>
                Đăng nhập
              </button>
            </>
          ) : (
            <>
              <button type="button" className="back-btn" onClick={() => { resetForm(); setScreen("login"); }}>
                <FaArrowLeft />
              </button>

              <div className="form-topline signup-topline">Meta • OwlPost Elite</div>
              <h2 className="signup-title">Bắt đầu trên OwlPost</h2>
              <p className="form-desc signup-desc compact-desc">
                Đăng ký để xem ảnh và video từ bạn bè, và kết nối với cộng đồng theo phong cách OwlPost.
              </p>

              <label className="field-label">Số di động hoặc email <FaCircleQuestion /></label>
              <input
                className="auth-input"
                name="signupEmail"
                type="email"
                placeholder="Số di động hoặc email"
                autoComplete="off"
                onChange={handleChange}
              />

              <label className="field-label">Mật khẩu</label>
              <input
                className="auth-input"
                type={showPassword ? "text" : "password"}
                name="signupPassword"
                placeholder="Mật khẩu"
                autoComplete="new-password"
                onChange={handleChange}
              />

              <div className="birth-grid-head">
                <div className="field-label row-label">
                  Ngày sinh <FaCircleQuestion />
                </div>
              </div>

              <div className="birth-grid">
                <select name="day" value={form.day} onChange={handleChange} className="birth-select">
                  <option value="">Ngày</option>
                  {DAY_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select name="month" value={form.month} onChange={handleChange} className="birth-select">
                  <option value="">Tháng</option>
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select name="year" value={form.year} onChange={handleChange} className="birth-select">
                  <option value="">Năm</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <label className="field-label">Tên</label>
              <input
                className="auth-input"
                name="fullName"
                placeholder="Tên đầy đủ"
                onChange={handleChange}
              />

              <label className="field-label">Tên người dùng</label>
              <input
                className="auth-input"
                name="username"
                placeholder="Tên người dùng"
                onChange={handleChange}
              />

              <p className="signup-terms compact-terms">
                Khi nhấn Gửi, bạn đồng ý với <a href="#">Điều khoản</a>, <a href="#">Chính sách quyền riêng tư</a> và <a href="#">Chính sách cookie</a> của OwlPost.
              </p>

              <button className="primary-btn" onClick={handleSubmit}>
                Gửi
              </button>

              <button type="button" className="secondary-btn" onClick={() => setScreen("login") }>
                Tôi có tài khoản rồi
              </button>
            </>
          )}

          <div className="separator">hoặc</div>

          <button
            type="button"
            className="google-btn"
            onClick={() => {
              const googleBtn = document.querySelector(".google-login-hidden div[role='button']");
              if (googleBtn) {
                googleBtn.click();
                return;
              }
              if (!hasGoogleClientId) {
                alert("Bạn chưa cấu hình VITE_GOOGLE_CLIENT_ID trong file frontend/.env.");
              }
            }}
            disabled={googleLoading}
          >
            <FcGoogle /> {googleLoading ? "Đang xử lý..." : "Đăng nhập bằng Gmail"}
          </button>

          <div className="google-login-hidden" style={{ opacity: 0, height: 0, overflow: "hidden" }}>
            {hasGoogleClientId ? (
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            ) : null}
          </div>

          <button
            type="button"
            className="text-btn auth-switch-btn"
            onClick={() => {
              resetForm();
              setScreen(screen === "login" ? "signup" : "login");
            }}
          >
            {screen === "login" ? "Tạo tài khoản mới" : "Đã có tài khoản rồi"}
          </button>
        </div>
      </section>
    </div>
  );
}

export default Auth;
