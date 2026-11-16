import './Home.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeHeader from '../components/HomeHeader';
import Navbar from '../components/Navbar';
import DashboardSummary from '../components/DashboardSummary';

const initialSummary = { income: null, expense: null, debt: null, saving: null };

const money = (value) => value === null
  ? '—'
  : `${Number(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿`;

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  throw new Error('API ไม่ได้ส่งรายการข้อมูลกลับมาในรูปแบบที่รองรับ');
}

const total = (items, key) => items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);

function Home() {
  const [user, setUser] = useState(null);
  const [news, setNews] = useState([]);
  const [newsState, setNewsState] = useState('loading');
  const [activeNews, setActiveNews] = useState(0);
  const [summary, setSummary] = useState(initialSummary);
  const [summaryState, setSummaryState] = useState('loading');
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) return;
    let cancelled = false;
    fetch('/users/me/', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'โหลดข้อมูลผู้ใช้ไม่สำเร็จ');
        if (!cancelled) setUser(data);
      })
      .catch(error => { if (!cancelled) console.error(error.message); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setSummaryState('error');
      return () => controller.abort();
    }

    const fetchList = async (path) => {
      const response = await fetch(path, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
      const payload = await response.json();
      // หาก API ใช้ pagination ให้รวมข้อมูลทุกหน้าในฝั่ง backend หรือปรับฟังก์ชันนี้
      return asList(payload);
    };

    async function loadSummary() {
      try {
        setSummaryState('loading');
        const [transactions, debts, savings] = await Promise.all([
          fetchList('/transactions/'),
          fetchList('/debts/'),
          fetchList('/savings/'),
        ]);
        const income = total(transactions.filter(item => item.transaction_type === 'income'), 'amount');
        const expense = total(transactions.filter(item => item.transaction_type === 'expense'), 'amount');
        // ตรวจสอบชื่อฟิลด์ประเภทหนี้ใน serializer ของโปรเจกต์ก่อนใช้งานจริง
        const borrowed = debts.filter(item => item.type === 'borrow');
        const debt = total(borrowed, 'remaining_amount');
        const saving = total(savings, 'balance');
        if (!controller.signal.aborted) {
          setSummary({ income, expense, debt, saving });
          setSummaryState('ready');
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Home summary fetch failed:', error);
          setSummary(initialSummary);
          setSummaryState('error');
        }
      }
    }
    loadSummary();
    return () => controller.abort();
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

  const summaryCards = [
    { title: 'รายรับ', key: 'income', className: 'income-card', path: '/transactions/', aria: 'ดูรายการรายรับ' },
    { title: 'รายจ่าย', key: 'expense', className: 'expense-card', path: '/transactions/', aria: 'ดูรายการรายจ่าย' },
    { title: 'หนี้สิน', key: 'debt', className: 'debt-card', path: '/debts/', aria: 'ดูรายการหนี้สิน' },
    { title: 'กระเป๋าออม', key: 'saving', className: 'receivable-card', path: '/saving/', aria: 'ดูกระเป๋าเงินออม' },
  ];

  return (
    <div className="home-page">
      <HomeHeader user={user} />
      <main className="home-content">
        <section className="summary-grid" aria-busy={summaryState === 'loading'}>
          {summaryCards.map(card => (
            <div
              key={card.key}
              className={`summary-card ${card.className}`}
              role="button"
              tabIndex={0}
              onClick={() => navigate(card.path)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(card.path);
                }
              }}
              aria-label={card.aria}
            >
              <div className="card-title">{card.title}</div>
              <div className="card-bottom">
                <span>รวมทั้งหมด</span>
                <strong>{summaryState === 'loading' ? 'กำลังโหลด...' : money(summary[card.key])}</strong>
              </div>
            </div>
          ))}
        </section>
        {summaryState === 'error' && (
          <p role="alert" style={{ margin: '8px 0 16px', color: '#b45309', fontSize: '0.9rem' }}>
            ไม่สามารถโหลดข้อมูลสรุปได้ กรุณาตรวจสอบการเชื่อมต่อ API
          </p>
        )}

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
                >‹</button>
                <span>{activeNews + 1} / {news.length}</span>
                <button
                  type="button"
                  onClick={() => setActiveNews(index => (index + 1) % news.length)}
                  aria-label="ข่าวถัดไป"
                >›</button>
              </div>
            </>
          )}
        </section>

        <div
          className="dashboard-summary-click"
          onClick={event => {
            if (event.target.closest('button')) return;
            navigate('/dashboard');
          }}
          role="button"
          tabIndex={0}
          onKeyDown={event => {
            if (event.target.closest('button')) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate('/dashboard');
            }
          }}
        >
          <DashboardSummary compact />
        </div>
      </main>
      <Navbar />
    </div>
  );
}

export default Home;
