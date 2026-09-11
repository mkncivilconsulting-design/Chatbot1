import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(readFileSync(".env","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1)]));
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
// Cùng logic với coYeuCauDaDuyet trong lib/quote-requests.ts
async function co(email) {
  const mau = email.replace(/[\%_]/g, (c) => `\${c}`);
  const { count, error } = await db.from("quote_requests").select("id", { count: "exact", head: true }).ilike("email", mau).eq("trang_thai", "da_duyet");
  return error ? "LỖI " + error.message : (count ?? 0) > 0;
}
for (const e of ["mknpix@gmail.com", "mknpi_@gmail.com", "%@gmail.com", "chua-co@example.com"]) console.log(e.padEnd(22), "->", await co(e));
