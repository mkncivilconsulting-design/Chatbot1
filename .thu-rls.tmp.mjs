// Kiểm tra RLS hồ sơ học viên với HAI tài khoản thử A và B (không gửi email nào).
// Mỗi người có một hồ sơ + một giấy tờ. Đăng nhập bằng publishable key như app,
// rồi thử đọc/ghi hồ sơ của người kia. Cuối cùng thử cả trang /portal thật với
// phiên của A. Dọn sạch user thử khi xong (xoá user → cascade xoá hồ sơ, giấy tờ).
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync("D:/OneDrive - MKN Civil Consulting/CLAUDE CODE TRAINING/Chatbot1/.env", "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const o = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, o);
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];

let loi = 0;
const kiem = (dk, moTa) => { console.log(dk ? "  ĐẠT " : "  HỎNG", moTa); if (!dk) loi++; };

async function taoNguoiThu(ten) {
  const email = `thu-rls-${ten}-${Date.now()}@example.com`;
  const matKhau = randomBytes(12).toString("base64url");
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: matKhau, email_confirm: true });
  if (error) throw error;
  const { data: p } = await admin.from("student_profiles").insert({ user_id: u.user.id }).select("id").single();
  await admin.from("student_documents").insert({
    profile_id: p.id, loai: "bang_diem", ten_file: `BANG-DIEM-CUA-${ten}.pdf`, mime: "application/pdf",
    kich_thuoc: 1, trang_thai: "hop_le", trich_xuat: { hoTen: `Hoc vien ${ten}`, diemTongKet: 8 },
  });
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, o);
  const { data: s, error: e2 } = await client.auth.signInWithPassword({ email, password: matKhau });
  if (e2) throw e2;
  return { ten, userId: u.user.id, profileId: p.id, client, session: s.session };
}

const A = await taoNguoiThu("A");
const B = await taoNguoiThu("B");
try {
  console.log("\n[1] A đọc bảng hồ sơ KHÔNG kèm điều kiện lọc nào");
  const { data: tatCa } = await A.client.from("student_profiles").select("id, user_id");
  kiem(tatCa?.length === 1 && tatCa[0].id === A.profileId, `chỉ thấy đúng 1 hồ sơ của mình (thấy ${tatCa?.length})`);
  const { data: tatCaGT } = await A.client.from("student_documents").select("ten_file");
  kiem(tatCaGT?.length === 1 && tatCaGT[0].ten_file === "BANG-DIEM-CUA-A.pdf", `chỉ thấy giấy tờ của mình (thấy ${tatCaGT?.map((g) => g.ten_file).join(", ")})`);

  console.log("\n[2] A BIẾT id hồ sơ của B và gọi thẳng vào");
  const { data: hsB } = await A.client.from("student_profiles").select("*").eq("id", B.profileId);
  kiem(hsB?.length === 0, "đọc hồ sơ B theo id → rỗng");
  const { data: gtB } = await A.client.from("student_documents").select("*").eq("profile_id", B.profileId);
  kiem(gtB?.length === 0, "đọc giấy tờ B theo profile_id → rỗng");
  const { data: hsBtheoUser } = await A.client.from("student_profiles").select("*").eq("user_id", B.userId);
  kiem(hsBtheoUser?.length === 0, "đọc hồ sơ B theo user_id → rỗng");

  console.log("\n[3] A thử GHI (tự sửa dữ liệu)");
  const { error: eSua } = await A.client.from("student_documents").update({ trang_thai: "hop_le", trich_xuat: { diemTongKet: 10 } }).eq("profile_id", A.profileId);
  kiem(Boolean(eSua), `sửa giấy tờ của chính mình bị chặn (${eSua?.code ?? "KHÔNG LỖI"})`);
  const { error: eThem } = await A.client.from("student_documents").insert({ profile_id: B.profileId, loai: "ielts", ten_file: "x", mime: "image/png", kich_thuoc: 1, trang_thai: "hop_le" });
  kiem(Boolean(eThem), `chèn giấy tờ vào hồ sơ B bị chặn (${eThem?.code ?? "KHÔNG LỖI"})`);
  const { error: eXoa } = await A.client.from("student_profiles").delete().eq("id", B.profileId);
  kiem(Boolean(eXoa), `xoá hồ sơ B bị chặn (${eXoa?.code ?? "KHÔNG LỖI"})`);
  const { data: conB } = await admin.from("student_documents").select("ten_file, trang_thai").eq("profile_id", B.profileId);
  kiem(conB?.length === 1, "dữ liệu của B vẫn nguyên vẹn");

  console.log("\n[4] Người CHƯA đăng nhập (anon)");
  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, o);
  const { data: dA, error: eA } = await anon.from("student_profiles").select("id");
  kiem(Boolean(eA) || dA?.length === 0, `anon đọc hồ sơ → ${eA ? "bị chặn (" + eA.code + ")" : "rỗng"}`);
  const { data: dD, error: eD } = await anon.from("student_documents").select("id");
  kiem(Boolean(eD) || dD?.length === 0, `anon đọc giấy tờ → ${eD ? "bị chặn (" + eD.code + ")" : "rỗng"}`);

  console.log("\n[5] Trang /portal thật, mở bằng phiên đăng nhập của A");
  const giaTri = "base64-" + Buffer.from(JSON.stringify(A.session)).toString("base64url");
  const ten = `sb-${ref}-auth-token`;
  const CHUNK = 3180;
  const cookie = giaTri.length <= CHUNK
    ? `${ten}=${giaTri}`
    : Array.from({ length: Math.ceil(giaTri.length / CHUNK) }, (_, i) => `${ten}.${i}=${giaTri.slice(i * CHUNK, (i + 1) * CHUNK)}`).join("; ");
  const r = await fetch("http://localhost:3000/portal", { headers: { cookie }, redirect: "manual" });
  const html = await r.text();
  kiem(r.status === 200, `/portal trả về ${r.status}`);
  kiem(html.includes("BANG-DIEM-CUA-A.pdf"), "trang hiện giấy tờ của A");
  kiem(!html.includes("BANG-DIEM-CUA-B.pdf") && !html.includes("Hoc vien B"), "trang KHÔNG có gì của B");

  const r2 = await fetch("http://localhost:3000/portal", { redirect: "manual" });
  kiem(r2.status === 307 && r2.headers.get("location")?.startsWith("/login"), `chưa đăng nhập → ${r2.status} ${r2.headers.get("location")}`);
} finally {
  for (const n of [A, B]) {
    const { error } = await admin.auth.admin.deleteUser(n.userId);
    console.log(`\nDọn user thử ${n.ten}:`, error ? "LỖI " + error.message : "ok");
  }
  const { count } = await admin.from("student_profiles").select("id", { count: "exact", head: true }).in("id", [A.profileId, B.profileId]);
  console.log("Hồ sơ thử còn sót:", count);
}
console.log(loi === 0 ? "\n==> TẤT CẢ ĐỀU ĐẠT" : `\n==> ${loi} MỤC HỎNG`);
