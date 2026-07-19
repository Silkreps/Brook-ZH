"use client";

import { useState, useTransition } from "react";

export function CleanupButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState("");
  return <div><button className="button" disabled={pending} onClick={() => startTransition(async () => {
    setResult("正在清理和重新分类…");
    try {
      const response = await fetch("/api/admin/cleanup", { method: "POST" });
      const body = await response.json();
      setResult(JSON.stringify(body, null, 2));
    } catch (error) { setResult(`操作失败：${error instanceof Error ? error.message : String(error)}`); }
  })}>{pending ? "处理中…" : "清理旧数据并重新分类"}</button>{result && <pre className="result-box">{result}</pre>}</div>;
}
