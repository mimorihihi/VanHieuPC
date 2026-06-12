# Tài liệu công cụ và công nghệ sử dụng trong project DATN E-commerce

Tài liệu này tổng hợp các công cụ, thư viện và công nghệ chính đang được sử dụng trong project. Nội dung được viết theo hướng dễ đưa vào **báo cáo**, **tài liệu kỹ thuật** và **slide PowerPoint**.

---

## 1. Tổng quan project

Project là một website thương mại điện tử được xây dựng theo kiến trúc **Full-stack Web Application**. Ứng dụng bao gồm phần giao diện người dùng, trang quản trị, hệ thống API nội bộ, xử lý giỏ hàng, đặt hàng, thanh toán, đánh giá sản phẩm, upload hình ảnh và chatbot hỗ trợ mua sắm.

Công nghệ trung tâm của hệ thống là **Next.js**, cho phép xây dựng cả frontend và backend trong cùng một project.

---

## 2. Nhóm công nghệ Frontend

### 2.1 Next.js

**Next.js** là framework React dùng để xây dựng ứng dụng web hiện đại.

Trong project, Next.js được sử dụng để:

- Xây dựng giao diện người dùng.
- Tổ chức routing theo cấu trúc thư mục `app`.
- Tạo các page cho cửa hàng, giỏ hàng, thanh toán, tài khoản người dùng và quản trị.
- Xây dựng API Routes phục vụ backend ngay trong cùng project.
- Hỗ trợ tối ưu hiệu năng và SEO tốt hơn so với React thuần.

Vai trò trong hệ thống:

- Là nền tảng chính của toàn bộ ứng dụng.
- Kết nối phần giao diện, API và xử lý server-side.
- Giúp project dễ triển khai và bảo trì.

---

### 2.2 React

**React** là thư viện JavaScript dùng để xây dựng giao diện người dùng theo mô hình component.

Trong project, React được sử dụng để:

- Xây dựng các component tái sử dụng như header, footer, card sản phẩm, form, modal.
- Quản lý trạng thái giao diện như giỏ hàng, form thanh toán, wishlist, chatbot.
- Tạo trải nghiệm người dùng linh hoạt và tương tác nhanh.

Vai trò trong hệ thống:

- Là lớp xây dựng UI chính.
- Giúp chia giao diện thành các khối nhỏ, dễ quản lý.
- Tăng khả năng tái sử dụng code.

---

### 2.3 TypeScript

**TypeScript** là phiên bản mở rộng của JavaScript, bổ sung hệ thống kiểu dữ liệu tĩnh.

Trong project, TypeScript được sử dụng để:

- Định nghĩa kiểu dữ liệu cho sản phẩm, đơn hàng, người dùng, giỏ hàng.
- Giảm lỗi trong quá trình phát triển.
- Giúp code dễ đọc, dễ bảo trì và dễ mở rộng.
- Hỗ trợ kiểm tra lỗi sớm trước khi chạy ứng dụng.

Vai trò trong hệ thống:

- Tăng độ an toàn cho code.
- Hỗ trợ lập trình viên hiểu rõ dữ liệu truyền giữa frontend và backend.
- Giúp project phù hợp hơn với quy mô đồ án tốt nghiệp.

---

### 2.4 Tailwind CSS

**Tailwind CSS** là framework CSS dạng utility-first, cho phép viết style trực tiếp thông qua class.

Trong project, Tailwind CSS được sử dụng để:

- Thiết kế giao diện nhanh và nhất quán.
- Xây dựng layout responsive cho nhiều kích thước màn hình.
- Tạo các thành phần UI như button, card, grid, form, navigation.
- Giảm nhu cầu viết CSS thủ công.

Vai trò trong hệ thống:

- Là công cụ styling chính của frontend.
- Giúp giao diện đồng bộ, dễ chỉnh sửa và tối ưu tốc độ phát triển.

---

### 2.5 shadcn/ui style components

Project có thư mục `src/components/ui` chứa các component UI dùng chung như:

- `button.tsx`
- `form-fields.tsx`
- `image-upload.tsx`
- `modal.tsx`

Các component này được tổ chức theo hướng giống hệ sinh thái **shadcn/ui**, tức là component được đưa trực tiếp vào source code để dễ chỉnh sửa và tái sử dụng.

Vai trò trong hệ thống:

- Chuẩn hóa giao diện các thành phần dùng lặp lại.
- Giúp code frontend gọn hơn.
- Tăng tính nhất quán giữa các màn hình.

---

### 2.6 Lucide React

**Lucide React** là thư viện icon dành cho React.

Trong project, Lucide React được sử dụng để:

- Hiển thị icon cho các chức năng như tìm kiếm, giỏ hàng, wishlist, điều hướng, chatbot.
- Tăng tính trực quan cho giao diện.
- Giúp người dùng nhận biết chức năng nhanh hơn.

Vai trò trong hệ thống:

- Cung cấp bộ icon hiện đại, nhẹ và dễ tùy chỉnh.
- Hỗ trợ cải thiện trải nghiệm người dùng.

---

### 2.7 Embla Carousel

Project sử dụng các thư viện:

- `embla-carousel-react`
- `embla-carousel-autoplay`

**Embla Carousel** dùng để xây dựng các slider hoặc carousel trong giao diện.

Trong project, công cụ này có thể dùng cho:

- Banner trang chủ.
- Danh sách sản phẩm nổi bật.
- Khu vực hình ảnh hoặc nội dung có thể trượt.

Vai trò trong hệ thống:

- Tạo trải nghiệm giao diện sinh động.
- Giúp hiển thị nhiều nội dung trong không gian nhỏ.
- Hỗ trợ tự động chuyển slide thông qua autoplay.

---

### 2.8 Lottie React

**Lottie React** dùng để hiển thị animation dạng JSON trong React.

Trong project, Lottie có thể được sử dụng cho:

- Hiệu ứng trạng thái thanh toán.
- Hiệu ứng loading.
- Hiệu ứng thành công hoặc thất bại.
- Minh họa sinh động cho giao diện.

Vai trò trong hệ thống:

- Tăng tính chuyên nghiệp cho UI.
- Giúp phản hồi trạng thái trở nên trực quan hơn.

---

## 3. Nhóm công nghệ Backend

### 3.1 Next.js API Routes

Project sử dụng **API Routes** của Next.js trong thư mục `src/app/api`.

Một số nhóm API chính gồm:

- `auth`: đăng nhập, xác thực người dùng.
- `cart`: quản lý giỏ hàng.
- `checkout`: xử lý đặt hàng và áp dụng mã giảm giá.
- `payment`: xử lý thanh toán và kết quả thanh toán.
- `products`: lấy thông tin sản phẩm và đánh giá.
- `me`: thông tin cá nhân, địa chỉ, đơn hàng, wishlist.
- `admin`: chức năng quản trị như upload, quản lý review.
- `chatbot`: xử lý hội thoại chatbot.

Vai trò trong hệ thống:

- Cung cấp backend trực tiếp trong project Next.js.
- Xử lý dữ liệu giữa frontend và database.
- Giúp project không cần tách riêng server backend phức tạp.

---

### 3.2 MySQL

**MySQL** là hệ quản trị cơ sở dữ liệu quan hệ.

Trong project, MySQL được sử dụng để lưu trữ các dữ liệu chính như:

- Người dùng.
- Sản phẩm.
- Danh mục.
- Biến thể sản phẩm.
- Giỏ hàng.
- Đơn hàng.
- Đánh giá sản phẩm.
- Wishlist.
- Địa chỉ giao hàng.

Vai trò trong hệ thống:

- Là nơi lưu trữ dữ liệu chính của website.
- Đảm bảo dữ liệu có cấu trúc rõ ràng.
- Phù hợp với hệ thống thương mại điện tử có nhiều quan hệ dữ liệu.

---

### 3.3 mysql2

**mysql2** là thư viện Node.js dùng để kết nối và truy vấn MySQL.

Trong project, `mysql2` được sử dụng trong lớp backend để:

- Tạo kết nối tới database.
- Thực thi các câu lệnh SQL.
- Lấy dữ liệu sản phẩm, đơn hàng, người dùng.
- Cập nhật trạng thái giỏ hàng, thanh toán, đánh giá.

Vai trò trong hệ thống:

- Là cầu nối giữa Next.js API Routes và MySQL.
- Giúp backend thao tác dữ liệu một cách trực tiếp.

---

### 3.4 bcryptjs

**bcryptjs** là thư viện dùng để mã hóa và kiểm tra mật khẩu.

Trong project, bcryptjs được sử dụng cho chức năng xác thực người dùng.

Vai trò trong hệ thống:

- Mã hóa mật khẩu trước khi lưu vào database.
- So sánh mật khẩu người dùng nhập với mật khẩu đã mã hóa.
- Tăng tính bảo mật cho hệ thống đăng nhập.

---

### 3.5 Formidable

**Formidable** là thư viện xử lý dữ liệu form và file upload trong Node.js.

Trong project, Formidable được sử dụng cho các API cần nhận file từ người dùng hoặc admin, ví dụ:

- Upload ảnh sản phẩm.
- Upload ảnh biến thể sản phẩm.
- Xử lý dữ liệu form có kèm file.

Vai trò trong hệ thống:

- Hỗ trợ backend đọc file từ request.
- Giúp chức năng upload hoạt động ổn định hơn.

---

## 4. Nhóm công cụ lưu trữ hình ảnh

### 4.1 Cloudinary

**Cloudinary** là nền tảng lưu trữ, quản lý và tối ưu hình ảnh trên cloud.

Trong project, Cloudinary được sử dụng để:

- Upload ảnh sản phẩm từ trang quản trị.
- Lưu trữ ảnh trên cloud thay vì lưu trực tiếp trong source code.
- Quản lý ảnh sản phẩm, ảnh biến thể, ảnh danh mục hoặc banner.
- Trả về URL ảnh để hiển thị trên website.

Vai trò trong hệ thống:

- Giúp giảm tải cho server ứng dụng.
- Quản lý hình ảnh linh hoạt hơn.
- Phù hợp với website thương mại điện tử có nhiều ảnh sản phẩm.

---

## 5. Nhóm công nghệ thanh toán

### 5.1 VNPay

Project có module `src/lib/vnpay.ts`, cho thấy hệ thống tích hợp thanh toán qua **VNPay**.

VNPay được sử dụng để:

- Tạo URL thanh toán cho đơn hàng.
- Chuyển người dùng sang cổng thanh toán.
- Nhận kết quả thanh toán trả về.
- Cập nhật trạng thái đơn hàng sau khi thanh toán.

Vai trò trong hệ thống:

- Cung cấp phương thức thanh toán online phổ biến tại Việt Nam.
- Giúp quy trình mua hàng hoàn chỉnh hơn.
- Hỗ trợ demo nghiệp vụ thương mại điện tử thực tế.

---

## 6. Nhóm công nghệ đa ngôn ngữ

### 6.1 next-intl

**next-intl** là thư viện hỗ trợ đa ngôn ngữ cho Next.js.

Trong project, next-intl được sử dụng để:

- Quản lý nội dung tiếng Việt và tiếng Anh.
- Tách text giao diện ra khỏi component.
- Hỗ trợ chuyển đổi ngôn ngữ.
- Áp dụng cho các trang như checkout, cart, payment success, payment failed, header, footer.

Vai trò trong hệ thống:

- Giúp website phục vụ nhiều nhóm người dùng hơn.
- Làm cho project chuyên nghiệp và dễ mở rộng.
- Hỗ trợ tốt cho phần trình bày đồ án vì thể hiện yếu tố quốc tế hóa.

---

## 7. Nhóm công nghệ Chatbot và AI

### 7.1 AI SDK

Project sử dụng thư viện `ai`, đây là bộ công cụ hỗ trợ xây dựng tính năng AI trong ứng dụng web.

Trong project, AI SDK được sử dụng cho hệ thống chatbot để:

- Tạo phản hồi hội thoại.
- Xử lý tin nhắn từ người dùng.
- Kết hợp dữ liệu sản phẩm để tư vấn mua hàng.
- Tổ chức luồng hội thoại trong backend.

Vai trò trong hệ thống:

- Là nền tảng kỹ thuật cho chatbot.
- Giúp website có tính năng hỗ trợ khách hàng thông minh hơn.

---

### 7.2 OpenRouter AI SDK Provider

Project sử dụng `@openrouter/ai-sdk-provider`, đây là provider giúp kết nối AI SDK với các mô hình AI thông qua OpenRouter.

Trong project, OpenRouter có thể được dùng để:

- Gửi prompt tới mô hình AI.
- Nhận phản hồi từ mô hình ngôn ngữ.
- Tạo câu trả lời tự nhiên cho chatbot.

Vai trò trong hệ thống:

- Là lớp trung gian kết nối chatbot với mô hình AI.
- Giúp dễ thay đổi hoặc lựa chọn model AI khi cần.

---

### 7.3 @ai-sdk/openai

Project có sử dụng `@ai-sdk/openai`, thư viện hỗ trợ kết nối AI SDK với các model tương thích OpenAI.

Vai trò trong hệ thống:

- Hỗ trợ gọi mô hình AI theo chuẩn OpenAI.
- Có thể dùng làm provider chính hoặc fallback cho chatbot.
- Giúp chatbot linh hoạt hơn khi tích hợp các dịch vụ AI.

---

## 8. Nhóm công cụ kiểm tra và chất lượng code

### 8.1 ESLint

**ESLint** là công cụ kiểm tra lỗi và quy chuẩn code JavaScript/TypeScript.

Trong project, ESLint được sử dụng thông qua script:

```bash
npm run lint
```

Vai trò trong hệ thống:

- Phát hiện lỗi code sớm.
- Giữ code theo chuẩn thống nhất.
- Giúp project dễ bảo trì khi phát triển lâu dài.

---

### 8.2 eslint-config-next

**eslint-config-next** là bộ cấu hình ESLint dành riêng cho Next.js.

Vai trò trong hệ thống:

- Kiểm tra các lỗi liên quan đến Next.js.
- Cảnh báo vấn đề về performance, accessibility và best practices.
- Giúp ứng dụng tuân thủ chuẩn phát triển của Next.js.

---

### 8.3 Type Definitions

Project sử dụng các gói type như:

- `@types/node`
- `@types/react`
- `@types/react-dom`
- `@types/bcryptjs`

Vai trò trong hệ thống:

- Cung cấp kiểu dữ liệu cho TypeScript.
- Hỗ trợ editor gợi ý code chính xác hơn.
- Giảm lỗi trong quá trình lập trình.

---

## 9. Nhóm công cụ triển khai và phân tích

### 9.1 Vercel Analytics

Project sử dụng `@vercel/analytics`.

Công cụ này dùng để:

- Theo dõi lượt truy cập.
- Phân tích hành vi người dùng cơ bản.
- Hỗ trợ đánh giá hiệu quả sau khi deploy.

Vai trò trong hệ thống:

- Cung cấp dữ liệu thống kê cho website.
- Phù hợp khi triển khai ứng dụng trên nền tảng Vercel.

---

### 9.2 npm scripts

Project sử dụng các script chính trong `package.json`:

| Script | Chức năng |
|---|---|
| `npm run dev` | Chạy project ở môi trường phát triển |
| `npm run build` | Build project cho production |
| `npm run start` | Chạy bản production sau khi build |
| `npm run lint` | Kiểm tra lỗi và chuẩn code |
| `npm run seed:demo-products` | Thêm dữ liệu sản phẩm demo vào hệ thống |

Vai trò trong hệ thống:

- Chuẩn hóa cách chạy và kiểm tra project.
- Giúp demo, phát triển và triển khai thuận tiện hơn.

---

## 10. Nhóm thư viện hỗ trợ UI và className

### 10.1 clsx

**clsx** là thư viện hỗ trợ ghép className có điều kiện.

Trong project, clsx giúp:

- Thêm hoặc bỏ class theo trạng thái component.
- Viết className gọn hơn.
- Tăng tính rõ ràng khi xử lý UI động.

---

### 10.2 tailwind-merge

**tailwind-merge** giúp gộp và xử lý xung đột class Tailwind.

Ví dụ, khi có nhiều class liên quan đến padding hoặc màu sắc, tailwind-merge giúp loại bỏ class bị trùng hoặc mâu thuẫn.

Vai trò trong hệ thống:

- Giúp className sạch hơn.
- Hỗ trợ xây dựng component UI tái sử dụng.

---

### 10.3 class-variance-authority

**class-variance-authority** hỗ trợ tạo nhiều biến thể giao diện cho component.

Trong project, thư viện này phù hợp cho các component như Button, Badge hoặc Card có nhiều variant.

Vai trò trong hệ thống:

- Quản lý variant UI rõ ràng.
- Giúp component linh hoạt nhưng vẫn dễ bảo trì.

---

## 11. Nhóm theme và trải nghiệm người dùng

### 11.1 next-themes

**next-themes** là thư viện hỗ trợ quản lý theme trong Next.js.

Trong project, thư viện này có thể dùng để:

- Quản lý light mode và dark mode.
- Lưu lựa chọn theme của người dùng.
- Đồng bộ theme khi reload trang.

Vai trò trong hệ thống:

- Nâng cao trải nghiệm cá nhân hóa.
- Giúp giao diện hiện đại và chuyên nghiệp hơn.

---

## 12. Cấu trúc thư mục chính

| Thư mục / File | Vai trò |
|---|---|
| `src/app` | Chứa page, layout và API Routes của Next.js |
| `src/app/api` | Chứa backend API của hệ thống |
| `src/components` | Chứa các component giao diện dùng chung |
| `src/components/ui` | Chứa component UI nền tảng như button, modal, form field |
| `src/lib` | Chứa logic dùng chung như database, auth, Cloudinary, VNPay, chatbot |
| `src/i18n` | Cấu hình đa ngôn ngữ |
| `messages` | Chứa file nội dung dịch tiếng Việt / tiếng Anh |
| `public` | Chứa tài nguyên tĩnh |
| `middleware.ts` | Middleware xử lý request, thường liên quan routing hoặc i18n |
| `next.config.ts` | Cấu hình Next.js |
| `tsconfig.json` | Cấu hình TypeScript |
| `eslint.config.mjs` | Cấu hình ESLint |
| `postcss.config.mjs` | Cấu hình PostCSS / Tailwind |
| `package.json` | Khai báo thư viện và script của project |

---

## 13. Bảng tóm tắt công nghệ để đưa vào slide

| Nhóm | Công cụ / Công nghệ | Mục đích sử dụng |
|---|---|---|
| Framework chính | Next.js | Xây dựng full-stack web app |
| UI Library | React | Xây dựng giao diện component-based |
| Ngôn ngữ | TypeScript | Tăng độ an toàn và dễ bảo trì code |
| Styling | Tailwind CSS | Thiết kế giao diện responsive |
| UI Components | shadcn/ui style components | Chuẩn hóa button, modal, form, upload |
| Icons | Lucide React | Hiển thị icon hiện đại |
| Database | MySQL | Lưu trữ dữ liệu hệ thống |
| Database Driver | mysql2 | Kết nối Next.js với MySQL |
| Authentication | bcryptjs | Mã hóa và kiểm tra mật khẩu |
| Upload | Formidable | Xử lý file upload |
| Image Storage | Cloudinary | Lưu trữ và quản lý ảnh sản phẩm |
| Payment | VNPay | Thanh toán online |
| Internationalization | next-intl | Hỗ trợ tiếng Việt và tiếng Anh |
| Chatbot AI | AI SDK | Xử lý hội thoại chatbot |
| AI Provider | OpenRouter / OpenAI SDK | Kết nối chatbot với mô hình AI |
| Animation | Lottie React | Hiển thị animation UI |
| Carousel | Embla Carousel | Tạo slider/banner |
| Theme | next-themes | Quản lý theme sáng/tối |
| Code Quality | ESLint | Kiểm tra lỗi và chuẩn code |
| Analytics | Vercel Analytics | Theo dõi truy cập sau deploy |

---

## 14. Gợi ý trình bày PowerPoint

Có thể chia nội dung thành các slide như sau:

1. **Tổng quan công nghệ**
   - Next.js, React, TypeScript, Tailwind CSS.

2. **Kiến trúc Full-stack**
   - Frontend và Backend cùng nằm trong Next.js.
   - API Routes xử lý nghiệp vụ.

3. **Cơ sở dữ liệu và lưu trữ**
   - MySQL lưu dữ liệu chính.
   - Cloudinary lưu hình ảnh sản phẩm.

4. **Các chức năng nghiệp vụ chính**
   - Giỏ hàng, đặt hàng, thanh toán VNPay, đánh giá, wishlist.

5. **Đa ngôn ngữ và trải nghiệm người dùng**
   - next-intl, Tailwind CSS, Lucide React, Lottie, Carousel.

6. **Chatbot AI hỗ trợ mua sắm**
   - AI SDK, OpenRouter/OpenAI provider.

7. **Kiểm tra và triển khai**
   - ESLint, npm scripts, Vercel Analytics.

---

## 15. Kết luận

Hệ thống sử dụng bộ công nghệ hiện đại, phù hợp với một website thương mại điện tử thực tế. Next.js đóng vai trò trung tâm, kết hợp frontend React, backend API Routes, cơ sở dữ liệu MySQL, lưu trữ ảnh Cloudinary, thanh toán VNPay và chatbot AI. Cách tổ chức này giúp project dễ demo, dễ mở rộng và thể hiện được nhiều nghiệp vụ quan trọng trong đồ án tốt nghiệp.
