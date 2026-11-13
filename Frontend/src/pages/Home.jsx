import './Home.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeHeader from '../components/HomeHeader';
import Navbar from '../components/Navbar';
import DashboardSummary from '../components/DashboardSummary';

function Home() {
  const [user, setUser] = useState(null);
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

  return (
    <div className="home-page">

      <HomeHeader user={user} />

      {/* ================= MAIN ================= */}
      <main className="home-content">

        {/* Summary Cards */}
        <section className="summary-grid">

          <div className="summary-card income-card">
            <div className="card-title">รายรับ</div>

            <div className="card-bottom">
              <span>รวมทั้งหมด</span>
              <strong>6,800 ฿</strong>
            </div>
          </div>

          <div className="summary-card expense-card">
            <div className="card-title">รายจ่าย</div>

            <div className="card-bottom">
              <span>รวมทั้งหมด</span>
              <strong>6,800 ฿</strong>
            </div>
          </div>

          <div className="summary-card debt-card">
            <div className="card-title">หนี้สิน</div>

            <div className="card-bottom">
              <span>รวมทั้งหมด</span>
              <strong>2,000 ฿</strong>
            </div>
          </div>

          <div className="summary-card receivable-card">
            <div className="card-title">กระเป๋าออม</div>

            <div className="card-bottom">
              <span>รวมทั้งหมด</span>
              <strong>2,000 ฿</strong>
            </div>
          </div>

        </section>


        {/* ================= NEWS ================= */}
        <section className="news-section">

          <h3>ข่าวสารเกี่ยวกับการเงิน</h3>

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


          {/* Financial health */}
          <button
            className="financial-health-button"
            onClick={() => navigate('/financial-health')}
          >
            <span>ประเมินสุขภาพการเงินของคุณ</span>
            <span className="arrow">→</span>
          </button>

        

      </main>


      {/* ================= BOTTOM NAV ================= */}
      <Navbar />

    </div>
  );
}

export default Home;