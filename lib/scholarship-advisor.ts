import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-server";

// Dùng `||` chứ không phải `??`: GEMINI_MODEL= (rỗng) trong .env phải rơi về mặc định.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Trần số vòng gọi công cụ. Model tự quyết định tra trường nào, nên phải có chốt
// chặn để một lượt hỏng không kéo theo vòng lặp gọi API vô hạn.
const SO_VONG_TOI_DA = 4;

export interface HoSoDeGoiY {
  gpa: number | null;
  ielts: number | null;
  /** Tên các trường học viên đã đạt điểm chuẩn. */
  truongDat: string[];
}

// ---------------------------------------------------------------------------
// CÔNG CỤ cho model gọi.
//
// Cố ý KHÔNG viết cứng luật so sánh điểm: bên mình chỉ đưa ra một công cụ tra
// cứu học bổng theo trường. Chính model quyết định tra trường nào, rồi tự đối
// chiếu điều kiện với điểm của học viên.
// ---------------------------------------------------------------------------
const KHAI_BAO_CONG_CU = {
  functionDeclarations: [
    {
      name: "traCuuHocBong",
      description:
        "Tra cứu các học bổng hiện có của một hoặc nhiều trường. Trả về tên học bổng, " +
        "điều kiện tối thiểu (điểm học tập và/hoặc IELTS) và mức hỗ trợ. " +
        "Trường không có học bổng nào sẽ trả về danh sách rỗng.",
      parameters: {
        type: "OBJECT",
        properties: {
          tenTruong: {
            type: "ARRAY",
            items: { type: "STRING" },
            description:
              "Danh sách tên trường cần tra cứu, viết đúng như tên đã nêu trong hồ sơ học viên.",
          },
        },
        required: ["tenTruong"],
      },
    },
  ],
};

interface HocBongTraVe {
  tenHocBong: string;
  dieuKien: string;
  diemHocTapToiThieu: number | null;
  ieltsToiThieu: number | null;
  mucHoTro: string;
}

/** Thực thi công cụ: đọc học bổng của các trường model yêu cầu. */
async function chayTraCuuHocBong(
  tenTruong: string[],
): Promise<Record<string, HocBongTraVe[]>> {
  const ket: Record<string, HocBongTraVe[]> = {};
  for (const t of tenTruong) ket[t] = [];

  const db = getSupabaseAdmin();
  if (!db || tenTruong.length === 0) return ket;

  const { data, error } = await db
    .from("scholarships")
    .select("ten, min_gpa, min_ielts, dieu_kien, ho_tro_mo_ta, schools!inner(name)");

  if (error) {
    console.error("[scholarship-advisor] Không đọc được học bổng:", error.message);
    return ket;
  }

  // So khớp không phân biệt hoa thường và khoảng trắng thừa, phòng khi model
  // viết lại tên trường hơi khác.
  const chuanHoa = (s: string) => s.trim().toLowerCase();
  const banDo = new Map(tenTruong.map((t) => [chuanHoa(t), t]));

  for (const row of data ?? []) {
    const truong = row.schools as unknown as { name?: string } | null;
    const tenGoc = banDo.get(chuanHoa(truong?.name ?? ""));
    if (!tenGoc) continue;
    ket[tenGoc].push({
      tenHocBong: row.ten as string,
      dieuKien: row.dieu_kien as string,
      diemHocTapToiThieu: row.min_gpa === null ? null : Number(row.min_gpa),
      ieltsToiThieu: row.min_ielts === null ? null : Number(row.min_ielts),
      mucHoTro: row.ho_tro_mo_ta as string,
    });
  }
  return ket;
}

const HUONG_DAN = `Bạn là trợ lý tư vấn du học của DuHoc24, nói chuyện với học viên bằng tiếng Việt.

NHIỆM VỤ: dựa trên hồ sơ và danh sách trường học viên đã đạt điểm chuẩn, tìm xem học viên đủ điều kiện những học bổng nào.

CÁCH LÀM:
1. Dùng công cụ traCuuHocBong để tra học bổng của những trường học viên đã đạt điểm chuẩn. Bạn tự quyết định tra trường nào; nên tra hết một lượt trong MỘT lần gọi thay vì gọi nhiều lần.
2. Đối chiếu điều kiện từng học bổng với điểm của học viên rồi kết luận.

QUY TẮC:
- CHỈ nói về học bổng do công cụ trả về. TUYỆT ĐỐI không bịa tên học bổng, điều kiện hay mức hỗ trợ.
- Trường nào không có học bổng trong hệ thống thì nói thẳng là chưa có, đừng suy đoán.
- Nếu học viên thiếu điểm cho một học bổng, nói rõ còn thiếu bao nhiêu (ví dụ "IELTS 6.5, cần 7.0").
- Không cam kết học viên sẽ được cấp học bổng — đây chỉ là đối chiếu điều kiện tối thiểu, việc xét duyệt do trường quyết định.
- Trả lời gọn. Xưng "mình", gọi học viên là "bạn".
- Viết bằng VĂN BẢN THUẦN. KHÔNG dùng ký hiệu markdown như ** hay # hay \`\`\` — trang web hiển thị nguyên văn nên các ký hiệu đó sẽ lộ ra. Cần gạch đầu dòng thì dùng dấu "- " ở đầu dòng.
- Kết thúc bằng một câu mời để lại liên hệ nếu bạn ấy muốn tư vấn viên hỗ trợ nộp hồ sơ học bổng.`;

/**
 * Chạy vòng gọi công cụ với Gemini. Trả về câu gợi ý, hoặc null nếu hỏng.
 */
export async function goiYHocBong(hoSo: HoSoDeGoiY): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[scholarship-advisor] Thiếu GEMINI_API_KEY trong .env");
    return null;
  }
  if (hoSo.truongDat.length === 0) return null;

  const moTaHoSo = `Hồ sơ học viên:
- Điểm học tập (thang 10): ${hoSo.gpa ?? "chưa có"}
- Điểm IELTS: ${hoSo.ielts ?? "chưa có"}

Các trường học viên ĐÃ ĐẠT điểm chuẩn:
${hoSo.truongDat.map((t) => `- ${t}`).join("\n")}

Hãy tra cứu học bổng của những trường này và cho biết bạn ấy đủ điều kiện học bổng nào.`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contents: any[] = [{ role: "user", parts: [{ text: moTaHoSo }] }];

  for (let vong = 0; vong < SO_VONG_TOI_DA; vong++) {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: HUONG_DAN }] },
            contents,
            tools: [KHAI_BAO_CONG_CU],
            generationConfig: { temperature: 0.2 },
          }),
        },
      );
    } catch (err) {
      console.error("[scholarship-advisor] Không gọi được Gemini:", err);
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error("[scholarship-advisor] Gemini trả lỗi:", res.status, data?.error?.message);
      return null;
    }

    const noiDung = data?.candidates?.[0]?.content;
    const parts = noiDung?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loiGoi = parts.filter((p: any) => p.functionCall);

    if (loiGoi.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const text = parts.map((p: any) => p.text ?? "").join("").trim();
      if (!text) {
        console.error("[scholarship-advisor] Gemini trả về rỗng");
        return null;
      }
      return text;
    }

    // Model muốn tra cứu — chạy công cụ rồi đưa kết quả trở lại.
    contents.push(noiDung);
    const traLoiCongCu = [];
    for (const p of loiGoi) {
      const ten = p.functionCall.name as string;
      if (ten !== "traCuuHocBong") {
        console.error("[scholarship-advisor] Model gọi công cụ lạ:", ten);
        traLoiCongCu.push({
          functionResponse: { name: ten, response: { loi: "Không có công cụ này." } },
        });
        continue;
      }
      const tenTruong: string[] = Array.isArray(p.functionCall.args?.tenTruong)
        ? p.functionCall.args.tenTruong.filter((x: unknown) => typeof x === "string")
        : [];
      const ketQua = await chayTraCuuHocBong(tenTruong);
      traLoiCongCu.push({
        functionResponse: { name: ten, response: { hocBongTheoTruong: ketQua } },
      });
    }
    contents.push({ role: "user", parts: traLoiCongCu });
  }

  console.error("[scholarship-advisor] Vượt quá số vòng gọi công cụ cho phép");
  return null;
}

// --- Lưu / đọc kết quả gợi ý -------------------------------------------------

export interface GoiYDaLuu {
  noiDung: string;
  luc: string;
  soTruong: number;
}

export async function docGoiY(profileId: string): Promise<GoiYDaLuu | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from("student_profiles")
    .select("goi_y_hoc_bong, goi_y_luc, goi_y_so_truong")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[scholarship-advisor] Không đọc được gợi ý:", error.message);
    return null;
  }
  if (!data?.goi_y_hoc_bong) return null;

  return {
    noiDung: data.goi_y_hoc_bong as string,
    luc: data.goi_y_luc as string,
    soTruong: (data.goi_y_so_truong as number) ?? 0,
  };
}

export async function luuGoiY(
  profileId: string,
  noiDung: string,
  soTruong: number,
): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { error } = await db
    .from("student_profiles")
    .update({
      goi_y_hoc_bong: noiDung,
      goi_y_luc: new Date().toISOString(),
      goi_y_so_truong: soTruong,
    })
    .eq("id", profileId);

  if (error) {
    console.error("[scholarship-advisor] Không lưu được gợi ý:", error.message);
    return false;
  }
  return true;
}
