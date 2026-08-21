// Dọn thư mục .next trước khi build.
//
// VÌ SAO CẦN: trên Windows, `next build` hay chết giữa chừng với lỗi
//   EPERM: operation not permitted, unlink '...\.next\static\...'
// Nguyên nhân là file trong .next đang bị giữ, thường do một trong hai:
//   1. `next dev` đang chạy song song và dùng chung thư mục .next
//   2. OneDrive đang đồng bộ thư mục (repo này nằm trong OneDrive)
//
// Script chạy tự động nhờ npm lifecycle: `npm run build` sẽ gọi `prebuild` trước.
// Trên Vercel thì .next chưa tồn tại nên đây là lệnh rỗng, không ảnh hưởng deploy.

import { rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createConnection } from "node:net";
import { setTimeout as doi } from "node:timers/promises";

const THU_MUC = ".next";
const SO_LAN_THU = 5;
const CHO_GIUA_CAC_LAN = 400; // ms

/** Kiểm tra có tiến trình nào đang nghe ở cổng này không. */
function congDangBiChiem(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: "127.0.0.1" });
    const xong = (ketQua) => {
      socket.destroy();
      resolve(ketQua);
    };
    socket.setTimeout(600);
    socket.on("connect", () => xong(true));
    socket.on("timeout", () => xong(false));
    socket.on("error", () => xong(false));
  });
}

// Trên máy CI / Vercel thì không cần cảnh báo về dev server.
const chayTrenMayCuaMinh = !process.env.CI && !process.env.VERCEL;

if (chayTrenMayCuaMinh && (await congDangBiChiem(3000))) {
  console.warn(
    "\n⚠  Cổng 3000 đang có tiến trình chạy — nhiều khả năng là `npm run dev`.\n" +
      "   `next dev` và `next build` dùng chung thư mục .next nên sẽ tranh nhau khoá file.\n" +
      "   Nếu build báo lỗi EPERM, hãy dừng dev server rồi chạy lại.\n",
  );
}

if (!existsSync(THU_MUC)) process.exit(0);

for (let lan = 1; lan <= SO_LAN_THU; lan++) {
  try {
    await rm(THU_MUC, { recursive: true, force: true });
    process.exit(0);
  } catch (err) {
    const cuoiCung = lan === SO_LAN_THU;
    if (!cuoiCung) {
      // Khoá do OneDrive thường tự nhả sau vài trăm ms.
      await doi(CHO_GIUA_CAC_LAN);
      continue;
    }
    console.error(
      `\n✖ Không xoá được thư mục ${THU_MUC} sau ${SO_LAN_THU} lần thử: ${err.code ?? err.message}\n` +
        "  Cách xử lý:\n" +
        "   1. Dừng `npm run dev` nếu đang chạy\n" +
        "   2. Tạm dừng đồng bộ OneDrive, hoặc loại .next khỏi danh sách đồng bộ\n" +
        "   3. Đóng trình soạn thảo / terminal đang mở file trong .next\n",
    );
    process.exit(1);
  }
}
