import { useEffect, useState } from "react";
import Auth from "./pages/Auth";
import MainLayout from "./pages/MainLayout";

function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogin = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return <MainLayout user={user} onLogout={handleLogout} onUserUpdate={handleLogin} theme={theme} onToggleTheme={handleToggleTheme} />;
}

export default App;
