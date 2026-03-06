import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    const { url } = await request.json();

    if (!url || !url.includes("instagram.com")) {
        return NextResponse.json({ error: "無効なURLです" }, { status: 400 });
    }

    // oEmbed API (Facebook App Token required)
    // If no token, fall back to basic URL extraction
    const appToken = process.env.FACEBOOK_APP_TOKEN;

    if (appToken) {
        try {
            const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${appToken}`;
            const res = await fetch(oembedUrl);
            if (res.ok) {
                const data = await res.json();
                return NextResponse.json(data);
            }
        } catch {
            // oEmbed API 失敗時はフォールバック
        }
    }

    // フォールバック: URLの検証のみ行い、基本情報を返す
    // ユーザーは必要に応じて画像URLを手動で指定
    return NextResponse.json({
        url,
        title: "",
        thumbnail_url: null,
        author_name: "",
    });
}
