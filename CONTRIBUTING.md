# Luật đặt tên nhánh và commit

Repo dùng chuẩn [Conventional Commits](https://www.conventionalcommits.org/). Luật này
được kiểm tra tự động trên mỗi Pull Request bởi workflow
[`naming.yml`](.github/workflows/naming.yml): sai luật thì PR báo đỏ, ghi rõ chỗ sai.

Cùng một luật áp dụng cho cả `core-banking-system` và `banking-portfolio-docs`.

---

## 1. Type (dùng chung cho nhánh và commit)

| Type | Dùng khi | Ví dụ |
|---|---|---|
| `feat` | Thêm tính năng cho site | thêm ô tìm kiếm, trang mới |
| `fix` | Sửa lỗi hiển thị/build | sửa link hỏng, sai base path |
| `refactor` | Đổi cấu trúc code, **không** đổi hành vi | tách config sidebar |
| `perf` | Tăng tốc độ tải trang | nén ảnh |
| `test` | Chỉ thêm/sửa test | |
| `docs` | Thêm/sửa **nội dung** tài liệu (trang `.md`, ADR, devlog) | viết ADR mới |
| `build` | Build, dependency, `package.json` | nâng VitePress |
| `ci` | GitHub Actions, pipeline | thêm workflow kiểm tra |
| `chore` | Việc vặt không thuộc nhóm nào ở trên | sửa `.gitignore` |
| `style` | Format, khoảng trắng — không đổi logic | chạy formatter |
| `revert` | Hoàn tác một commit trước đó | |

---

## 2. Tên nhánh

```
<type>/<mo-ta-ngan>
<type>/<so-issue>-<mo-ta-ngan>
```

- Chữ thường, số và dấu gạch ngang `-` (kebab-case). Không dấu cách, không `_`, không chữ hoa, không tiếng Việt có dấu.
- Tối đa 60 ký tự.
- Ngoài các type ở bảng trên, nhánh còn có thể dùng:
  - `hotfix/...` — sửa gấp lỗi đang chạy thật
  - `release/1.2.0` — chuẩn bị phát hành

| ✅ Đúng | ❌ Sai | Vì sao sai |
|---|---|---|
| `docs/adr-014-idempotency` | `feature/adr-014` | `feature` không phải type |
| `fix/12-broken-favicon-path` | `fix/Favicon_Path` | chữ hoa, dấu `_` |
| `feat/dark-mode-diagrams` | `toan-dev` | thiếu type |
| `release/1.2.0` | `feat/` | thiếu mô tả |

Được miễn: `main`, `claude/*` (nhánh do Claude Code tự tạo), `dependabot/*`.

---

## 3. Commit message

```
<type>(<scope>): <mô tả>

<body — không bắt buộc: giải thích VÌ SAO thay đổi>
```

**Dòng đầu (bắt buộc đúng luật):**
- `type` lấy từ bảng ở mục 1.
- `scope` không bắt buộc, viết thường kebab-case: phần nào của hệ thống bị ảnh hưởng.
- Mô tả bằng **tiếng Anh**, thể mệnh lệnh (`add`, `fix`, `remove` — không phải `added`, `fixes`),
  bắt đầu bằng **chữ thường**, **không** kết thúc bằng dấu chấm.
- Cả dòng tối đa **72 ký tự**.
- Thay đổi phá vỡ tương thích (đổi API, đổi schema): thêm `!` trước dấu `:`,
  VD `refactor(config)!: move english pages under /en/`.

**Scope gợi ý cho repo này:**

| Scope | Phạm vi |
|---|---|
| `theme` | `docs/.vitepress/theme/` (CSS, component) |
| `config` | `docs/.vitepress/config.mts` (nav, sidebar, head) |
| `core-banking` | `docs/core-banking/` |
| `payment-gateway` | `docs/payment-gateway/` |
| `adr` | `docs/adr/` |
| `devlog` | `docs/devlog/` |
| `i18n` | Bản dịch tiếng Anh `docs/en/` |
| `diagram` | Sơ đồ SVG, `scripts/diagrams.py` |
| `deps` | Dependency (`package.json`, lockfile) |

| ✅ Đúng | ❌ Sai | Vì sao sai |
|---|---|---|
| `docs(adr): add ADR-014 on idempotency keys` | `Add ADR 14` | thiếu type, viết hoa |
| `feat(theme): add monochrome status badges` | `feat(theme): Added badges.` | chữ hoa, thì quá khứ, dấu chấm |
| `fix(config): correct base path for favicon` | `fix:favicon` | thiếu dấu cách sau `:` |
| `build(deps): bump vitepress to 1.6.5` | `update` | thiếu type và mô tả |
| `docs(i18n): translate devlog phase 2` | `docs(I18N): ...` | scope viết hoa |

Được miễn: commit `Merge pull request ...`, `Merge branch ...` và `Revert "..."` do GitHub/git tự sinh.

**Tiêu đề Pull Request** theo đúng luật của dòng đầu commit (khi dùng *Squash and merge*,
tiêu đề PR trở thành commit trên `main`).

---

## 4. Tự kiểm tra trước khi push

```bash
# Tên nhánh hiện tại
bash .github/scripts/check-naming.sh branch "$(git branch --show-current)"

# Các commit chưa có trên main
bash .github/scripts/check-naming.sh range origin/main HEAD

# Thử một message trước khi commit
bash .github/scripts/check-naming.sh commit "docs(adr): add ADR-014 on idempotency keys"
```

Sửa commit sai **trước khi** mở PR:

```bash
git commit --amend -m "fix(config): correct base path for favicon"   # commit mới nhất
git rebase -i origin/main                                        # nhiều commit: đổi "pick" thành "reword"
```

Lịch sử commit trước khi áp dụng luật này (VD `Redesign docs theme ...`) giữ nguyên, không cần sửa —
CI chỉ kiểm tra các commit mới trong từng PR.
