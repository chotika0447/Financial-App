import './Home.css';
import { useEffect, useState } from 'react';

import HomeHeader from '../components/HomeHeader';
import Navbar from '../components/Navbar';
import DashboardSummary from '../components/DashboardSummary';

function Home() {
  const [user, setUser] = useState(null);
  const [monthly, setMonthly] = useState({ income: null, expense: null });
  const [monthlyError, setMonthlyError] = useState('');
  const [news, setNews] = useState([]);
  const [newsState, setNewsState] = useState('loading');
  const [activeNews, setActiveNews] = useState(0);
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

  useEffect(() => {
    const controller = new AbortController();
    async function loadNews() {
      try {
        // Official Thai PBS public API: no key, CORS enabled.
        const response = await fetch('https://api.thaipbs.net/v1/news/posts?page=1&limit=60', { signal: controller.signal });
        if (!response.ok) throw new Error(`News API HTTP ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload.data)) throw new Error('Unexpected news response');
        const keywords = /เศรษฐกิจ|การเงิน|ธนาคาร|ดอกเบี้ย|เงินเฟ้อ|การลงทุน|ตลาดหุ้น|เงินบาท|หนี้|ภาษี|ออมเงิน|ค่าครองชีพ|ธุรกิจ|กองทุน|สินเชื่อ|ราคาทอง/;
        const filtered = payload.data.filter(item => {
          const category = Array.isArray(item.categories) ? item.categories.map(c => c.title || '').join(' ') : '';
          const tags = Array.isArray(item.tags) ? item.tags.map(t => t.title || '').join(' ') : '';
          return keywords.test(`${item.title || ''} ${category} ${tags}`);
        }).filter(item => item.title && /^https:\/\//.test(item.canonical || ''))
          .sort((a, b) => new Date(b.publishTime || 0) - new Date(a.publishTime || 0))
          .slice(0, 6);
        if (!controller.signal.aborted) {
          setNews(filtered);
          setActiveNews(0);
          setNewsState(filtered.length ? 'ready' : 'empty');
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('News fetch failed:', error);
          setNewsState('error');
        }
      }
    }
    loadNews();
    return () => controller.abort();
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
        <section className="news-section home-live-news">
          <div className="home-news-heading">
            <div>
              <h3>ข่าวสารเกี่ยวกับการเงิน</h3>
              <p className="home-news-note">ข่าวเศรษฐกิจและการเงินจาก Thai PBS • อัปเดตจากแหล่งข่าวจริง</p>
            </div>
            <a href="https://www.thaipbs.or.th/news" target="_blank" rel="noopener noreferrer">ดูข่าวทั้งหมด ↗</a>
          </div>

          {newsState === 'loading' && <div className="home-news-status" role="status">กำลังโหลดข่าวล่าสุด...</div>}
          {newsState === 'error' && <div className="home-news-status" role="status">ไม่สามารถโหลดข่าวได้ในขณะนี้ <a href="https://www.thaipbs.or.th/news" target="_blank" rel="noopener noreferrer">อ่านข่าวที่ Thai PBS ↗</a></div>}
          {newsState === 'empty' && <div className="home-news-status" role="status">ยังไม่พบข่าวการเงินในรายการล่าสุด <a href="https://www.thaipbs.or.th/news" target="_blank" rel="noopener noreferrer">ดูข่าวทั้งหมด ↗</a></div>}
          {newsState === 'ready' && news[activeNews] && (
            <>
              <a className="home-news-feature" href={news[activeNews].canonical} target="_blank" rel="noopener noreferrer">
                {news[activeNews].mediaUrl || news[activeNews].media?.default || news[activeNews].seoDetails?.ogImage ? (
                  <img className="home-news-photo" src={news[activeNews].mediaUrl || news[activeNews].media?.default || news[activeNews].seoDetails?.ogImage} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />
                ) : <div className="home-news-photo home-news-photo-empty">ข่าวเศรษฐกิจ</div>}
                <div className="home-news-info">
                  <span className="home-news-publisher">Thai PBS {news[activeNews].publishTime ? `• ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(news[activeNews].publishTime))}` : ''}</span>
                  <h4>{news[activeNews].title}</h4>
                  <span className="home-news-read">อ่านข่าวต้นฉบับ ↗</span>
                </div>
              </a>
              <div className="home-news-controls">
                <button type="button" onClick={() => setActiveNews(index => (index - 1 + news.length) % news.length)} aria-label="ข่าวก่อนหน้า">‹</button>
                <span>{activeNews + 1} / {news.length}</span>
                <button type="button" onClick={() => setActiveNews(index => (index + 1) % news.length)} aria-label="ข่าวถัดไป">›</button>
              </div>
            </>
          )}
        </section>


        {/* ================= DASHBOARD ================= */}
        <div
          className='dashboard-summary-click'
          onClick={(e) => {
            if (e.target.closest('button'))
              return;
            navigate('/dashboard');}
          }
            
          role='button'
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.target.closest('button'))
              return;
            if (e.key === 'Enter' || e.key === ' '){
              e.preventDefault();
              navigate('/dashboard');
            }
          }}
          >
            <DashboardSummary compact/>
          </div>

        

      </main>


      {/* ================= BOTTOM NAV ================= */}
      <Navbar />

    </div>
  );
}

export default Home;