"use client";

import { useState, useTransition } from "react";

export function RecrawlButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string>("");
  return <div><button className="button" type="button" disabled={isPending} onClick={() => startTransition(async () => {
    setResult("正在调用 /api/cron/run ...");
    try {
      const res = await fetch("/api/cron/run", { method: "POST" });
      const json = await res.json();
      setResult(`${res.ok ? "成功" : "失败"}：${JSON.stringify(json, null, 2)}`);
    } catch (error) {
      setResult(`失败：${error instanceof Error ? error.message : String(error)}`);
    }
  })}>{isPending ? "抓取中..." : "开始重新抓取官方项目"}</button>{result && <pre className="result-box">{result}</pre>}</div>;
}
