import { z } from "zod";
import { isAdminSession } from "@/lib/admin-auth";
import { getServiceSupabase } from "@/lib/supabase";
import { formatSupabaseError, formatUnknownError } from "@/lib/error-utils";

const schema = z.object({
  key: z.string().trim().min(3).max(300).regex(/^[A-Za-z0-9._:/-]+$/),
  section: z.enum(["pipeline","prequalification","tender"]).default("pipeline"),
  titleZh: z.string().trim().min(3).max(300),
  titleEn: z.string().trim().min(3).max(300),
  country: z.string().trim().min(2).max(100),
  industry: z.string().trim().min(2).max(120),
  financier: z.string().trim().min(2).max(240),
  owner: z.string().trim().max(240).optional(),
  stage: z.string().trim().min(2).max(200),
  procurementNo: z.string().trim().max(180).optional(),
  summaryZh: z.string().trim().min(10).max(6000),
  amountUsd: z.number().finite().nonnegative().optional(),
  links: z.array(z.object({
    title: z.string().trim().min(2).max(180),
    url: z.string().url().refine(v=>v.startsWith("https://")),
  }).strict()).min(1).max(50),
}).strict();

export async function POST(request: Request) {
  if (!(await isAdminSession())) return Response.json({error:"未授权"}, {status:401});
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host)
    return Response.json({error:"跨站请求已拒绝"}, {status:403});
  if (!(request.headers.get("content-type") || "").includes("application/json"))
    return Response.json({error:"只接受JSON"}, {status:415});
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({error:parsed.error.issues.map(v=>v.message).join("; ")},{status:400});
    const x=parsed.data;
    if (/^(印度|india|中国|china|cn|prc)$/i.test(x.country))
      return Response.json({error:"国家不符合当前准入要求"},{status:422});
    const db=getServiceSupabase(), sourceKey="manual:"+x.key;
    const {data:existing,error:findError}=await db.from("projects").select("id").eq("source_unique_key",sourceKey).maybeSingle();
    if(findError) throw new Error(formatSupabaseError(findError));
    if(existing) return Response.json({ok:true,created:false,duplicate:true,id:existing.id});
    const {data:row,error:insertError}=await db.from("projects").insert({
      source_unique_key:sourceKey,section:x.section,
      gate:"pending_review",review_status:"pending",
      title_zh:x.titleZh,title_en:x.titleEn,country:x.country,industry:x.industry,
      financier:x.financier,owner:x.owner||null,stage:x.stage,
      procurement_no:x.procurementNo||null,summary_zh:x.summaryZh,scope_zh:x.summaryZh,
      amount_usd:x.amountUsd??null,amount_is_official:false,
      status:"待人工核实",china_eligible:null,translation_status:"translated",
      ai_analysis_status:"pending",
    }).select("id").single();
    if(insertError){
      if(insertError.code==="23505") return Response.json({error:"项目唯一编号已存在"},{status:409});
      throw new Error(formatSupabaseError(insertError));
    }
    const links=[...new Map(x.links.map(a=>[a.url,a])).values()].map(a=>({
      project_id:row.id,link_type:a.title,url:a.url,is_official:true,
      http_status:null,is_pdf:/\\.pdf(?:\\?|$)/i.test(a.url),
    }));
    const {error:linksError}=await db.from("project_links").insert(links);
    if(linksError){
      const {error:rollbackError}=await db.from("projects").delete().eq("id",row.id);
      throw new Error("资料链接写入失败"+(rollbackError?"，请人工检查残留项目":"，已回滚")+": "+formatSupabaseError(linksError));
    }
    return Response.json({ok:true,created:true,id:row.id,links:links.length,reviewStatus:"pending"},{status:201});
  }catch(e){return Response.json({error:formatUnknownError(e)},{status:500});}
}
