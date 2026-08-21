// Nhận diện thô ngôn ngữ tin nhắn của khách: tiếng Việt hay không.
//
// VÌ SAO CẦN: system instruction và toàn bộ dữ liệu đều viết bằng tiếng Việt.
// Chỉ dặn model "trả lời theo ngôn ngữ của khách" là không đủ — ngữ cảnh tiếng
// Việt áp đảo và model vẫn trả lời tiếng Việt dù khách viết tiếng Anh. Nên phía
// server tự xác định rồi chèn một chỉ thị dứt khoát vào prompt.
//
// GIỚI HẠN: đây là heuristic đếm từ, không phải bộ nhận diện ngôn ngữ đầy đủ.
// Nó chỉ phân biệt "tiếng Việt" với "không phải tiếng Việt", và với câu quá
// ngắn hoặc mơ hồ thì trả về "khong_ro" để model tự quyết.

const CO_DAU_TIENG_VIET =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

// Từ tiếng Việt không dấu, đã loại những từ trùng với tiếng Anh ("the", "a", "in"...).
// Cố ý KHÔNG đưa vào đây những âm tiết hay gặp trong TÊN NGƯỜI Việt
// ("van", "anh", "chi", "tu", "ho", "thi"...): bước 5 của luồng hội thoại có
// hỏi họ tên, mà tên người thì không nói lên khách đang dùng ngôn ngữ nào.
const TU_VIET_KHONG_DAU = new Set([
  "em", "minh", "ban", "muon", "khong", "duoc", "nao", "gi",
  "hoc", "truong", "cho", "cua", "voi", "nay", "roi", "chua", "hay", "la",
  "co", "di", "lam", "sao", "bao", "nhieu", "toi", "xin", "cam", "on",
  "nhe", "nha", "vay", "phai", "tot", "xem", "biet", "can", "giup",
  "du", "diem", "hoi", "dap", "chuan", "bi", "nganh", "hoso",
]);

const TU_TIENG_ANH = new Set([
  "the", "and", "is", "are", "you", "want", "for", "of", "my", "can",
  "how", "what", "study", "please", "would", "like", "do", "does", "with",
  "about", "need", "help", "me", "your", "we", "it", "have", "there",
  "hello", "hi", "thanks", "thank", "abroad", "university", "course",
  "in", "degree", "master", "masters", "bachelor", "phd", "science",
  "engineering", "business", "apply", "application", "scholarship",
  "visa", "cost", "fee", "fees", "when", "where", "which", "should",
  "could", "will", "looking", "interested", "requirements", "admission",
]);

export type NgonNgu = "tieng_viet" | "khac" | "khong_ro";

/** Bỏ dấu để đối chiếu với danh sách từ không dấu. */
function boDau(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

export function nhanDienNgonNgu(text: string): NgonNgu {
  const sach = text.trim();
  if (sach.length === 0) return "khong_ro";

  const coDau = CO_DAU_TIENG_VIET.test(sach);

  const tu = boDau(sach.toLowerCase())
    .split(/[^a-z]+/)
    .filter(Boolean);
  if (tu.length === 0) return "khong_ro";

  let diemViet = 0;
  let diemAnh = 0;
  for (const t of tu) {
    if (TU_VIET_KHONG_DAU.has(t)) diemViet++;
    if (TU_TIENG_ANH.has(t)) diemAnh++;
  }

  // Có dấu tiếng Việt là tín hiệu mạnh, NHƯNG phải có ít nhất một từ chức năng
  // tiếng Việt đi kèm mới kết luận. Nếu không có gì khác thì nhiều khả năng đây
  // chỉ là TÊN RIÊNG ("Nguyễn Văn An") — tên người không cho biết khách đang
  // dùng ngôn ngữ nào, nên trả về khong_ro để lấy ngữ cảnh hội thoại.
  if (coDau && diemViet > 0) return "tieng_viet";
  if (coDau && diemViet === 0 && diemAnh === 0) return "khong_ro";

  // Cần chênh lệch rõ ràng mới kết luận, tránh đoán bừa với câu ngắn.
  if (diemViet > diemAnh) return "tieng_viet";
  if (diemAnh > diemViet) return "khac";
  return "khong_ro";
}

/**
 * Chọn ngôn ngữ dựa trên tin nhắn mới nhất; nếu tin đó không xác định được
 * (tên riêng, email, số điện thoại — rất hay gặp ở bước thu thập thông tin),
 * thì lùi dần về các tin trước để lấy ngôn ngữ của mạch hội thoại.
 * @param cauHoiKhach danh sách tin nhắn của KHÁCH, cũ trước mới sau.
 */
export function chiThiNgonNguTheoLichSu(cauHoiKhach: string[]): string {
  const cuoi = cauHoiKhach[cauHoiKhach.length - 1];
  const phaiLuiVeLichSu = cuoi !== undefined && nhanDienNgonNgu(cuoi) === "khong_ro";

  for (let i = cauHoiKhach.length - 1; i >= 0; i--) {
    const ket = nhanDienNgonNgu(cauHoiKhach[i]);
    if (ket === "khong_ro") continue;

    let chiThi = chiThiNgonNgu(cauHoiKhach[i]);
    if (phaiLuiVeLichSu) {
      // Tin nhắn mới nhất là tên riêng / email / số điện thoại. Model hay bị tên
      // riêng tiếng Việt kéo sang trả lời tiếng Việt giữa cuộc hội thoại tiếng Anh.
      chiThi +=
        " LƯU Ý: tin nhắn mới nhất chỉ là tên riêng hoặc thông tin liên hệ, không phải câu nói bằng ngôn ngữ nào cả." +
        " TUYỆT ĐỐI không đổi ngôn ngữ theo tên riêng — giữ đúng ngôn ngữ đã dùng trong cuộc hội thoại này.";
    }
    return chiThi;
  }
  return "";
}

/** Câu chỉ thị chèn vào cuối system instruction. Rỗng khi không xác định được. */
export function chiThiNgonNgu(text: string): string {
  switch (nhanDienNgonNgu(text)) {
    case "tieng_viet":
      return "\n\nNGÔN NGỮ LƯỢT NÀY: khách đang viết TIẾNG VIỆT. Trả lời hoàn toàn bằng tiếng Việt.";
    case "khac":
      return (
        "\n\nNGÔN NGỮ LƯỢT NÀY: tin nhắn mới nhất của khách KHÔNG PHẢI tiếng Việt. " +
        "Hãy viết TOÀN BỘ câu trả lời bằng đúng ngôn ngữ khách vừa dùng (nếu là tiếng Anh thì trả lời hoàn toàn bằng tiếng Anh). " +
        "Dịch mọi dữ kiện lấy từ dữ liệu tiếng Việt sang ngôn ngữ đó, giữ nguyên ý, không thêm bớt."
      );
    default:
      return "";
  }
}
