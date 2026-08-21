// Toàn bộ dữ liệu trong file này là dữ liệu giả (mock), viết cứng để dựng UI.
// Học viên sẽ thay thế bằng dữ liệu thật từ Supabase ở các tuần sau.

export type DocStatus = "chua_nop" | "dang_xu_ly" | "hop_le" | "can_nop_lai";

export type RequestStatus = "cho_duyet" | "da_duyet" | "tu_choi";

export type ServicePackage = "co_ban" | "toan_dien";

/** Bang / vùng lãnh thổ của Úc. */
export type AuState = "ACT" | "NSW" | "VIC" | "QLD" | "SA" | "WA" | "TAS" | "NT";

export interface School {
  id: string;
  name: string;
  country: string;
  /** Bang/vùng lãnh thổ. Hiện chỉ điền cho các trường Úc. */
  state?: AuState;
  /** Thuộc nhóm Group of Eight — 8 đại học nghiên cứu hàng đầu của Úc. */
  go8?: boolean;
  /**
   * null = CHƯA có điểm chuẩn, nên trường này chưa dùng để đối chiếu hồ sơ được.
   * Cố ý để null thay vì đoán bừa: chatbot đọc thẳng con số này cho khách, còn
   * cổng hồ sơ dùng nó để phán "đủ / chưa đủ điều kiện".
   */
  minGpa: number | null;
  minIelts: number | null;
  /** Thứ hạng trong nước Úc theo THE 2026. null = không có trong bảng xếp hạng. */
  auRank: number | null;
  /**
   * Hạng thế giới THE 2026, để dạng CHUỖI chứ không phải số: nguồn có cả đồng
   * hạng ("=53") lẫn xếp theo nhóm ("201–250"), ép về số là mất thông tin.
   */
  theRank2026: string | null;
}

export const countries = [
  "Mỹ",
  "Anh",
  "Úc",
  "Canada",
  "Hàn Quốc",
  "Nhật Bản",
] as const;

const baseSchools: Omit<School, "auRank" | "theRank2026">[] = [
  {
    id: "sch_01",
    name: "University of Toronto",
    country: "Canada",
    minGpa: 8.0,
    minIelts: 6.5,
  },
  {
    id: "sch_02",
    name: "RMIT University",
    country: "Úc",
    state: "VIC",
    minGpa: 7.0,
    minIelts: 6.0,
  },
  {
    id: "sch_03",
    name: "University of Manchester",
    country: "Anh",
    minGpa: 7.5,
    minIelts: 6.5,
  },
  {
    id: "sch_04",
    name: "Arizona State University",
    country: "Mỹ",
    minGpa: 6.5,
    minIelts: 6.0,
  },
  {
    id: "sch_05",
    name: "Yonsei University",
    country: "Hàn Quốc",
    minGpa: 8.5,
    minIelts: 7.0,
  },

  // ⚠️ 5 trường dưới đây có minGpa/minIelts là số TẠM, CHƯA KIỂM CHỨNG.
  // Giữ lại để cổng hồ sơ còn ví dụ đối chiếu được, nhưng phải thay bằng số thật.
  {
    id: "sch_06",
    name: "University of Sydney",
    country: "Úc",
    state: "NSW",
    go8: true,
    minGpa: 8.0,
    minIelts: 6.5,
  },
  {
    id: "sch_07",
    name: "University of Technology Sydney (UTS)",
    country: "Úc",
    state: "NSW",
    minGpa: 7.0,
    minIelts: 6.5,
  },
  {
    id: "sch_08",
    name: "University of Wollongong (UOW)",
    country: "Úc",
    state: "NSW",
    minGpa: 6.5,
    minIelts: 6.0,
  },
  {
    id: "sch_09",
    name: "Monash University",
    country: "Úc",
    state: "VIC",
    go8: true,
    minGpa: 7.5,
    minIelts: 6.5,
  },
  {
    id: "sch_10",
    name: "Australian National University (ANU)",
    country: "Úc",
    state: "ACT",
    go8: true,
    minGpa: 8.0,
    minIelts: 6.5,
  },

  // ---------------------------------------------------------------------------
  // 35 trường đại học Úc còn lại, đủ danh sách 41 trường trên toàn quốc.
  //
  // Tên trường, bang và nhóm Go8 là DỮ LIỆU THẬT.
  // minGpa/minIelts để `null` = CHƯA CÓ. Mình cố ý không đoán: yêu cầu đầu vào
  // khác nhau theo từng ngành và bậc học, còn GPA thang 10 là con số quy đổi nội
  // bộ của trung tâm, các trường không công bố. Điền số thật vào đây thì trường
  // đó tự động dùng được cho việc đối chiếu hồ sơ.
  //
  // Thêm trường mới thì thêm vào CUỐI mảng: currentStudent.matches trỏ tới
  // schools[0] và schools[4] theo index.
  // ---------------------------------------------------------------------------

  // ACT
  { id: "sch_11", name: "University of Canberra (UC)", country: "Úc", state: "ACT", minGpa: null, minIelts: null },

  // NSW
  { id: "sch_12", name: "Australian Catholic University (ACU)", country: "Úc", state: "NSW", minGpa: null, minIelts: null },
  { id: "sch_13", name: "Avondale University", country: "Úc", state: "NSW", minGpa: null, minIelts: null },
  { id: "sch_14", name: "Charles Sturt University (CSU)", country: "Úc", state: "NSW", minGpa: null, minIelts: null },
  { id: "sch_15", name: "Macquarie University", country: "Úc", state: "NSW", minGpa: null, minIelts: null },
  { id: "sch_16", name: "Southern Cross University (SCU)", country: "Úc", state: "NSW", minGpa: null, minIelts: null },
  { id: "sch_17", name: "University of New England (UNE)", country: "Úc", state: "NSW", minGpa: null, minIelts: null },
  { id: "sch_18", name: "UNSW Sydney", country: "Úc", state: "NSW", go8: true, minGpa: null, minIelts: null },
  { id: "sch_19", name: "University of Newcastle", country: "Úc", state: "NSW", minGpa: null, minIelts: null },
  { id: "sch_20", name: "Western Sydney University (WSU)", country: "Úc", state: "NSW", minGpa: null, minIelts: null },

  // VIC
  { id: "sch_21", name: "Deakin University", country: "Úc", state: "VIC", minGpa: null, minIelts: null },
  { id: "sch_22", name: "Federation University Australia", country: "Úc", state: "VIC", minGpa: null, minIelts: null },
  { id: "sch_23", name: "La Trobe University", country: "Úc", state: "VIC", minGpa: null, minIelts: null },
  { id: "sch_24", name: "Swinburne University of Technology", country: "Úc", state: "VIC", minGpa: null, minIelts: null },
  { id: "sch_25", name: "University of Divinity", country: "Úc", state: "VIC", minGpa: null, minIelts: null },
  { id: "sch_26", name: "University of Melbourne", country: "Úc", state: "VIC", go8: true, minGpa: null, minIelts: null },
  { id: "sch_27", name: "Victoria University (VU)", country: "Úc", state: "VIC", minGpa: null, minIelts: null },

  // QLD
  { id: "sch_28", name: "Bond University", country: "Úc", state: "QLD", minGpa: null, minIelts: null },
  { id: "sch_29", name: "CQUniversity Australia", country: "Úc", state: "QLD", minGpa: null, minIelts: null },
  { id: "sch_30", name: "Griffith University", country: "Úc", state: "QLD", minGpa: null, minIelts: null },
  { id: "sch_31", name: "James Cook University (JCU)", country: "Úc", state: "QLD", minGpa: null, minIelts: null },
  { id: "sch_32", name: "Queensland University of Technology (QUT)", country: "Úc", state: "QLD", minGpa: null, minIelts: null },
  { id: "sch_33", name: "University of Queensland (UQ)", country: "Úc", state: "QLD", go8: true, minGpa: null, minIelts: null },
  { id: "sch_34", name: "University of Southern Queensland (UniSQ)", country: "Úc", state: "QLD", minGpa: null, minIelts: null },
  { id: "sch_35", name: "University of the Sunshine Coast (UniSC)", country: "Úc", state: "QLD", minGpa: null, minIelts: null },

  // SA — Adelaide University là trường hợp nhất từ University of Adelaide và
  // University of South Australia (thay đổi năm 2026).
  { id: "sch_36", name: "Adelaide University", country: "Úc", state: "SA", go8: true, minGpa: null, minIelts: null },
  { id: "sch_37", name: "Flinders University", country: "Úc", state: "SA", minGpa: null, minIelts: null },
  { id: "sch_38", name: "Torrens University Australia", country: "Úc", state: "SA", minGpa: null, minIelts: null },

  // WA — Notre Dame có cơ sở ở cả WA và NSW.
  { id: "sch_39", name: "Curtin University", country: "Úc", state: "WA", minGpa: null, minIelts: null },
  { id: "sch_40", name: "Edith Cowan University (ECU)", country: "Úc", state: "WA", minGpa: null, minIelts: null },
  { id: "sch_41", name: "Murdoch University", country: "Úc", state: "WA", minGpa: null, minIelts: null },
  { id: "sch_42", name: "University of Notre Dame Australia", country: "Úc", state: "WA", minGpa: null, minIelts: null },
  { id: "sch_43", name: "University of Western Australia (UWA)", country: "Úc", state: "WA", go8: true, minGpa: null, minIelts: null },

  // TAS
  { id: "sch_44", name: "University of Tasmania (UTAS)", country: "Úc", state: "TAS", minGpa: null, minIelts: null },

  // NT
  { id: "sch_45", name: "Charles Darwin University (CDU)", country: "Úc", state: "NT", minGpa: null, minIelts: null },
];

// ---------------------------------------------------------------------------
// Bảng xếp hạng THE World University Rankings 2026 (nguồn do trung tâm cung cấp).
// Khoá theo id trường, tách riêng khỏi danh sách trường để sang năm cập nhật
// xếp hạng thì chỉ sửa đúng khối này.
//
// `theRank` để dạng chuỗi vì nguồn có "=53" (đồng hạng) và "201–250" (theo nhóm).
// 4 trường KHÔNG có trong bảng nguồn nên không xuất hiện ở đây, và sẽ nhận
// auRank/theRank2026 = null: Avondale University (sch_13), University of Divinity
// (sch_25), James Cook University (sch_31), Torrens University Australia (sch_38).
// ---------------------------------------------------------------------------
const xepHangUc: Record<string, { auRank: number; theRank: string }> = {
  sch_26: { auRank: 1, theRank: "37" },        // University of Melbourne
  sch_06: { auRank: 2, theRank: "=53" },       // University of Sydney
  sch_09: { auRank: 3, theRank: "=58" },       // Monash University
  sch_10: { auRank: 4, theRank: "=73" },       // Australian National University
  sch_18: { auRank: 5, theRank: "79" },        // UNSW Sydney
  sch_33: { auRank: 6, theRank: "=80" },       // University of Queensland
  sch_36: { auRank: 7, theRank: "133" },       // Adelaide University
  sch_07: { auRank: 8, theRank: "=145" },      // University of Technology Sydney
  sch_43: { auRank: 9, theRank: "153" },       // University of Western Australia
  sch_15: { auRank: 10, theRank: "=166" },     // Macquarie University
  sch_21: { auRank: 11, theRank: "201–250" },  // Deakin University
  sch_32: { auRank: 12, theRank: "201–250" },  // Queensland University of Technology
  sch_08: { auRank: 13, theRank: "201–250" },  // University of Wollongong
  sch_39: { auRank: 14, theRank: "251–300" },  // Curtin University
  sch_30: { auRank: 15, theRank: "251–300" },  // Griffith University
  sch_23: { auRank: 16, theRank: "251–300" },  // La Trobe University
  sch_02: { auRank: 17, theRank: "251–300" },  // RMIT University
  sch_24: { auRank: 18, theRank: "251–300" },  // Swinburne University of Technology
  sch_19: { auRank: 19, theRank: "251–300" },  // University of Newcastle
  sch_44: { auRank: 20, theRank: "251–300" },  // University of Tasmania
  sch_37: { auRank: 21, theRank: "301–350" },  // Flinders University
  sch_34: { auRank: 22, theRank: "301–350" },  // University of Southern Queensland
  sch_20: { auRank: 23, theRank: "301–350" },  // Western Sydney University
  sch_12: { auRank: 24, theRank: "401–500" },  // Australian Catholic University
  sch_28: { auRank: 25, theRank: "401–500" },  // Bond University
  sch_11: { auRank: 26, theRank: "401–500" },  // University of Canberra
  sch_35: { auRank: 27, theRank: "401–500" },  // University of the Sunshine Coast
  sch_45: { auRank: 28, theRank: "501–600" },  // Charles Darwin University
  sch_14: { auRank: 29, theRank: "501–600" },  // Charles Sturt University
  sch_29: { auRank: 30, theRank: "501–600" },  // CQUniversity Australia
  sch_22: { auRank: 31, theRank: "501–600" },  // Federation University Australia
  sch_41: { auRank: 32, theRank: "501–600" },  // Murdoch University
  sch_16: { auRank: 33, theRank: "501–600" },  // Southern Cross University
  sch_17: { auRank: 34, theRank: "501–600" },  // University of New England
  sch_42: { auRank: 35, theRank: "501–600" },  // University of Notre Dame Australia
  sch_27: { auRank: 36, theRank: "501–600" },  // Victoria University
  sch_40: { auRank: 37, theRank: "601–800" },  // Edith Cowan University
};

// Ghép xếp hạng vào danh sách trường. `.map` giữ nguyên thứ tự nên
// currentStudent.matches vẫn trỏ đúng schools[0] và schools[4].
export const schools: School[] = baseSchools.map((s) => ({
  ...s,
  auRank: xepHangUc[s.id]?.auRank ?? null,
  theRank2026: xepHangUc[s.id]?.theRank ?? null,
}));

export interface ServiceOption {
  id: ServicePackage;
  name: string;
  price: number;
  description: string;
  benefits: string[];
}

export const servicePackages: ServiceOption[] = [
  {
    id: "co_ban",
    name: "Cơ bản",
    price: 18_000_000,
    description: "Phù hợp nếu hồ sơ của bạn đơn giản và đã chuẩn bị sẵn phần lớn giấy tờ.",
    benefits: [
      "Đối chiếu điểm chuẩn tự động",
      "Kiểm tra hợp lệ giấy tờ (bảng điểm, IELTS, CMND/hộ chiếu)",
      "Hỗ trợ qua email trong 24h",
      "1 lần nộp lại hồ sơ miễn phí",
    ],
  },
  {
    id: "toan_dien",
    name: "Toàn diện",
    price: 45_000_000,
    description: "Đồng hành trọn gói từ tư vấn trường đến nộp hồ sơ.",
    benefits: [
      "Toàn bộ quyền lợi gói Cơ bản",
      "Tư vấn chọn trường 1:1 với chuyên viên",
      "Rà soát hồ sơ không giới hạn số lần",
      "Hỗ trợ ưu tiên qua điện thoại + email",
      "Theo dõi tiến độ xét duyệt hằng tuần",
    ],
  },
];

export interface AdmissionRequest {
  id: string;
  customerName: string;
  package: ServicePackage;
  quote: number;
  status: RequestStatus;
  createdAt: string;
}

export const admissionRequests: AdmissionRequest[] = [
  {
    id: "req_2101",
    customerName: "Trần Thị Bích",
    package: "toan_dien",
    quote: 45_000_000,
    status: "cho_duyet",
    createdAt: "2026-08-06 08:20",
  },
  {
    id: "req_2100",
    customerName: "Đỗ Ngọc Lan",
    package: "toan_dien",
    quote: 45_000_000,
    status: "cho_duyet",
    createdAt: "2026-08-05 09:12",
  },
  {
    id: "req_2099",
    customerName: "Lê Văn Hùng",
    package: "co_ban",
    quote: 18_000_000,
    status: "da_duyet",
    createdAt: "2026-08-04 14:30",
  },
  {
    id: "req_2098",
    customerName: "Phạm Thu Hà",
    package: "toan_dien",
    quote: 45_000_000,
    status: "da_duyet",
    createdAt: "2026-08-03 10:05",
  },
  {
    id: "req_2097",
    customerName: "Nguyễn Đức Anh",
    package: "co_ban",
    quote: 18_000_000,
    status: "tu_choi",
    createdAt: "2026-08-02 16:47",
  },
];

export interface StudentProfile {
  id: string;
  studentName: string;
  email: string;
  submittedAt: string;
  docs: {
    transcript: DocStatus;
    ielts: DocStatus;
    identity: DocStatus;
  };
  matchedSchools: number;
  totalSchools: number;
}

export const studentProfiles: StudentProfile[] = [
  {
    id: "stu_501",
    studentName: "Nguyễn Minh Anh",
    email: "minhanh.nguyen@example.com",
    submittedAt: "2026-08-01",
    docs: { transcript: "hop_le", ielts: "dang_xu_ly", identity: "can_nop_lai" },
    matchedSchools: 2,
    totalSchools: schools.length,
  },
  {
    id: "stu_502",
    studentName: "Vũ Thị Mai",
    email: "mai.vu@example.com",
    submittedAt: "2026-07-30",
    docs: { transcript: "hop_le", ielts: "hop_le", identity: "hop_le" },
    matchedSchools: 3,
    totalSchools: schools.length,
  },
  {
    id: "stu_503",
    studentName: "Hoàng Gia Bảo",
    email: "bao.hoang@example.com",
    submittedAt: "2026-08-02",
    docs: { transcript: "hop_le", ielts: "hop_le", identity: "dang_xu_ly" },
    matchedSchools: 1,
    totalSchools: schools.length,
  },
  {
    id: "stu_504",
    studentName: "Trịnh Thu Trang",
    email: "trang.trinh@example.com",
    submittedAt: "2026-08-04",
    docs: { transcript: "can_nop_lai", ielts: "hop_le", identity: "hop_le" },
    matchedSchools: 0,
    totalSchools: schools.length,
  },
  {
    id: "stu_505",
    studentName: "Bùi Anh Tuấn",
    email: "tuan.bui@example.com",
    submittedAt: "2026-08-05",
    docs: { transcript: "dang_xu_ly", ielts: "dang_xu_ly", identity: "dang_xu_ly" },
    matchedSchools: 0,
    totalSchools: schools.length,
  },
];

export interface ChatMessage {
  from: "bot" | "user";
  text: string;
  time: string;
}

export interface Conversation {
  id: string;
  channel: "Web";
  messageCount: number;
  startedAt: string;
  messages: ChatMessage[];
}

export const conversations: Conversation[] = [
  {
    id: "conv_2081",
    channel: "Web",
    messageCount: 8,
    startedAt: "2026-08-06 09:03",
    messages: [
      { from: "bot", text: "Chào bạn! Mình có thể giúp gì cho hồ sơ du học của bạn?", time: "09:03" },
      { from: "user", text: "Gói Toàn diện có gì khác gói Cơ bản vậy ạ?", time: "09:04" },
      { from: "bot", text: "Gói Toàn diện gồm tư vấn chọn trường 1:1, rà soát hồ sơ không giới hạn và hỗ trợ ưu tiên qua điện thoại.", time: "09:04" },
    ],
  },
  {
    id: "conv_2080",
    channel: "Web",
    messageCount: 4,
    startedAt: "2026-08-05 20:15",
    messages: [
      { from: "bot", text: "Chào bạn! Mình có thể giúp gì cho hồ sơ du học của bạn?", time: "20:15" },
      { from: "user", text: "Bao lâu thì có kết quả đối chiếu điểm chuẩn?", time: "20:16" },
    ],
  },
  {
    id: "conv_2079",
    channel: "Web",
    messageCount: 12,
    startedAt: "2026-08-05 11:42",
    messages: [
      { from: "bot", text: "Chào bạn! Mình có thể giúp gì cho hồ sơ du học của bạn?", time: "11:42" },
      { from: "user", text: "Em cần chuẩn bị giấy tờ gì để nộp hồ sơ?", time: "11:43" },
      { from: "bot", text: "Bạn cần bảng điểm (PDF), ảnh chứng chỉ IELTS và ảnh CMND/CCCD hoặc hộ chiếu.", time: "11:43" },
    ],
  },
  {
    id: "conv_2078",
    channel: "Web",
    messageCount: 3,
    startedAt: "2026-08-04 18:57",
    messages: [
      { from: "bot", text: "Chào bạn! Mình có thể giúp gì cho hồ sơ du học của bạn?", time: "18:57" },
      { from: "user", text: "Chi phí dịch vụ là bao nhiêu?", time: "18:58" },
    ],
  },
  {
    id: "conv_2077",
    channel: "Web",
    messageCount: 6,
    startedAt: "2026-08-03 13:21",
    messages: [
      { from: "bot", text: "Chào bạn! Mình có thể giúp gì cho hồ sơ du học của bạn?", time: "13:21" },
      { from: "user", text: "Dịch vụ này gồm những gì ạ?", time: "13:22" },
    ],
  },
];

// Hồ sơ của học viên đang đăng nhập demo tại /portal
export const currentStudent = {
  name: "Nguyễn Minh Anh",
  email: "minhanh.nguyen@example.com",
  documents: {
    transcript: {
      status: "hop_le" as DocStatus,
      fileName: "bang-diem-minh-anh.pdf",
    },
    ielts: {
      status: "dang_xu_ly" as DocStatus,
      fileName: "ielts-certificate.jpg",
    },
    identity: {
      status: "can_nop_lai" as DocStatus,
      fileName: "cccd-mat-truoc.jpg",
      reason: "Ảnh mờ, không đọc rõ thông tin",
    },
  },
  extracted: {
    fullName: "Nguyễn Minh Anh",
    dateOfBirth: "12/05/2005",
    gpa: 8.2,
    ielts: 6.5,
  },
  matches: [
    { school: schools[0], passed: true },
    { school: schools[4], passed: false },
  ],
};
