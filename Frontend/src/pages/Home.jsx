import './Home.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeHeader from '../components/HomeHeader';
import Navbar from '../components/Navbar';
import DashboardSummary from '../components/DashboardSummary';

function Home() {
  const [user, setUser] = useState(null);
  const [news, setNews] = useState([]);
  const [newsState, setNewsState] = useState('loading');
  const [activeNews, setActiveNews] = useState(0);
  const navigate = useNavigate();

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
        const response = await fetch('/news/', { signal: controller.signal });
        if (!response.ok) throw new Error(`News API HTTP ${response.status}`);

        const payload = await response.json();
        const items = Array.isArray(payload.news) ? payload.news : [];

        if (!controller.signal.aborted) {
          setNews(items);
          setActiveNews(0);
          setNewsState(items.length ? 'ready' : 'empty');
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

        {/* Summary Cards */}

        <section className="summary-grid">

          {/* รายรับ */}
          <div
            className="summary-card income-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/transactions/')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/transactions/');
              }
            }}
            aria-label="ดูรายการรายรับ"
          >
            <div className="card-title">รายรับ</div>

            <div className="card-bottom">
              <span>รวมทั้งหมด</span>
              <strong>6,800 ฿</strong>
            </div>
          </div>

          {/* รายจ่าย */}
          <div
            className="summary-card expense-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/transactions/')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/transactions/');
              }
            }}
            aria-label="ดูรายการรายจ่าย"
          >
            <div className="card-title">รายจ่าย</div>

            <div className="card-bottom">
              <span>รวมทั้งหมด</span>
              <strong>6,800 ฿</strong>
            </div>
          </div>

          {/* หนี้สิน */}
          <div
            className="summary-card debt-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/debts/')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/debts/');
              }
            }}
            aria-label="ดูรายการหนี้สิน"
          >
            <div className="card-title">หนี้สิน</div>

            <div className="card-bottom">
              <span>รวมทั้งหมด</span>
              <strong>2,000 ฿</strong>
            </div>
          </div>

          {/* กระเป๋าออม */}
          <div
            className="summary-card receivable-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/saving/')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/saving/');
              }
            }}
            aria-label="ดูกระเป๋าเงินออม"
          >
            <div className="card-title">กระเป๋าออม</div>

            <div className="card-bottom">
              <span>รวมทั้งหมด</span>
              <strong>2,000 ฿</strong>
            </div>
          </div>

        </section>

        {/* ================= NEWS ================= */}
        <section className="news-section home-live-news">
          <div className="home-news-heading">
            <div>
              <h3>ข่าวสารเกี่ยวกับการเงิน</h3>
              <p className="home-news-note">ข่าวเศรษฐกิจและการเงินจาก Thai PBS</p>
            </div>
          </div>

          {newsState === 'loading' && <div className="home-news-status" role="status">กำลังโหลดข่าวล่าสุด...</div>}
          {newsState === 'error' && (
            <div className="home-news-status" role="status">
              ไม่สามารถโหลดข่าวได้ในขณะนี้{' '}
              <a href="https://www.thaipbs.or.th/news" target="_blank" rel="noopener noreferrer">
                อ่านข่าวที่ Thai PBS ↗
              </a>
            </div>
          )}
          {newsState === 'empty' && <div className="home-news-status" role="status">ยังไม่พบข่าวการเงินในรายการล่าสุด</div>}
          {newsState === 'ready' && news[activeNews] && (
            <>
              <a className="home-news-feature" href={news[activeNews].canonical} target="_blank" rel="noopener noreferrer">
                {news[activeNews].mediaUrl ? (
                  <img
                    className="home-news-photo"
                    src={news[activeNews].mediaUrl}
                    alt=""
                    loading="lazy"
                    onError={event => { event.currentTarget.style.display = 'none'; }}
                  />
                ) : <div className="home-news-photo home-news-photo-empty">ข่าวเศรษฐกิจ</div>}
                <div className="home-news-info">
                  <span className="home-news-publisher">
                    Thai PBS
                    {news[activeNews].publishTime
                      ? ` • ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(news[activeNews].publishTime))}`
                      : ''}
                  </span>
                  <h4>{news[activeNews].title}</h4>
                  <span className="home-news-read">อ่านข่าวต้นฉบับ ↗</span>
                </div>
              </a>
              <div className="home-news-controls">
                <button
                  type="button"
                  onClick={() => setActiveNews(index => (index - 1 + news.length) % news.length)}
                  aria-label="ข่าวก่อนหน้า"
                >
                  ‹
                </button>
                <span>{activeNews + 1} / {news.length}</span>
                <button
                  type="button"
                  onClick={() => setActiveNews(index => (index + 1) % news.length)}
                  aria-label="ข่าวถัดไป"
                >
                  ›
                </button>
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