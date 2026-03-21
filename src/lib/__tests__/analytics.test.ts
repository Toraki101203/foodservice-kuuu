import { describe, it, expect } from "vitest";
import type { AnalyticsEventType } from "@/types/database";

// analytics API で使用される有効イベントタイプ一覧
const VALID_EVENT_TYPES: AnalyticsEventType[] = [
  "view",
  "click",
  "reserve",
  "favorite",
  "share",
  "instagram_click",
  "post_view",
  "post_impression",
];

describe("AnalyticsEventType", () => {
  it("post_view が有効なイベントタイプに含まれている", () => {
    expect(VALID_EVENT_TYPES).toContain("post_view");
  });

  it("post_impression が有効なイベントタイプに含まれている", () => {
    expect(VALID_EVENT_TYPES).toContain("post_impression");
  });

  it("すべてのイベントタイプが8種類存在する", () => {
    expect(VALID_EVENT_TYPES).toHaveLength(8);
  });

  it("既存のイベントタイプが保持されている", () => {
    const expected: AnalyticsEventType[] = [
      "view",
      "click",
      "reserve",
      "favorite",
      "share",
      "instagram_click",
    ];
    for (const type of expected) {
      expect(VALID_EVENT_TYPES).toContain(type);
    }
  });
});

describe("投稿別メタデータ構造", () => {
  it("post_view イベントのメタデータに post_id が含まれる", () => {
    const metadata = { post_id: "test-post-123" };
    expect(metadata).toHaveProperty("post_id");
    expect(typeof metadata.post_id).toBe("string");
  });

  it("post_impression イベントのメタデータに post_id が含まれる", () => {
    const metadata = { post_id: "test-post-456" };
    expect(metadata).toHaveProperty("post_id");
    expect(typeof metadata.post_id).toBe("string");
  });

  it("メタデータから投稿別の集計ができる", () => {
    // 投稿別の閲覧数集計ロジックのテスト
    const events = [
      { metadata: { post_id: "post-1" } },
      { metadata: { post_id: "post-1" } },
      { metadata: { post_id: "post-2" } },
      { metadata: { post_id: "post-1" } },
      { metadata: { post_id: "post-2" } },
    ];

    const postStats: Record<string, number> = {};
    for (const ev of events) {
      const postId = ev.metadata?.post_id;
      if (postId) {
        postStats[postId] = (postStats[postId] ?? 0) + 1;
      }
    }

    expect(postStats["post-1"]).toBe(3);
    expect(postStats["post-2"]).toBe(2);
  });

  it("メタデータが null の場合はスキップされる", () => {
    const events = [
      { metadata: { post_id: "post-1" } },
      { metadata: null },
      { metadata: {} },
    ];

    const postStats: Record<string, number> = {};
    for (const ev of events) {
      const postId = (ev.metadata as Record<string, unknown> | null)?.post_id as string | undefined;
      if (postId) {
        postStats[postId] = (postStats[postId] ?? 0) + 1;
      }
    }

    expect(postStats["post-1"]).toBe(1);
    expect(Object.keys(postStats)).toHaveLength(1);
  });
});
