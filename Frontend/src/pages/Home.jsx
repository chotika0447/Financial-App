import './Home.css';
import HomeHeader from '../components/HomeHeader';
import Navbar from '../components/Navbar';

function Home() {
  return (
    <div className="home-page">

      <HomeHeader />
      
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
        <section className="dashboard-section">

          <h3>แดชบอร์ด</h3>

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


          {/* Financial health */}
          <button className="financial-health-button">
            <span>ประเมินสุขภาพการเงินของคุณ</span>

            <span className="arrow">→</span>
          </button>

        </section>

      </main>


      {/* ================= BOTTOM NAV ================= */}
      <Navbar />

    </div>
  );
}

export default Home;