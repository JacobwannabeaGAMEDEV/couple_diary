// src/CoupleDiary.jsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import { Heart, Calendar, User, Trash2, Filter } from "lucide-react";

// 時間格式轉換
function tsToDisplay(ts) {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return { date: String(ts), time: "", taipei: "", prague: "" };

  const taipei = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit" });
  const prague = new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague", hour: "2-digit", minute: "2-digit" });

  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    taipei: taipei.format(d),
    prague: prague.format(d)
  };
}


const moodOptions = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😍", label: "In Love" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😴", label: "Tired" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "🥰", label: "Loved" },
  { emoji: "😎", label: "Cool" },
  { emoji: "🤗", label: "Grateful" },
  { emoji: "😆", label: "Excited" },
  { emoji: "🤔", label: "Thoughtful" },
  { emoji: "😌", label: "Peaceful" },
  { emoji: "😘", label: "Romantic" },
];

export default function CoupleDiary() {
  const [entries, setEntries] = useState([]);
  const [currentNote, setCurrentNote] = useState("");
  const [selectedMood, setSelectedMood] = useState("😊");
  const [selectedPerson, setSelectedPerson] = useState("me");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [filterPerson, setFilterPerson] = useState("all");
  const [filterMood, setFilterMood] = useState("all");
  const [maxEntries, setMaxEntries] = useState(50);

  // 讀取資料
  async function fetchEntries() {
    setSyncing(true); setError("");
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .order("ts", { ascending: false })
      .limit(500);
    if (error) { setError("讀取失敗：" + error.message); setEntries([]); }
    else {
      setEntries(
        data.map((r) => ({
          id: r.id,
          person: r.person,
          mood: r.mood,
          note: r.note,
          _tsRaw: r.ts,
          ...tsToDisplay(r.ts),
        }))
      );
    }
    setSyncing(false);
  }

  // 當頁面第一次渲染時，抓取資料並訂閱 Realtime 更新
  useEffect(() => {
    fetchEntries();
    const channel = supabase
      .channel("entries-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "entries" }, fetchEntries)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  // 新增一筆日記
  async function addEntry() {
    if (!currentNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      user_id: user.id,
      ts: new Date().toISOString(),
      person: selectedPerson,
      mood: selectedMood,
      note: currentNote.trim(),
    };
    const { error } = await supabase.from("entries").insert(payload);
    if (error) { setError("寫入失敗：" + error.message); return; }
    setCurrentNote(""); setSelectedMood("😊");

    // 新增後即時刷新資料
    fetchEntries();
  }

  // 刪除一筆日記
  async function deleteEntry(entry) {
    const { error } = await supabase.from("entries").delete().eq("id", entry.id);
    if (error) { setError("刪除失敗：" + error.message); return; }

    // 刪除後即時刷新資料
    fetchEntries();
  }

  // 篩選資料
  const filtered = useMemo(() => {
    return entries
      .filter(e =>
        (filterPerson === "all" || e.person === filterPerson) &&
        (filterMood === "all" || e.mood === filterMood)
      )
      .slice(0, Math.max(1, Number(maxEntries) || 50));
  }, [entries, filterPerson, filterMood, maxEntries]);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: 24, background: "linear-gradient(135deg,#fff0f5,#f5f0ff)", minHeight: "100vh" }}>
      <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 6px 24px rgba(0,0,0,.06)", padding: 20, marginBottom: 16 }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 28, margin: 0 }}>
          <Heart color="#ef4444" /> Our Diary
        </h1>
        <p style={{ color: "#6b7280", marginTop: 6 }}>Share your moments together</p>

        {/* Entry form */}
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {/* who */}
          <div>
            <label style={{ fontSize: 12, color: "#374151" }}>Who's writing?</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button
                onClick={() => setSelectedPerson("me")}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, border: "2px solid",
                  borderColor: selectedPerson === "me" ? "#3b82f6" : "#e5e7eb",
                  background: selectedPerson === "me" ? "#eff6ff" : "#fff"
                }}
              >
                <User size={16} /> Joyce
              </button>
              <button
                onClick={() => setSelectedPerson("boyfriend")}
                style={{
                  flex: 1, padding: "10px 12px", borderRadius: 10, border: "2px solid",
                  borderColor: selectedPerson === "boyfriend" ? "#a855f7" : "#e5e7eb",
                  background: selectedPerson === "boyfriend" ? "#faf5ff" : "#fff"
                }}
              >
                <Heart size={16} /> Mark
              </button>
            </div>
          </div>

          {/* mood */}
          <div>
            <label style={{ fontSize: 12, color: "#374151" }}>How are you feeling?</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginTop: 6 }}>
              {moodOptions.map(m => (
                <button
                  key={m.emoji}
                  onClick={() => setSelectedMood(m.emoji)}
                  title={m.label}
                  style={{
                    padding: 8, borderRadius: 10,
                    background: selectedMood === m.emoji ? "#fef3c7" : "#f9fafb",
                    border: "1px solid #e5e7eb", fontSize: 22
                  }}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* note */}
          <div>
            <label style={{ fontSize: 12, color: "#374151" }}>Your note</label>
            <textarea
              value={currentNote}
              onChange={(e) => setCurrentNote(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              style={{ width: "100%", padding: 12, border: "1px solid #e5e7eb", borderRadius: 10, resize: "vertical" }}
            />
          </div>

          <button
            onClick={addEntry}
            disabled={!currentNote.trim()}
            style={{
              width: "100%", padding: 12, borderRadius: 10, border: "none",
              color: "#fff", background: "linear-gradient(90deg,#ec4899,#a855f7)",
              opacity: currentNote.trim() ? 1 : .5, cursor: currentNote.trim() ? "pointer" : "not-allowed"
            }}
          >
            Add Entry
          </button>

          <div style={{ fontSize: 12, color: "#6b7280" }}>
            <span style={{ marginRight: 8 }}>{syncing ? "同步中…" : "已同步"}</span>
            {error && <span style={{ color: "#ef4444" }}>{error}</span>}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,.05)", padding: 12, marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Filter size={16} />
        <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 6 }}>
          <option value="all">All Persons</option>
          <option value="me">Joyce</option>
          <option value="boyfriend">Mark</option>
        </select>
        <select value={filterMood} onChange={(e) => setFilterMood(e.target.value)} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 6 }}>
          <option value="all">All Moods</option>
          {moodOptions.map(m => <option key={m.emoji} value={m.emoji}>{m.label}</option>)}
        </select>
        <input
          type="number"
          min={1}
          value={maxEntries}
          onChange={(e) => setMaxEntries(e.target.value)}
          style={{ width: 80, border: "1px solid #e5e7eb", borderRadius: 8, padding: 6 }}
        />
        <span style={{ fontSize: 12, color: "#6b7280" }}>entries max</span>
      </div>

      {/* List */}
      <div style={{ display: "grid", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#6b7280", padding: 40 }}>
            <Calendar size={48} style={{ opacity: .5, marginBottom: 8 }} />
            <p>No entries yet.</p>
          </div>
        ) : (
          filtered.map(entry => (
            <div key={entry.id} style={{
              background: "#fff", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,.05)",
              padding: 16, borderLeft: `4px solid ${entry.person === "me" ? "#3b82f6" : "#a855f7"}`
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 22 }}>{entry.mood}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: entry.person === "me" ? "#2563eb" : "#7c3aed" }}>
                      {entry.person === "me" ? "Joyce" : "Mark"}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {entry.date} {entry.time} | 台北 {entry.taipei} | 捷克 {entry.prague}
                    </div>
                  </div>
                </div>
                <button onClick={() => deleteEntry(entry)} title="刪除"
                  style={{ color: "#9ca3af", background: "transparent", border: "none", cursor: "pointer" }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={{ color: "#374151", whiteSpace: "pre-wrap" }}>{entry.note}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
