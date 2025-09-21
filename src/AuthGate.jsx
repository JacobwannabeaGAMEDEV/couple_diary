// src/AuthGate.jsx
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

/**
 * AuthGate：未登入顯示 Email 登入畫面；登入後顯示 children。
 * 關鍵：signInWithOtp(..., { shouldCreateUser:false }) 只允許已存在（被邀請）帳號登入
 */
export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 1) 若魔法連結帶著 code 或 access_token，這一步會把它換成 Session
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href);
      } catch (_) {
        // 沒 code 時會丟錯，忽略即可
      }

      // 2) 讀取現有 session
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);

      // 3) 監聽後續登入/登出
      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
      return () => sub.subscription.unsubscribe();
    })();
  }, []);

  if (loading) return <div style={{ padding: 16 }}>載入中…</div>;
  if (!session) return <EmailLogin />;

  return children;
}

function EmailLogin() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState('');

  // 依環境自動決定回跳網址（本地/上線都可）
  const redirectTo = process.env.NODE_ENV === "development"
    ? "http://localhost:5173"
    : `${window.location.origin}${window.location.pathname}`;

  async function sendMagicLink() {
    setMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,           // 只允許已存在（已被邀請）的帳號
        emailRedirectTo: redirectTo        // 登入後回到目前站點
      }
    });
    if (error) {
      // 常見錯誤：Signups not allowed（帳號不存在或沒被邀請）
      setMsg(error.message);
      alert(error.message);
    } else {
      setSent(true);
    }
  }

  return sent ? (
    <div style={{ padding: 16 }}>已寄出登入連結，去信箱點一下即可登入。</div>
  ) : (
    <div style={{
      maxWidth: 360, margin: '64px auto', padding: 24,
      border: '1px solid #eee', borderRadius: 12, background: '#fff'
    }}>
      <h2 style={{ marginBottom: 8 }}>登入 Our Diary</h2>
      <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
        僅限受邀信箱（必須先在 Supabase 後台 Invite）
      </p>

      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ width: '100%', padding: 10, border: '1px solid #ccc', borderRadius: 8, marginBottom: 12 }}
      />
      <button
        onClick={sendMagicLink}
        style={{ width: '100%', padding: 10, border: 'none', borderRadius: 8, background: '#ec4899', color: '#fff' }}
      >
        寄送登入連結
      </button>

      {msg && <div style={{ marginTop: 12, fontSize: 12, color: '#c00' }}>{msg}</div>}
    </div>
  );
}
