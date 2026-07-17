import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = { title: "全球国际工程招标预警系统", description: "内部使用的国际工程招标自动监控、AI核验与推送系统" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="zh-CN"><body>{children}</body></html>; }
