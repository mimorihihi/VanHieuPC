# Tóm tắt luồng hoạt động của project E-commerce

> Mục tiêu tài liệu: giúp hiểu nhanh project vận hành như thế nào, từ thao tác trên giao diện đến API, xử lý backend, database và kết quả trả về UI.

## 1. Công thức chung của mọi luồng

Hầu hết chức năng trong project đều đi theo chuỗi:

```text
UI → API → Backend xử lý → Database → Response → UI cập nhật
```

| Thành phần | Ý nghĩa |
|---|---|
| UI | Người dùng thao tác trên giao diện |
| API | Frontend gửi request đến backend |
| Backend xử lý | Validate dữ liệu, kiểm tra quyền, tính toán nghiệp vụ |
| Database | Đọc hoặc ghi dữ liệu cần thiết |
| Response | API trả kết quả thành công hoặc lỗi |
| UI cập nhật | Giao diện hiển thị dữ liệu mới cho người dùng |

> Khi trình bày đồ án, nên nói theo nghiệp vụ: người dùng làm gì, hệ thống kiểm tra gì, dữ liệu lưu ở đâu và kết quả hiển thị thế nào.

---

## 2. Luồng xác thực người dùng

### Đăng ký

```text
Người dùng nhập thông tin → POST /api/auth/register
→ backend validate dữ liệu, kiểm tra email trùng, hash mật khẩu
→ lưu user vào bảng users → trả kết quả → UI báo đăng ký thành công/lỗi
```

Ý chính: mật khẩu không được lưu dạng gốc mà được mã hóa trước khi lưu vào database.

### Đăng nhập

```text
Người dùng nhập email/mật khẩu → POST /api/auth/login
→ backend kiểm tra tài khoản, mật khẩu, trạng thái active
→ tạo session/cookie → trả thông tin user → UI chuyển vào hệ thống
```

Ý chính: sau khi đăng nhập, cookie `session_token` giúp backend nhận biết người dùng ở các request sau.

### Đăng xuất

```text
Người dùng bấm đăng xuất → POST /api/auth/logout
→ backend xóa session/cookie → trả success → UI quay về trạng thái chưa đăng nhập
```

---

## 3. Luồng bảo vệ trang admin

```text
Admin truy cập /admin → middleware kiểm tra session_token
→ nếu chưa đăng nhập thì redirect /admin/login
→ nếu hợp lệ thì cho vào dashboard/admin page
```

Ý chính: khu vực admin được bảo vệ trước khi render trang, tránh truy cập trực tiếp bằng URL khi chưa đăng nhập.

---

## 4. Luồng sản phẩm

### Xem danh sách sản phẩm

```text
Người dùng mở trang sản phẩm/lọc/sắp xếp
→ GET /api/products
→ backend xử lý filter, sort, phân trang
→ đọc products, categories, brands
→ trả danh sách sản phẩm → UI hiển thị grid/list
```

Ý chính: frontend chỉ gửi điều kiện lọc, backend chịu trách nhiệm lấy dữ liệu đúng từ database.

### Xem chi tiết sản phẩm

```text
Người dùng bấm vào sản phẩm
→ GET /api/products/[slug]
→ backend tìm sản phẩm theo slug
→ đọc products, variants, images, category, brand
→ trả chi tiết sản phẩm → UI hiển thị ảnh, giá, biến thể, tồn kho
```

Ý chính: trang chi tiết gom nhiều dữ liệu liên quan để khách có đủ thông tin trước khi mua.

---

## 5. Luồng giỏ hàng

### Thêm vào giỏ hàng

```text
Người dùng chọn biến thể/số lượng và bấm thêm giỏ
→ POST /api/cart
→ backend kiểm tra đăng nhập, sản phẩm, biến thể, tồn kho
→ ghi hoặc cập nhật carts/cart_items
→ trả success → UI cập nhật số lượng giỏ hàng
```

Ý chính: backend luôn kiểm tra lại tồn kho, không tin hoàn toàn dữ liệu từ UI.

### Xem giỏ hàng

```text
Người dùng mở giỏ hàng
→ GET /api/cart
→ backend lấy cart theo session hiện tại
→ đọc cart_items, products, variants
→ trả danh sách item → UI hiển thị tổng tiền và trạng thái còn hàng
```

Ý chính: giỏ hàng gắn với tài khoản, người dùng chỉ thấy giỏ hàng của chính mình.

### Cập nhật/xóa item

```text
Người dùng tăng giảm số lượng hoặc xóa sản phẩm
→ PATCH/DELETE /api/cart/item
→ backend kiểm tra item thuộc cart của user
→ cập nhật/xóa cart_items
→ trả success → UI cập nhật lại giỏ hàng
```

---

## 6. Luồng mã giảm giá

```text
Người dùng nhập coupon ở checkout
→ POST /api/checkout/apply-coupon
→ backend kiểm tra mã tồn tại, active, hạn dùng, lượt dùng, đơn tối thiểu
→ đọc bảng coupons
→ trả số tiền giảm hoặc lỗi → UI cập nhật tổng tiền
```

Ý chính: coupon phải thỏa đủ điều kiện thì mới được áp dụng, tránh giảm giá sai.

---

## 7. Luồng checkout tạo đơn hàng

```text
Người dùng nhập thông tin nhận hàng và bấm đặt hàng
→ POST /api/checkout
→ backend validate thông tin, kiểm tra cart/tồn kho
→ tính phí ship, VAT, giảm giá, tổng tiền
→ tạo orders và order_items trong database
→ nếu COD/pickup: trả đơn thành công
→ nếu VNPay: trả paymentUrl để UI chuyển sang cổng thanh toán
```

Ý chính: checkout là luồng quan trọng nhất. Backend phải kiểm tra dữ liệu, tính tiền và tạo đơn trong transaction để tránh tạo đơn lỗi hoặc thiếu item.

---

## 8. Luồng thanh toán VNPay

```text
Người dùng thanh toán trên VNPay
→ VNPay redirect về GET /api/payment/vnpay-return
→ backend verify chữ ký, mã đơn, số tiền, trạng thái giao dịch
→ cập nhật orders nếu hợp lệ
→ redirect /payment/success hoặc /payment/failed
→ UI hiển thị kết quả thanh toán
```

Ý chính: hệ thống không tin trực tiếp kết quả từ VNPay. Phải xác thực chữ ký và số tiền trước khi cập nhật đơn đã thanh toán.

---

## 9. Luồng đơn hàng của khách

```text
Người dùng vào trang đơn hàng của tôi
→ GET /api/me/orders hoặc GET /api/me/orders/[id]
→ backend lấy user từ session
→ chỉ truy vấn orders thuộc user đó
→ trả danh sách/chi tiết đơn → UI hiển thị lịch sử mua hàng
```

Ý chính: người dùng không truyền user id thủ công, backend lấy user từ session để tránh xem đơn của người khác.

---

## 10. Luồng admin quản lý đơn hàng

```text
Admin mở chi tiết đơn và đổi trạng thái
→ PATCH /api/admin/orders/[id]
→ backend validate trạng thái mới
→ cập nhật bảng orders
→ trả order mới → UI admin hiển thị trạng thái đã cập nhật
```

Ý chính: admin vận hành đơn hàng sau khi khách đặt, ví dụ xác nhận, xử lý, giao hàng hoặc cập nhật trạng thái thanh toán.

---

## 11. Luồng admin quản lý sản phẩm

### Sửa sản phẩm

```text
Admin chỉnh thông tin sản phẩm
→ PUT /api/admin/products/[id]
→ backend chuẩn hóa tên, giá, ảnh, thông số, biến thể
→ cập nhật products và product_images
→ trả product mới → UI báo lưu thành công
```

Ý chính: backend chuẩn hóa dữ liệu trước khi lưu để tránh ảnh, giá hoặc biến thể bị lệch so với form quản trị.

### Upload ảnh

```text
Admin chọn ảnh
→ POST /api/admin/upload
→ backend validate file và upload lên Cloudinary/storage
→ trả URL ảnh → UI hiển thị preview
→ URL được lưu thật khi admin bấm lưu sản phẩm
```

Ý chính: upload ảnh tách riêng với lưu sản phẩm. Ảnh được upload trước để lấy URL.

---

## 12. Luồng wishlist

```text
Người dùng bấm icon trái tim
→ POST/DELETE /api/me/wishlist
→ backend lấy user từ session, kiểm tra sản phẩm
→ thêm hoặc xóa wishlist trong database
→ trả success → UI đổi trạng thái yêu thích
```

Ý chính: wishlist là dữ liệu cá nhân nên luôn gắn với tài khoản đăng nhập.

---

## 13. Luồng địa chỉ người dùng

```text
Người dùng thêm/sửa/xóa địa chỉ
→ GET/POST/PATCH/DELETE /api/me/addresses
→ backend validate địa chỉ và kiểm tra quyền sở hữu
→ cập nhật bảng addresses
→ trả dữ liệu mới → UI cập nhật danh sách địa chỉ
```

Ý chính: người dùng chỉ được quản lý địa chỉ của chính mình, sau đó có thể dùng địa chỉ này khi checkout.

---

## 14. Luồng đánh giá sản phẩm

```text
Người dùng xem hoặc gửi đánh giá
→ GET /api/products/[slug]/reviews hoặc POST /api/me/orders/[id]/reviews
→ backend kiểm tra user, đơn hàng, sản phẩm trong đơn
→ đọc/ghi reviews
→ trả review/success → UI hiển thị đánh giá
```

Ý chính: review nên gắn với đơn hàng thật để tăng độ tin cậy, tránh đánh giá ảo.

---

## 15. Luồng chatbot

### Hỏi đáp sản phẩm/tư vấn

```text
Người dùng nhập câu hỏi
→ POST /api/chatbot
→ backend tạo/lấy chat session, lưu tin nhắn
→ nhận diện intent, gọi tool lấy dữ liệu thật hoặc dùng AI fallback
→ trả câu trả lời → UI hiển thị trong khung chat
```

Ý chính: chatbot ưu tiên dữ liệu thật như sản phẩm, tồn kho, đơn hàng; AI chỉ fallback khi không có dữ liệu phù hợp.

### Kiểm tra trạng thái đơn qua chatbot

```text
Người dùng hỏi mã đơn
→ POST /api/chatbot
→ chatbot nhận diện intent kiểm tra đơn
→ tool đọc bảng orders
→ trả trạng thái đơn hoặc yêu cầu nhập lại mã
→ UI hiển thị câu trả lời
```

Ý chính: nếu thiếu mã đơn, bot nên hỏi lại thay vì tự đoán.

---

## 16. Bảng ôn nhanh

| Nghiệp vụ | Câu giải thích ngắn |
|---|---|
| Đăng nhập | Xác thực tài khoản và tạo session cookie |
| Admin | Kiểm tra session trước khi cho vào trang quản trị |
| Sản phẩm | Lấy danh sách/chi tiết sản phẩm từ database |
| Giỏ hàng | Lưu sản phẩm định mua và kiểm tra tồn kho |
| Coupon | Kiểm tra điều kiện trước khi giảm giá |
| Checkout | Validate, tính tiền và tạo order/order_items |
| VNPay | Verify chữ ký và số tiền trước khi cập nhật thanh toán |
| Đơn hàng | User xem đơn của mình, admin cập nhật trạng thái |
| Wishlist | Lưu sản phẩm yêu thích theo từng tài khoản |
| Review | Chỉ cho đánh giá dựa trên đơn hàng hợp lệ |
| Chatbot | Ưu tiên trả lời bằng dữ liệu thật, AI fallback sau |

---

## 17. Các ý cần nhấn mạnh khi bảo vệ

- Backend luôn validate lại dữ liệu, không tin hoàn toàn frontend.
- Dữ liệu cá nhân như cart, order, address, wishlist đều lấy theo session.
- Checkout cần kiểm tra tồn kho, tính tiền và tạo đơn an toàn.
- Thanh toán online phải verify chữ ký, số tiền và trạng thái giao dịch.
- Admin có quyền vận hành dữ liệu nhưng vẫn đi qua API và validate.
- Chatbot không chỉ là AI trả lời tự do, mà có tool đọc dữ liệu thật của hệ thống.
