# Hệ thống quản lý tài khoản sinh viên CTU - ATTT

> Ứng dụng web hỗ trợ sinh viên tra cứu, gửi yêu cầu quản lý tài khoản và trao đổi với quản trị viên. Dự án học phần CT005D05, học kỳ 1 năm học 2026–2027.

## Tổng quan

Ứng dụng gồm trang tra cứu công khai, quy trình xác minh email sinh viên và trang quản trị. Giao diện được xây dựng bằng HTML, CSS và JavaScript thuần; Supabase cung cấp xác thực và các chức năng dữ liệu thông qua RPC.

## Tính năng

- **Tra cứu tài khoản:** Tra cứu theo email `@student.ctu.edu.vn` và mật khẩu tài khoản; hiển thị tên tài khoản và trạng thái.
- **Đăng ký yêu cầu:** Xác minh email bằng OTP, gửi tên tài khoản và yêu cầu để quản trị viên xét duyệt.
- **Gửi phản hồi:** Sinh viên gửi yêu cầu, xem trạng thái và phản hồi của quản trị viên, hoặc xóa phản hồi của mình. Giao diện giới hạn tối đa 3 phản hồi hiển thị cho mỗi người dùng.
- **Quản trị:** Đăng nhập quản trị có bước OTP; xem, tìm kiếm, lọc, thêm, cập nhật hoặc xóa tài khoản và xử lý phản hồi.
- **Giao diện giới thiệu:** Có phần giới thiệu dự án, hình ảnh, video và câu hỏi thường gặp.

## Công nghệ

- HTML, CSS và JavaScript thuần
- Supabase Auth
- Supabase PostgREST RPC và PostgreSQL

## Cấu trúc dự án

```text
.
├── index.html       # Trang chủ và tra cứu tài khoản
├── index.css
├── index.js
├── user.html        # Xác minh email, đăng ký và phản hồi
├── user.css
├── user.js
├── moderator.html   # Trang quản trị
├── moderator.css
├── moderator.js
├── images/          # Logo và hình ảnh giao diện
└── README.md
```


## Cấu hình Supabase

Trình duyệt đọc URL dự án và anon key từ `index.js`. Khi chạy bản sao của dự án, thay các giá trị đó bằng URL và publishable/anon key của dự án Supabase của bạn. Không đặt service-role key, mật khẩu cơ sở dữ liệu hoặc token bí mật trong mã frontend.

Backend cần được tạo và cấu hình riêng trong Supabase. Mã frontend hiện gọi một số RPC như:

- Sinh viên: `lookup_user_by_email`, `get_my_registration_status`, `submit_registration_request`, `list_my_feedback`, `submit_my_feedback`, `delete_my_feedback`.
- Quản trị viên: `list_managed_users`, `create_user_with_password`, `update_user_details`, `set_user_password`, `delete_managed_user`, `list_feedback_for_moderator`, `update_feedback_for_moderator`, `delete_feedback_for_moderator`.

Các hàm quản lý phiên moderator và các ràng buộc dữ liệu bổ sung cũng cần được cấu hình phía Supabase. **Schema SQL và định nghĩa đầy đủ các hàm RPC hiện chưa có trong repository này**, nên chỉ cấu hình frontend là chưa đủ để dựng backend mới. Không chạy bản demo với dữ liệu thật trước khi thiết lập và kiểm tra quyền truy cập, RLS và các hàm RPC.

Để cấp quyền quản trị, tài khoản cần có `role: moderator` trong `app_metadata`. Quản trị viên dự án có thể đặt hoặc gỡ role trong Supabase SQL Editor bằng cách thay email mẫu dưới đây:

```sql
-- Cấp quyền moderator
UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"moderator"}'::jsonb
WHERE lower(email) = lower('moderator@example.com');
```
```sql
-- Gỡ quyền moderator
UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) - 'role'
WHERE lower(email) = lower('moderator@example.com')
  AND raw_app_meta_data ->> 'role' = 'moderator';
```

Chỉ người quản lý dự án có quyền truy cập SQL Editor mới nên thực hiện các thao tác này. Không đưa thông tin đăng nhập quản trị hoặc khóa bí mật vào repository.

## Lưu ý bảo mật

Đây là dự án học tập/minh họa, không phải hệ thống sẵn sàng xử lý thông tin xác thực thật. Quy trình hiện tại cho phép gửi mật khẩu tài khoản để quản trị viên xét duyệt và có giao diện hiển thị mật khẩu; không dùng mật khẩu thật hoặc dữ liệu cá nhân thật khi trình diễn. Một hệ thống thực tế nên để người dùng tự xác thực và đặt mật khẩu qua nhà cung cấp danh tính, không lưu mật khẩu dạng có thể xem lại.

Anon/publishable key được dùng từ trình duyệt nhưng chỉ phù hợp để công khai khi chính sách RLS và quyền thực thi RPC đã được kiểm tra. Không bao giờ công khai service-role key. Trước khi chuyển repository sang public, cần rà soát lịch sử Git và xóa/thu hồi mọi bí mật hoặc dữ liệu thật đã từng được commit.

## Nhóm thực hiện

- **Phạm Minh Thông (B2605470), Đại học Cần Thơ:** Tìm hiểu và phát triển các script, chức năng cốt lõi.
- **Phạm Duy Thái (B2605464), Đại học Cần Thơ:** Thiết kế giao diện, soạn báo cáo và giới thiệu sản phẩm.

## Liên kết

-	Kho mã nguồn kết quả dự án: https://github.com/GH-Courses/26-27hk1-ct005d05-labs-valguypmt/tree/master/project
-	Kho mã nguồn riêng của dự án: https://github.com/valguypmt/Project-26-27HK1-CT005D05
-	Video giới thiệu dự án trên YouTube: https://www.youtube.com/watch?v=jGaZyjvvN3Y
-	Link bản triển khai thực tế dự án: https://valguypmt.github.io/Project-26-27HK1-CT005D05
