import "server-only";

// Dùng `||` chứ không phải `??`: GEMINI_MODEL= (rỗng) trong .env phải rơi về mặc định.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

export type LoaiGiayTo = "bang_diem" | "ielts" | "giay_to_tuy_than";

export interface TrichXuatBangDiem {
  hoTen: string | null;
  ngaySinh: string | null;
  diemTongKet: number | null;
}

export interface TrichXuatIelts {
  hoTen: string | null;
  nghe: number | null;
  doc: number | null;
  viet: number | null;
  noi: number | null;
  diemTong: number | null;
  ngayThi: string | null;
}

export interface TrichXuatGiayTo {
  hoTen: string | null;
  ngaySinh: string | null;
  soGiayTo: string | null;
}

export type DuLieuTrichXuat = TrichXuatBangDiem | TrichXuatIelts | TrichXuatGiayTo;

/** Định dạng file chấp nhận cho từng loại giấy tờ. */
export const MIME_CHO_PHEP: Record<LoaiGiayTo, string[]> = {
  bang_diem: ["application/pdf"],
  ielts: ["image/jpeg", "image/png", "image/webp"],
  giay_to_tuy_than: ["image/jpeg", "image/png", "image/webp"],
};

export const KICH_THUOC_TOI_DA = 10 * 1024 * 1024; // 10 MB, khớp giới hạn của bucket

export const TEN_LOAI: Record<LoaiGiayTo, string> = {
  bang_diem: "Bảng điểm",
  ielts: "Chứng chỉ IELTS",
  giay_to_tuy_than: "CMND/CCCD hoặc hộ chiếu",
};

const CHUNG =
  "Bạn đọc ảnh chụp / file giấy tờ và trích xuất thông tin.\n" +
  "QUY TẮC: chỉ lấy thông tin ĐỌC ĐƯỢC trên giấy tờ. TUYỆT ĐỐI không suy đoán, không bịa.\n" +
  "Trường nào không đọc được hoặc giấy tờ không có thì để null.\n" +
  "Mọi ngày tháng ghi theo dạng DD/MM/YYYY.";

const CAU_HINH: Record<LoaiGiayTo, { huongDan: string; schema: object }> = {
  bang_diem: {
    huongDan: `${CHUNG}\nĐây là BẢNG ĐIỂM học tập. diemTongKet là điểm trung bình chung / điểm tổng kết theo thang 10. Nếu bảng điểm dùng thang khác (4.0, 100...) thì vẫn ghi đúng số in trên giấy, không tự quy đổi.`,
    schema: {
      type: "OBJECT",
      properties: {
        hoTen: { type: "STRING", nullable: true },
        ngaySinh: { type: "STRING", nullable: true },
        diemTongKet: { type: "NUMBER", nullable: true },
      },
    },
  },
  ielts: {
    huongDan: `${CHUNG}\nĐây là CHỨNG CHỈ IELTS. nghe = Listening, doc = Reading, viet = Writing, noi = Speaking, diemTong = Overall Band Score. ngayThi là ngày thi (Test Date).`,
    schema: {
      type: "OBJECT",
      properties: {
        hoTen: { type: "STRING", nullable: true },
        nghe: { type: "NUMBER", nullable: true },
        doc: { type: "NUMBER", nullable: true },
        viet: { type: "NUMBER", nullable: true },
        noi: { type: "NUMBER", nullable: true },
        diemTong: { type: "NUMBER", nullable: true },
        ngayThi: { type: "STRING", nullable: true },
      },
    },
  },
  giay_to_tuy_than: {
    huongDan: `${CHUNG}
Đây là CMND/CCCD của Việt Nam hoặc HỘ CHIẾU.
soGiayTo là dãy định danh in trên giấy tờ:
- Căn cước công dân: nhãn "Số" hoặc "No.", nằm dưới dòng "Căn cước công dân / Citizen Identity Card", gồm ĐÚNG 12 chữ số.
- CMND cũ: 9 chữ số.
- Hộ chiếu: nhãn "Số hộ chiếu / Passport No.", gồm 1 chữ cái và 7 chữ số.
Chỉ ghi phần chữ và số, bỏ mọi dấu cách và dấu chấm. Đọc kỹ từng chữ số một.
Nếu vùng chứa số bị che, bị làm mờ, loá sáng hay mất nét thì để null — đừng đoán theo định dạng.`,
    schema: {
      type: "OBJECT",
      properties: {
        hoTen: { type: "STRING", nullable: true },
        ngaySinh: { type: "STRING", nullable: true },
        soGiayTo: { type: "STRING", nullable: true },
      },
    },
  },
};

function chuoiHoacNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

function soHoacNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function chuanHoa(loai: LoaiGiayTo, raw: Record<string, unknown>): DuLieuTrichXuat {
  switch (loai) {
    case "bang_diem":
      return {
        hoTen: chuoiHoacNull(raw.hoTen),
        ngaySinh: chuoiHoacNull(raw.ngaySinh),
        diemTongKet: soHoacNull(raw.diemTongKet),
      };
    case "ielts":
      return {
        hoTen: chuoiHoacNull(raw.hoTen),
        nghe: soHoacNull(raw.nghe),
        doc: soHoacNull(raw.doc),
        viet: soHoacNull(raw.viet),
        noi: soHoacNull(raw.noi),
        diemTong: soHoacNull(raw.diemTong),
        ngayThi: chuoiHoacNull(raw.ngayThi),
      };
    case "giay_to_tuy_than":
      return {
        hoTen: chuoiHoacNull(raw.hoTen),
        ngaySinh: chuoiHoacNull(raw.ngaySinh),
        soGiayTo: chuoiHoacNull(raw.soGiayTo),
      };
  }
}

/** Đọc được ít nhất một trường có nghĩa. */
export function docDuocGiTuGiayTo(du: DuLieuTrichXuat): boolean {
  return Object.values(du).some((v) => v !== null);
}

/**
 * Những trường BẮT BUỘC phải đọc được thì giấy tờ mới dùng được cho hồ sơ.
 * Thiếu một trong số này thì giấy tờ chưa đạt, dù các trường khác đọc tốt —
 * ví dụ CCCD đọc được tên và ngày sinh nhưng số thẻ bị che thì vẫn phải nộp lại.
 */
const TRUONG_BAT_BUOC: Record<LoaiGiayTo, { khoa: string; nhan: string }[]> = {
  bang_diem: [
    { khoa: "hoTen", nhan: "họ tên" },
    { khoa: "diemTongKet", nhan: "điểm học tập tổng kết" },
  ],
  ielts: [
    { khoa: "hoTen", nhan: "họ tên trên chứng chỉ" },
    { khoa: "diemTong", nhan: "điểm tổng (Overall)" },
  ],
  giay_to_tuy_than: [
    { khoa: "hoTen", nhan: "họ tên" },
    { khoa: "ngaySinh", nhan: "ngày sinh" },
    { khoa: "soGiayTo", nhan: "số giấy tờ" },
  ],
};

/** Tên các trường bắt buộc mà không đọc được. Rỗng nghĩa là giấy tờ đạt. */
export function thieuTruongNao(loai: LoaiGiayTo, du: DuLieuTrichXuat): string[] {
  const ban = du as unknown as Record<string, unknown>;
  return TRUONG_BAT_BUOC[loai].filter((t) => ban[t.khoa] === null).map((t) => t.nhan);
}

/**
 * Gửi file cho Gemini đọc. Trả về null nếu gọi không được hoặc kết quả hỏng —
 * phía gọi tự quyết định đánh dấu giấy tờ là "cần nộp lại".
 */
export async function trichXuatGiayTo(
  loai: LoaiGiayTo,
  bytes: Uint8Array,
  mime: string,
): Promise<DuLieuTrichXuat | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[document-extraction] Thiếu GEMINI_API_KEY trong .env");
    return null;
  }

  const { huongDan, schema } = CAU_HINH[loai];

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: huongDan }] },
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: mime, data: Buffer.from(bytes).toString("base64") } },
                { text: `Trích xuất thông tin từ ${TEN_LOAI[loai].toLowerCase()} này.` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0, // đọc giấy tờ thì cần ổn định, không cần sáng tạo
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
      },
    );
  } catch (err) {
    console.error("[document-extraction] Không gọi được Gemini:", err);
    return null;
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("[document-extraction] Gemini trả lỗi:", res.status, data?.error?.message);
    return null;
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) {
    console.error("[document-extraction] Gemini trả về rỗng");
    return null;
  }

  try {
    return chuanHoa(loai, JSON.parse(text));
  } catch {
    console.error("[document-extraction] Không parse được JSON:", text.slice(0, 300));
    return null;
  }
}
