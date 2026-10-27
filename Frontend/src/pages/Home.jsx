import './Home.css';
import { useEffect, useState } from 'react';

import HomeHeader from '../components/HomeHeader';
import Navbar from '../components/Navbar';

function Home() {
  const [user, setUser] = useState(null);
  const [monthly, setMonthly] = useState({ income: null, expense: null });
  const [monthlyError, setMonthlyError] = useState('');
  const money = (n) => n === null ? '—' : `${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;
  const monthLabel = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', month: 'long', year: 'numeric', calendar: 'buddhist' }).format(new Date());
  const currentMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit' }).format(new Date());

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) { setMonthlyError('กรุณาเข้าสู่ระบบเพื่อดูยอดเดือนนี้'); return; }
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/transactions/', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!response.ok) throw new Error('โหลดรายการธุรกรรมไม่สำเร็จ');
        const payload = await response.json();
        const items = Array.isArray(payload) ? payload : Array.isArray(payload.results) ? payload.results : null;
        if (!items) throw new Error('รูปแบบข้อมูลธุรกรรมไม่ถูกต้อง');
        const totals = { income: 0, expense: 0 };
        for (const item of items) {
          if (typeof item.transaction_date !== 'string' || item.transaction_date.slice(0, 7) !== currentMonth) continue;
          if (!Object.prototype.hasOwnProperty.call(totals, item.transaction_type)) continue;
          const amount = Number(item.amount);
          if (Number.isFinite(amount)) totals[item.transaction_type] += amount;
        }
        setMonthly(totals);
      } catch (error) { if (error.name !== 'AbortError') setMonthlyError(error.message); }
    }
    load();
    return () => controller.abort();
  }, [currentMonth]);


  useEffect(() => {
    const accessToken = sessionStorage.getItem('accessToken');

    if (!accessToken) {
      return;
    }

    let cancelled = false;

    fetch('/users/me/', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
        if (!cancelled) setUser(data);
      })
      .catch(error => console.error(error.message));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="home-page">

      <HomeHeader user={user} />

      {/* ================= MAIN ================= */}
      <main className="home-content">

        <p className="home-period">สรุปประจำเดือน{monthLabel}</p>
        {monthlyError && <p className="home-data-error" role="status">{monthlyError}</p>}
        {/* Summary Cards */}
        <section className="summary-grid">

          <div className="summary-card income-card">
            <div className="card-title">รายรับ</div>

            <div className="card-bottom">
              <span>เดือนนี้</span>
              <strong>{money(monthly.income)}</strong>
            </div>
          </div>

          <div className="summary-card expense-card">
            <div className="card-title">รายจ่าย</div>

            <div className="card-bottom">
              <span>เดือนนี้</span>
              <strong>{money(monthly.expense)}</strong>
            </div>
          </div>

          <div className="summary-card debt-card">
            <div className="card-title">หนี้สิน</div>

            <div className="card-bottom">
              <span>รวมทั้งหมด</span>
              <strong>—</strong>
            </div>
          </div>

          <div className="summary-card receivable-card">
            <div className="card-title">กระเป๋าออม</div>

            <div className="card-bottom">
              <span>รวมทั้งหมด</span>
              <strong>—</strong>
            </div>
          </div>

        </section>


        {/* ================= NEWS ================= */}
        <section className="news-section">

          <h3>ข่าวสารเกี่ยวกับการเงิน</h3>
          <p className="home-news-note">ติดตามข่าวจากธนาคารแห่งประเทศไทย (ยังไม่ได้เชื่อม API ข่าวอัตโนมัติ)</p>

          <a className="home-news-source" href="https://www.bot.or.th/" target="_blank" rel="noopener noreferrer">อ่านข่าวและประกาศจากธนาคารแห่งประเทศไทย ↗</a>
          <div className="news-card">
            <div className="news-image">
              <div className="news-overlay">
                FINANCE
                <span>BUSINESS</span>
              </div>
            </div>
          </div>

          <div className="news-dots">
            <span></span>
            <span></span>
            <span className="active"></span>
            <span></span>
            <span></span>
          </div>

        </section>


        {/* ================= DASHBOARD ================= */}
        <section className="dashboard-section">

          <h3>แดชบอร์ด <small>(ข้อมูลกราฟตัวอย่าง)</small></h3>

          {/* Dashboard tabs */}
          <div className="dashboard-tabs">
            <button className="active">รายรับ</button>
            <button>รายรายจ่าย</button>
            <button>การออม</button>
            <button>หนี้สิน</button>
          </div>


          {/* Donut Chart */}
          <div className="chart-container">

            <div className="donut-chart"></div>

            <div className="chart-legend">

              <div>
                <span className="legend-color food"></span>
                อาหาร 58%
              </div>

              <div>
                <span className="legend-color saving"></span>
                ออมเงิน 15%
              </div>

              <div>
                <span className="legend-color rent"></span>
                ค่าเช่า 10%
              </div>

              <div>
                <span className="legend-color travel"></span>
                ขนม 8%
              </div>

              <div>
                <span className="legend-color debt"></span>
                หนี้ 6%
              </div>

              <div>
                <span className="legend-color other"></span>
                ของใช้ 3%
              </div>

            </div>

          </div>

        </section>

      </main>


      {/* ================= BOTTOM NAV ================= */}
      <Navbar />

    </div>
  );
}

export default Home;