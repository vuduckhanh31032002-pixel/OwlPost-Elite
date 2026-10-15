import { useEffect, useMemo, useRef, useState } from "react";

const EMOJI_CATEGORIES = {
  recent: { icon: "🕐", label: "Gần đây", keywords: ["gần đây","recent"], emojis: [] },
  smileys: { icon: "😀", label: "Cảm xúc", keywords: ["cảm xúc","vui","buồn","khóc","cười","mặt"], emojis: ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","😗","😙","😚","😇","🥲","😏","😌","😴","😪","😷","🤒","🤕","🤢","🤮","🥴","🤧","🥶","🥵","🥺","😱","😨","😰","😥","😓","🤗"] },
  people: { icon: "👍", label: "Người", keywords: ["người","tay","chân","mắt","like","thích","tim","yêu"], emojis: ["👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👋","🤚","🖐","✋","🖖","👏","🙌","🤝","🙏","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁","👅","👄"] },
  animals: { icon: "🐶", label: "Động vật", keywords: ["động vật","chó","mèo","thỏ","hổ","gà"], emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗"] },
  food: { icon: "🍎", label: "Đồ ăn", keywords: ["đồ ăn","ăn","uống","trái cây","thức ăn"], emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🫑","🌽"] },
  activities: { icon: "⚽", label: "Hoạt động", keywords: ["hoạt động","thể thao","bóng","chơi"], emojis: ["⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥅","🏒","🏑","🥍","🏏","🥌","⛳","🏹","🎣","🤿"] },
  travel: { icon: "🚗", label: "Du lịch", keywords: ["du lịch","xe","bay","tàu","đi"], emojis: ["🚗","🚕","🚙","🚌","🚎","🏎","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🦯","🦽","🦼","🛴","🚲","🛵"] },
  objects: { icon: "⌚", label: "Vật dụng", keywords: ["vật dụng","điện thoại","máy","đồng hồ"], emojis: ["⌚","📱","💻","⌨️","🖥","🖨","🖱","🕹","🗜","💽","💾","💿","📀","📼","📷","📸","📹","🎥","📽","🎞"] },
  symbols: { icon: "❤️", label: "Ký hiệu", keywords: ["ký hiệu","tim","yêu","thương","like","thích"], emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️"] },
  flags: { icon: "🏁", label: "Cờ", keywords: ["cờ","quốc kỳ","việt"], emojis: ["🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🇻🇳","🇹🇭","🇸🇬","🇲🇾","🇮🇩","🇵🇭","🇯🇵","🇰🇷","🇨🇳","🇮🇳","🇺🇸","🇬🇧"] }
};

function EmojiPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("recent");
  const popupRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("recentEmojis");
      if (saved) setRecent(JSON.parse(saved));
    } catch {}
  }, []);

  const addToRecent = (emoji) => {
    const updated = [emoji, ...recent.filter((e) => e !== emoji)].slice(0, 20);
    setRecent(updated);
    try { localStorage.setItem("recentEmojis", JSON.stringify(updated)); } catch {}
  };

  const handleSelect = (emoji) => {
    addToRecent(emoji);
    onSelect(emoji);
  };

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const normalize = (str = "") => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const matchedCategories = useMemo(() => {
    if (!search.trim()) return null;
    const q = normalize(search);
    const result = {};
    Object.entries(EMOJI_CATEGORIES).forEach(([key, cat]) => {
      const matchLabel = normalize(cat.label).includes(q);
      const matchKeywords = cat.keywords.some((kw) => normalize(kw).includes(q));
      if (matchLabel || matchKeywords) {
        result[key] = cat;
      }
    });
    return result;
  }, [search]);

  const isSearching = search.trim().length > 0;

  let activeEmojis = [];
  let activeLabel = "";

  if (isSearching && matchedCategories) {
    activeEmojis = Object.values(matchedCategories).flatMap((cat) => cat.emojis);
    activeLabel = `Kết quả cho "${search}"`;
  } else if (selectedCategory) {
    const cat = EMOJI_CATEGORIES[selectedCategory];
    activeEmojis = cat?.emojis || [];
    activeLabel = cat?.label || "";
  }

  const categoryKeys = Object.keys(EMOJI_CATEGORIES);

  return (
    <div className="emoji-picker-popup" ref={popupRef}>
      <div className="emoji-picker-header">
        <div className="emoji-search">
          <span className="emoji-search-icon">🔍</span>
          <input
            ref={searchRef}
            placeholder="Tìm kiếm emoji..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="emoji-search-clear" onClick={() => setSearch("")}>✕</button>}
        </div>
      </div>
      {activeLabel && <div className="emoji-category-title">{activeLabel}</div>}
      <div className="emoji-picker-grid">
        {activeEmojis.length === 0 && (
          <div className="emoji-empty">Không có emoji nào</div>
        )}
        {activeEmojis.map((emoji) => (
          <button key={emoji} type="button" className="emoji-item" onClick={() => handleSelect(emoji)} title={emoji}>
            {emoji}
          </button>
        ))}
      </div>
      <div className="emoji-picker-categories">
        {categoryKeys.map((key) => {
          const cat = EMOJI_CATEGORIES[key];
          return (
            <button
              key={key}
              type="button"
              className={`emoji-category ${selectedCategory === key ? "active" : ""}`}
              onClick={() => { setSelectedCategory(key); setSearch(""); }}
              title={cat.label}
            >
              {cat.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default EmojiPicker;
