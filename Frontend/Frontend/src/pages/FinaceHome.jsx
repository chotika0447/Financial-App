import React, { useState } from "react";
import {
  Calendar,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Wallet,
  PiggyBank,
  Menu,
  X,
  HeartPulse,
  CreditCard,
} from "lucide-react";

// ---- design tokens ----
const colors = {
  page: "#fafaf8",
  card: "#ffffff",
  green: "#eef6e6",
  greenBorder: "#dcebcf",
  greenAccent: "#2f7d4f",
  greenDark: "#1f5f3c",
  ink: "#1f2420",
  sub: "#7c8478",
  avatarFrom: "#f4a56b",
  avatarTo: "#e8748f",
  fab: "#f4b731",
};

const checklistItems = [
  { id: 1, label: "ตั้งงบประมาณรายเดือน" },
  { id: 2, label: "บันทึกรายจ่ายวันนี้" },
  { id: 3, label: "ตรวจสอบยอดเงินออม" },
];

const news = [
  { id: 1, title: "5 วิธีออมเงินง่าย ๆ ในแต่ละเดือน" },
  { id: 2, title: "รู้จักกองทุนรวมสำหรับมือใหม่" },
  { id: 3, title: "เคล็ดลับลดหนี้บัตรเครดิตให้หมดไว" },
  { id: 4, title: "วางแผนการเงินก่อนสิ้นปี" },
];

const fabMenu = [
  { id: "health", label: "ประเมินสุขภาพทางการเงิน", icon: HeartPulse },
  { id: "debt", label: "จัดการหนี้สิน", icon: CreditCard },
  { id: "savings", label: "กระเป๋าเงินออม", icon: PiggyBank },
  { id: "records", label: "รายรับ-รายจ่าย", icon: FileText },
];

const styleSheet = `
  .fh-root {
    min-height: 100vh;
    width: 100%;
    background: ${colors.page};
    box-sizing: border-box;
    font-family: 'Noto Sans Thai', 'IBM Plex Sans Thai', system-ui, -apple-system, sans-serif;
  }
  .fh-shell {
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px 16px 100px;
    box-sizing: border-box;
  }
  .fh-cards-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .fh-main-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 24px;
  }
  @media (min-width: 720px) {
    .fh-cards-row {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @media (min-width: 960px) {
    .fh-main-grid {
      grid-template-columns: 2fr 1fr;
      align-items: start;
    }
    .fh-shell {
      padding: 32px 40px 100px;
    }
  }
`;

function Avatar() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${colors.avatarFrom}, ${colors.avatarTo})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 600,
        fontSize: 15,
        flexShrink: 0,
      }}
    >
      S
    </div>
  );
}

function IconButton({ children, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "none",
        background: "#f2f2f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: colors.ink,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function ActionCard({ icon: Icon, title, subtitle, children, onClick, tint }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: "left",
        border: `1px solid ${tint ? colors.greenBorder : "#ececec"}`,
        background: tint ? colors.green : colors.card,
        borderRadius: 16,
        padding: "14px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 96,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: tint ? "#dcebcf" : "#f2f2f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={17} color={colors.greenDark} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: colors.ink }}>
          {title}
        </p>
        {subtitle && (
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: colors.sub }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </button>
  );
}

export default function FinanceHome() {
  const [checked, setChecked] = useState({});
  const [monthIndex, setMonthIndex] = useState(0);
  const [newsIndex, setNewsIndex] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);

  const months = ["กรกฎาคม 2568", "สิงหาคม 2568", "กันยายน 2568"];
  const income = 38950;
  const expense = 21650;
  const balance = income - expense;

  const toggleCheck = (id) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const fmt = (n) => n.toLocaleString("th-TH");

  return (
    <div className="fh-root">
      <style>{styleSheet}</style>
      <div className="fh-shell">
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 15, color: colors.sub }}>
              สวัสดีค่ะ คุณ{" "}
              <span style={{ color: colors.ink, fontWeight: 700 }}>
                Scarlette
              </span>
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.sub }}>
              วันพุธที่ 21 มกราคม 2568
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <IconButton label="ปฏิทิน">
              <Calendar size={16} />
            </IconButton>
            <IconButton label="การแจ้งเตือน">
              <Bell size={16} />
            </IconButton>
            <Avatar />
          </div>
        </div>

        <div className="fh-main-grid">
          {/* left / main column */}
          <div>
            {/* month / summary card */}
            <div
              style={{
                background: colors.green,
                border: `1px solid ${colors.greenBorder}`,
                borderRadius: 18,
                padding: "16px 18px 18px",
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  maxWidth: 320,
                }}
              >
                <button
                  aria-label="เดือนก่อนหน้า"
                  onClick={() => setMonthIndex((i) => Math.max(0, i - 1))}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: colors.greenDark,
                    display: "flex",
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: colors.ink }}>
                  {months[monthIndex]}
                </p>
                <button
                  aria-label="เดือนถัดไป"
                  onClick={() => setMonthIndex((i) => Math.min(months.length - 1, i + 1))}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: colors.greenDark,
                    display: "flex",
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  padding: "12px 8px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  textAlign: "center",
                  maxWidth: 480,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: colors.sub }}>รายรับ</p>
                  <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: colors.ink }}>
                    {fmt(income)}
                  </p>
                </div>
                <div style={{ borderLeft: "1px solid #eee", borderRight: "1px solid #eee" }}>
                  <p style={{ margin: 0, fontSize: 11, color: colors.sub }}>รายจ่าย</p>
                  <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: colors.ink }}>
                    {fmt(expense)}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: colors.sub }}>คงเหลือ</p>
                  <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: colors.greenAccent }}>
                    +{fmt(balance)}
                  </p>
                </div>
              </div>
            </div>

            {/* checklist */}
            <p style={{ margin: "0 0 8px", fontSize: 13.5, fontWeight: 700, color: colors.ink }}>
              Check List
            </p>
            <div
              style={{
                background: colors.card,
                border: "1px solid #ececec",
                borderRadius: 16,
                padding: "14px 16px",
                marginBottom: 20,
              }}
            >
              {checklistItems.map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 0",
                    cursor: "pointer",
                  }}
                >
                  <span
                    onClick={() => toggleCheck(item.id)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: `1.5px solid ${checked[item.id] ? colors.greenAccent : "#ccc"}`,
                      background: checked[item.id] ? colors.greenAccent : "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {checked[item.id] && (
                      <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: checked[item.id] ? colors.sub : colors.ink,
                      textDecoration: checked[item.id] ? "line-through" : "none",
                    }}
                  >
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {/* action cards */}
            <div className="fh-cards-row" style={{ marginBottom: 20 }}>
              <ActionCard icon={FileText} title="บันทึกรายรับ-รายจ่าย" />
              <ActionCard
                icon={CreditCard}
                title="จัดการหนี้สิน"
                subtitle="ผ่อนโทรศัพท์ · เหลือ 12 วัน"
                tint
              >
                <div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 6,
                      background: "#dcebcf",
                      overflow: "hidden",
                      marginTop: 2,
                    }}
                  >
                    <div
                      style={{
                        width: "20%",
                        height: "100%",
                        background: colors.greenAccent,
                      }}
                    />
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 10.5, color: colors.sub }}>
                    ความคืบหน้า 20% · 500/2,500 บาท
                  </p>
                </div>
              </ActionCard>
              <ActionCard icon={Wallet} title="กระเป๋าออม" />
            </div>

            {/* health score button */}
            <button
              style={{
                width: "100%",
                background: colors.card,
                border: "1px solid #ececec",
                borderRadius: 16,
                padding: "14px 16px",
                fontSize: 13.5,
                fontWeight: 700,
                color: colors.ink,
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              ประเมินสุขภาพทางการเงินของคุณ
            </button>
          </div>

          {/* right / side column */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 13.5, fontWeight: 700, color: colors.ink }}>
              ข่าวสารทางการเงิน
            </p>
            <div
              style={{
                position: "relative",
                background: colors.card,
                border: "1px solid #ececec",
                borderRadius: 16,
                padding: "22px 40px",
                minHeight: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
              }}
            >
              <button
                aria-label="ข่าวก่อนหน้า"
                onClick={() => setNewsIndex((i) => (i - 1 + news.length) % news.length)}
                style={{
                  position: "absolute",
                  left: 8,
                  border: "none",
                  background: "#f2f2f0",
                  borderRadius: "50%",
                  width: 26,
                  height: 26,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <p style={{ margin: 0, fontSize: 12.5, color: colors.ink }}>
                {news[newsIndex].title}
              </p>
              <button
                aria-label="ข่าวถัดไป"
                onClick={() => setNewsIndex((i) => (i + 1) % news.length)}
                style={{
                  position: "absolute",
                  right: 8,
                  border: "none",
                  background: "#f2f2f0",
                  borderRadius: "50%",
                  width: 26,
                  height: 26,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
              {news.map((n, i) => (
                <span
                  key={n.id}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: i === newsIndex ? colors.greenAccent : "#ddd",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAB menu */}
      {fabOpen && (
        <div
          style={{
            position: "fixed",
            right: 24,
            bottom: 90,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 10,
            zIndex: 20,
          }}
        >
          {fabMenu.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                border: "none",
                background: colors.card,
                borderRadius: 999,
                padding: "8px 8px 8px 16px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 12.5, color: colors.ink, whiteSpace: "nowrap" }}>
                {label}
              </span>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: colors.green,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={15} color={colors.greenDark} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        aria-label={fabOpen ? "ปิดเมนู" : "เปิดเมนู"}
        onClick={() => setFabOpen((o) => !o)}
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: colors.fab,
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 6px 16px rgba(244,183,49,0.5)",
          zIndex: 30,
        }}
      >
        {fabOpen ? <X size={22} color="#fff" /> : <Menu size={22} color="#fff" />}
      </button>
    </div>
  );
}