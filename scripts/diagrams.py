"""Sinh sơ đồ SVG inline cho docs (vi + en), không cần plugin Mermaid.

Chạy: python3 scripts/diagrams.py /tmp/svg  → dán nội dung file .svg vào trang .md
(khối <svg> không được chứa dòng trống). Màu lấy từ class .diagram trong
docs/.vitepress/theme/custom.css nên tự đổi theo light/dark.
"""
import os, sys

CW = {"t": 8.4, "s": 6.9, "mono": 7.2, "lbl": 6.3}  # ước lượng bề rộng ký tự (px)


class SVG:
    def __init__(self, uid, w, h, title, desc):
        self.uid, self.w, self.h = uid, w, h
        self.parts = [
            f'<svg class="diagram" viewBox="0 0 {w} {h}" role="img" aria-labelledby="{uid}-title {uid}-desc">',
            f'<title id="{uid}-title">{title}</title>',
            f'<desc id="{uid}-desc">{desc}</desc>',
            f'<defs><marker id="{uid}-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            f'<path class="arrowhead" d="M2 1L8 5L2 9"/></marker></defs>',
        ]

    def text(self, x, y, s, cls="s", anchor="middle", maxw=None):
        kind = "mono" if "mono" in cls else cls.split()[0]
        est = len(s) * CW.get(kind, 6.9)
        if maxw is not None:
            assert est <= maxw, f"[{self.uid}] text too wide ({est:.0f}>{maxw}): {s!r}"
        self.parts.append(
            f'<text class="{cls}" x="{x}" y="{y}" text-anchor="{anchor}" dominant-baseline="central">{esc(s)}</text>'
        )

    def box(self, x, y, w, h, title, subs=(), cls="box", mono_subs=False):
        self.parts.append(f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="10"/>')
        lines = [(title, "t")] + [(s, "s mono" if mono_subs else "s") for s in subs]
        step = 18
        top = y + h / 2 - step * (len(lines) - 1) / 2
        for i, (s, c) in enumerate(lines):
            self.text(x + w / 2, top + i * step, s, c, maxw=w - 16)

    def rect(self, x, y, w, h, cls):
        self.parts.append(f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="12"/>')

    def edge(self, pts, dashed=False, arrow=True):
        d = "M" + " L".join(f"{x} {y}" for x, y in pts)
        m = f' marker-end="url(#{self.uid}-arr)"' if arrow else ""
        self.parts.append(f'<path class="edge{" dashed" if dashed else ""}" d="{d}"{m}/>')

    def out(self):
        return "\n".join(self.parts + ["</svg>"])


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


# ---------------------------------------------------------------------------
L = {
    "vi": {
        "flow_title": "Luồng ghi một giao dịch rút tiền trong Core Banking",
        "flow_desc": "Request đi qua AccountController, AccountService khóa tài khoản, LedgerService ghi Transaction, bút toán và outbox event trong cùng một DB transaction. Sau commit, cache Redis bị evict và OutboxEventPublisher gửi sự kiện lên Kafka cho 4 consumer.",
        "svc_sub": ["SELECT … FOR UPDATE (ADR-007)", "số dư tính thẳng từ DB, không qua cache"],
        "ledger_sub": ["Transaction.record(): Nợ = Có (ADR-008)", "pullDomainEvents() → OutboxEvent"],
        "db_sub": ["transactions · ledger_entries · outbox_events", "ghi trong CÙNG 1 DB transaction (ADR-009)"],
        "commit": "COMMIT",
        "evict": "Evict cache số dư",
        "evict_sub": ["Redis · AFTER_COMMIT (ADR-010)"],
        "pub_sub": ["@Scheduled, 5s/lần"],
        "audit_sub": "idempotent",
        "poc": "PoC",
        "er_title": "Mô hình dữ liệu Core Banking",
        "er_desc": "Bảng transactions có nhiều ledger_entries, mỗi ledger_entry thuộc một account. Giao dịch hoàn tác trỏ về giao dịch gốc. Nhóm bảng sự kiện gồm outbox_events, processed_events và compliance_records.",
        "no_balance": "không có cột balance",
        "reversal": "hoàn tác",
        "events_grp": "Sự kiện & kiểm toán (V5–V7)",
        "outbox_sub": ["payload JSON", "published_at: NULL = chờ"],
        "processed_sub": ["event_id", "chống xử lý trùng"],
        "compliance_sub": ["1 dòng / LedgerEntry", "ghi bởi Audit consumer"],
        "ov_title": "Tổng quan 2 sub-project",
        "ov_desc": "Payment Gateway (Giai đoạn 2, chưa bắt đầu) sẽ gọi Core Banking (Giai đoạn 1, hoàn thành) qua REST nội bộ kèm Idempotency-Key.",
        "a_name": "A · Payment Gateway",
        "a_status": "Giai đoạn 2 — chưa bắt đầu",
        "a_items": ["pain.001 / pacs.008 (ISO 20022)", "Saga Orchestrator + bù trừ", "EOD Settlement (Spring Batch)", "Retry / dead-letter"],
        "b_name": "B · Core Banking",
        "b_status": "Giai đoạn 1 — hoàn thành",
        "b_items": ["Double-entry ledger, Nợ = Có", "Pessimistic lock chống overdraft", "Outbox + Kafka, Redis cache", "PostgreSQL / Oracle · K8s"],
        "ov_edge": "REST nội bộ",
        "ov_edge2": "+ Idempotency-Key",
        "ov_edge3": "(Giai đoạn 3)",
        "k8s_title": "Kiểm chứng Pessimistic Locking qua 3 Pod Kubernetes",
        "k8s_desc": "5 request rút tiền đồng thời đi qua Service NodePort, được phân tán tới 3 Pod. Cả 3 Pod cùng khóa một dòng Account trong database nên chỉ 1 request thành công, 4 request bị từ chối với HTTP 409.",
        "req": "5 request withdraw đồng thời",
        "req_sub": "đủ tiền cho đúng 1 request",
        "svc_k8s_sub": "NodePort :30080",
        "db_lock": "PostgreSQL",
        "db_lock_sub": ["SELECT … FOR UPDATE trên cùng 1 Account", "→ các request được tuần tự hóa tại DB"],
        "result": "Kết quả",
        "result_sub": ["1 × thành công · 4 × HTTP 409", "số dư cuối đúng, không âm"],
        "logs": "kubectl logs --prefix xác nhận request đến cả 3 Pod",
    },
    "en": {
        "flow_title": "Write path of a withdrawal in Core Banking",
        "flow_desc": "The request goes through AccountController, AccountService locks the account, LedgerService writes the Transaction, its entries and an outbox event in one DB transaction. After commit the Redis cache is evicted and OutboxEventPublisher sends the event to Kafka for 4 consumers.",
        "svc_sub": ["SELECT … FOR UPDATE (ADR-007)", "balance read from DB, never from cache"],
        "ledger_sub": ["Transaction.record(): debit = credit (ADR-008)", "pullDomainEvents() → OutboxEvent"],
        "db_sub": ["transactions · ledger_entries · outbox_events", "written in ONE DB transaction (ADR-009)"],
        "commit": "COMMIT",
        "evict": "Evict balance cache",
        "evict_sub": ["Redis · AFTER_COMMIT (ADR-010)"],
        "pub_sub": ["@Scheduled, every 5s"],
        "audit_sub": "idempotent",
        "poc": "PoC",
        "er_title": "Core Banking data model",
        "er_desc": "A transaction has many ledger_entries, each ledger_entry belongs to one account. A reversal transaction points to the original. The event tables are outbox_events, processed_events and compliance_records.",
        "no_balance": "no balance column",
        "reversal": "reversal",
        "events_grp": "Events & audit (V5–V7)",
        "outbox_sub": ["JSON payload", "published_at: NULL = pending"],
        "processed_sub": ["event_id", "deduplication"],
        "compliance_sub": ["1 row per LedgerEntry", "written by Audit consumer"],
        "ov_title": "The two sub-projects",
        "ov_desc": "Payment Gateway (Phase 2, not started) will call Core Banking (Phase 1, done) over internal REST with an Idempotency-Key.",
        "a_name": "A · Payment Gateway",
        "a_status": "Phase 2 — not started",
        "a_items": ["pain.001 / pacs.008 (ISO 20022)", "Saga Orchestrator + compensation", "EOD Settlement (Spring Batch)", "Retry / dead-letter"],
        "b_name": "B · Core Banking",
        "b_status": "Phase 1 — done",
        "b_items": ["Double-entry ledger, append-only", "Pessimistic lock vs. overdraft", "Outbox + Kafka, Redis cache", "PostgreSQL / Oracle · K8s"],
        "ov_edge": "internal REST",
        "ov_edge2": "+ Idempotency-Key",
        "ov_edge3": "(Phase 3)",
        "k8s_title": "Verifying pessimistic locking across 3 Kubernetes Pods",
        "k8s_desc": "5 concurrent withdraw requests go through a NodePort Service and are spread over 3 Pods. All Pods lock the same Account row in the database, so only 1 request succeeds and 4 are rejected with HTTP 409.",
        "req": "5 concurrent withdraw requests",
        "req_sub": "funds for exactly 1 request",
        "svc_k8s_sub": "NodePort :30080",
        "db_lock": "PostgreSQL",
        "db_lock_sub": ["SELECT … FOR UPDATE on the same Account", "→ requests serialized at the DB"],
        "result": "Result",
        "result_sub": ["1 × success · 4 × HTTP 409", "final balance correct, never negative"],
        "logs": "kubectl logs --prefix confirms all 3 Pods served requests",
    },
}


def flow(l, lang):
    d = SVG(f"cb-flow-{lang}", 680, 660, l["flow_title"], l["flow_desc"])
    cx, w = 340, 360
    x = cx - w / 2
    d.box(x, 16, w, 50, "AccountController", ["POST /accounts/{id}/withdraw"], mono_subs=True)
    d.edge([(cx, 66), (cx, 92)])
    d.box(x, 94, w, 68, "AccountService.withdraw()", l["svc_sub"])
    d.edge([(cx, 162), (cx, 188)])
    d.box(x, 190, w, 68, "LedgerService", l["ledger_sub"])
    d.edge([(cx, 258), (cx, 284)])
    d.box(x - 20, 286, w + 40, 68, "PostgreSQL / Oracle", l["db_sub"], cls="box-muted")
    # commit split
    d.text(cx, 378, l["commit"], "lbl")
    d.edge([(cx, 354), (cx, 366)], arrow=False)
    d.edge([(cx, 390), (cx, 400), (170, 400), (170, 424)])
    d.edge([(cx, 400), (510, 400), (510, 424)])
    d.box(30, 426, 280, 60, l["evict"], l["evict_sub"])
    d.box(370, 426, 280, 60, "OutboxEventPublisher", l["pub_sub"])
    d.edge([(510, 486), (510, 510)])
    d.box(370, 512, 280, 50, "Kafka", ["transaction-posted-topic"], cls="box-muted", mono_subs=True)
    # consumers
    cw, gap, y = 156, 6, 600
    xs = [20 + i * (cw + gap) for i in range(4)]
    names = [("Audit/Compliance", l["audit_sub"]), ("Fraud Detection", l["poc"]), ("Notification", l["poc"]), ("Reporting", l["poc"])]
    for xi, (n, s) in zip(xs, names):
        d.edge([(510, 562), (510, 584), (xi + cw / 2, 584), (xi + cw / 2, y - 2)], dashed=(s == l["poc"]))
        d.box(xi, y, cw, 50, n, [s], cls="box" if s != l["poc"] else "box-muted")
    d.h = 660
    return d.out()


def er(l, lang):
    d = SVG(f"cb-er-{lang}", 680, 470, l["er_title"], l["er_desc"])

    def table(x, y, w, name, cols, note=None):
        h = 34 + 20 * len(cols) + (22 if note else 0) + 8
        d.rect(x, y, w, h, "box")
        d.text(x + w / 2, y + 17, name, "t mono", maxw=w - 16)
        d.parts.append(f'<path class="edge" d="M{x} {y + 34} L{x + w} {y + 34}"/>')
        for i, c in enumerate(cols):
            d.text(x + 12, y + 34 + 12 + 20 * i, c, "s mono", anchor="start", maxw=w - 20)
        if note:
            d.text(x + w / 2, y + 34 + 12 + 20 * len(cols) + 6, note, "lbl", maxw=w - 16)
        return h

    table(20, 20, 200, "transactions", ["id  PK", "created_by", "reversal_of_", "  transaction_id  FK"])
    table(250, 20, 200, "ledger_entries", ["id  PK", "transaction_id  FK", "account_id  FK", "entry_type", "amount", "currency", "created_at"])
    table(480, 20, 180, "accounts", ["id  PK", "account_number", "account_type", "currency", "status", "created_at"], note=l["no_balance"])
    # relations
    d.edge([(220, 70), (248, 70)])
    d.text(226, 58, "1", "lbl")
    d.text(242, 58, "N", "lbl")
    d.edge([(450, 110), (478, 110)])
    d.text(456, 98, "N", "lbl")
    d.text(472, 98, "1", "lbl")
    # self-ref reversal
    d.edge([(60, 134), (60, 160), (20 + 200 - 40, 160), (180, 136)], dashed=True)
    d.text(120, 174, l["reversal"], "lbl")
    # events group
    d.rect(10, 262, 660, 196, "box-dashed")
    d.text(24, 282, l["events_grp"], "lbl", anchor="start")
    bw = 212
    d.box(18, 300, bw, 80, "outbox_events", l["outbox_sub"], cls="box-muted")
    d.box(234, 300, bw, 80, "processed_events", l["processed_sub"], cls="box-muted")
    d.box(450, 300, bw, 80, "compliance_records", l["compliance_sub"], cls="box-muted")
    d.edge([(124, 380), (124, 420), (556, 420), (556, 382)], dashed=True)
    d.text(340, 434, "Kafka → AuditComplianceConsumer", "lbl mono")
    return d.out()


def overview(l, lang):
    d = SVG(f"overview-{lang}", 680, 280, l["ov_title"], l["ov_desc"])
    for x, name, status, items, cls in [
        (20, l["a_name"], l["a_status"], l["a_items"], "box-muted"),
        (410, l["b_name"], l["b_status"], l["b_items"], "box"),
    ]:
        d.rect(x, 20, 250, 240, cls)
        d.text(x + 125, 48, name, "t", maxw=234)
        d.text(x + 125, 70, status, "lbl", maxw=234)
        d.parts.append(f'<path class="edge" d="M{x + 16} {88} L{x + 234} {88}"/>')
        for i, it in enumerate(items):
            d.text(x + 16, 116 + i * 34, it, "s", anchor="start", maxw=226)
    d.edge([(272, 140), (408, 140)], dashed=True)
    d.text(340, 112, l["ov_edge"], "lbl")
    d.text(340, 126, l["ov_edge2"], "lbl mono")
    d.text(340, 160, l["ov_edge3"], "lbl")
    return d.out()


def k8s(l, lang):
    d = SVG(f"k8s-{lang}", 680, 470, l["k8s_title"], l["k8s_desc"])
    d.box(170, 16, 340, 50, l["req"], [l["req_sub"]], cls="box-muted")
    d.edge([(340, 66), (340, 90)])
    d.box(220, 92, 240, 50, "Service", [l["svc_k8s_sub"]], cls="box-muted")
    xs = [40, 250, 460]
    for i, x in enumerate(xs):
        d.edge([(340, 142), (340, 158), (x + 90, 158), (x + 90, 176)])
        d.box(x, 178, 180, 50, f"Pod {i + 1}", ["AccountController"])
        d.edge([(x + 90, 228), (x + 90, 246), (340, 246), (340, 262)])
    d.box(140, 264, 400, 68, l["db_lock"], l["db_lock_sub"], cls="box-muted")
    d.edge([(340, 332), (340, 356)])
    d.box(190, 358, 300, 68, l["result"], l["result_sub"])
    d.text(340, 448, l["logs"], "lbl mono")
    return d.out()


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    for lang, l in L.items():
        for name, fn in [("flow", flow), ("er", er), ("overview", overview), ("k8s", k8s)]:
            svg = fn(l, lang)
            assert "\n\n" not in svg  # dòng trống sẽ làm markdown cắt khối HTML
            open(os.path.join(out, f"{name}-{lang}.svg"), "w").write(svg)
    print("generated", sorted(os.listdir(out)))
