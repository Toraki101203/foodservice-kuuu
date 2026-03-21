"use client";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  // ブラウザコンソールにエラー詳細を出力
  console.error("[GlobalError]", error);

  return (
    <html lang="ja">
      <body style={{ padding: 24, fontFamily: "sans-serif" }}>
        <h1 style={{ color: "red" }}>500 エラー</h1>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 16, borderRadius: 8 }}>
          {error.message}
        </pre>
        <pre style={{ whiteSpace: "pre-wrap", background: "#f5f5f5", padding: 16, borderRadius: 8, fontSize: 12, color: "#666" }}>
          {error.stack}
        </pre>
        <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "8px 16px" }}>
          リロード
        </button>
      </body>
    </html>
  );
}
