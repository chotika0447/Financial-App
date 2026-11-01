import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CircleHelp,
    Wallet,
    PiggyBank,
    CreditCard,
    ChevronRight,
    TrendingUp,
    CalendarDays,
    FileText,
    X,
} from 'lucide-react';

import './FinHealth.css';
import finHealthCriteria from '../data/finHealthCriteria';
import Navbar from '../components/Navbar';


function FinHealth() {
    const navigate = useNavigate();
    const [showCriteria, setShowCriteria] = useState(false);

    // TODO: เชื่อมคะแนนปัจจุบันจาก Backend ในภายหลัง
    const scores = {
        spend: null,
        save: null,
        borrow: null,
    };

    // TODO: เชื่อมวันที่อัปเดตคะแนนจาก Backend
    const lastUpdated = null;

    // TODO: เชื่อมข้อมูลแนวโน้มคะแนนรายเดือนจาก Backend
    const scoreHistory = [];

    // TODO: เชื่อมประวัติรายงานรายเดือนจาก Backend
    const monthlyReports = [];

    return (
        <div className="financial-health-page">
            <header className="fh-header">
                <div className="fh-header-top">
                    <div>
                        <span className="fh-eyebrow">
                            FINANCIAL WELLNESS
                        </span>

                        <h1>สุขภาพการเงินของคุณ</h1>

                        <p>
                            ติดตามพฤติกรรมทางการเงินและพัฒนาสุขภาพการเงินของคุณ
                        </p>
                    </div>

                    <button
                        type="button"
                        className="fh-criteria-button"
                        onClick={() => setShowCriteria(true)}
                    >
                        <CircleHelp size={17} />
                        <span>เกณฑ์คะแนน</span>
                    </button>
                </div>

                <div className="fh-update-info">
                    <span className="fh-update-dot" />
                    <span>
                        อัปเดตล่าสุด:{' '}
                        {lastUpdated || 'ยังไม่มีข้อมูลการประเมิน'}
                    </span>
                </div>
            </header>

            <main className="fh-main">
                {/* CURRENT SCORES */}
                <section className="fh-section">
                    <div className="fh-section-heading">
                        <div>
                            <h2>คะแนนสุขภาพการเงิน</h2>
                            <p>
                                คะแนนแต่ละด้านประเมินแยกจากกัน คะแนนเต็มด้านละ 100
                            </p>
                        </div>
                    </div>

                    <div className="fh-score-grid">
                        {finHealthCriteria.map((category) => {
                            const Icon = category.Icon;
                            const score = scores[category.id];

                            return (
                                <button
                                    type="button"
                                    className="fh-score-card"
                                    key={category.id}
                                    onClick={() =>
                                        navigate(
                                            `/financial-health/${category.id}`
                                        )
                                    }
                                    style={{
                                        '--category-color': category.color,
                                        '--category-bg': category.background,
                                    }}
                                >
                                    <div className="fh-score-card-top">
                                        <div className="fh-score-icon">
                                            <Icon size={22} />
                                        </div>

                                        <ChevronRight
                                            className="fh-score-arrow"
                                            size={19}
                                        />
                                    </div>

                                    <div className="fh-score-card-title">
                                        <strong>{category.name}</strong>
                                        <span>{category.subtitle}</span>
                                    </div>

                                    <div className="fh-score-number">
                                        <strong>
                                            {score === null ? '—' : score}
                                        </strong>
                                        <span>/ 100</span>
                                    </div>

                                    <p>{category.description}</p>

                                    <div className="fh-score-progress">
                                        <div
                                            className="fh-score-progress-fill"
                                            style={{
                                                width:
                                                    score === null
                                                        ? '0%'
                                                        : `${score}%`,
                                            }}
                                        />
                                    </div>

                                    <span className="fh-score-card-status">
                                        {score === null
                                            ? 'ยังไม่มีข้อมูลประเมิน'
                                            : 'ดูรายละเอียดคะแนน'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* SCORE TREND */}
                <section className="fh-section">
                    <div className="fh-section-heading">
                        <div>
                            <h2>แนวโน้มสุขภาพการเงิน</h2>
                            <p>
                                ติดตามการเปลี่ยนแปลงคะแนนของแต่ละด้านในแต่ละเดือน
                            </p>
                        </div>
                    </div>

                    <div className="fh-panel fh-trend-panel">
                        <div className="fh-panel-title">
                            <div className="fh-panel-icon">
                                <TrendingUp size={19} />
                            </div>

                            <div>
                                <h3>คะแนนย้อนหลัง</h3>
                                <span>แสดงคะแนนแยกตามด้าน</span>
                            </div>
                        </div>

                        {scoreHistory.length === 0 ? (
                            <div className="fh-empty-state fh-chart-empty">
                                <div className="fh-empty-icon">
                                    <TrendingUp size={25} />
                                </div>

                                <strong>ยังไม่มีข้อมูลแนวโน้มคะแนน</strong>

                                <p>
                                    เมื่อมีการประเมินสุขภาพการเงินในแต่ละเดือน
                                    ระบบจะแสดงกราฟเปรียบเทียบคะแนนที่นี่
                                </p>
                            </div>
                        ) : (
                            <div className="fh-chart-placeholder">
                                {/* TODO: นำข้อมูล scoreHistory มาแสดงเป็น Line Chart */}
                            </div>
                        )}

                        <div className="fh-chart-legend">
                            {finHealthCriteria.map((category) => (
                                <div key={category.id}>
                                    <span
                                        style={{
                                            background: category.color,
                                        }}
                                    />
                                    {category.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* MONTHLY REPORTS */}
                <section className="fh-section">
                    <div className="fh-section-heading fh-report-heading">
                        <div>
                            <h2>รายงานสุขภาพการเงินรายเดือน</h2>
                            <p>
                                ดูผลการประเมินและเปรียบเทียบข้อมูลย้อนหลัง
                            </p>
                        </div>
                    </div>

                    <div className="fh-panel fh-report-panel">
                        <div className="fh-panel-title">
                            <div className="fh-panel-icon">
                                <CalendarDays size={19} />
                            </div>

                            <div>
                                <h3>ประวัติรายงาน</h3>
                                <span>Monthly Reports</span>
                            </div>
                        </div>

                        {monthlyReports.length === 0 ? (
                            <div className="fh-empty-state fh-report-empty">
                                <div className="fh-empty-icon">
                                    <FileText size={25} />
                                </div>

                                <strong>ยังไม่มีรายงานรายเดือน</strong>

                                <p>
                                    เมื่อระบบสร้างรายงานประจำเดือนแล้ว
                                    คุณจะสามารถเปิดดูคะแนนและรายละเอียดของแต่ละเดือนได้ที่นี่
                                </p>
                            </div>
                        ) : (
                            <div className="fh-report-list">
                                {monthlyReports.map((report) => (
                                    <button
                                        type="button"
                                        className="fh-report-item"
                                        key={report.id}
                                        onClick={() =>
                                            navigate(
                                                `/financial-health/reports/${report.id}`
                                            )
                                        }
                                    >
                                        <div className="fh-report-icon">
                                            <FileText size={19} />
                                        </div>

                                        <div className="fh-report-info">
                                            <strong>{report.month}</strong>
                                            <span>
                                                {report.createdAt ||
                                                    'รายงานสุขภาพการเงิน'}
                                            </span>
                                        </div>

                                        <ChevronRight
                                            size={19}
                                            className="fh-report-arrow"
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* SCORING CRITERIA MODAL */}
            {showCriteria && (
                <div
                    className="fh-modal-overlay"
                    onClick={() => setShowCriteria(false)}
                >
                    <section
                        className="fh-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="fh-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="fh-modal-header">
                            <div>
                                <span className="fh-modal-eyebrow">
                                    SCORING GUIDE
                                </span>

                                <h2 id="fh-modal-title">
                                    เกณฑ์การประเมินคะแนน
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="fh-modal-close"
                                onClick={() => setShowCriteria(false)}
                                aria-label="ปิดหน้าต่าง"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <div className="fh-modal-content">
                            <p className="fh-modal-intro">
                                ระบบประเมินสุขภาพการเงินแยกออกเป็น 3 ด้าน
                                แต่ละด้านมีคะแนนเต็ม 100 คะแนน
                            </p>

                            <div className="fh-modal-category-list">
                                {finHealthCriteria.map((category) => {
                                    const Icon = category.Icon;

                                    return (
                                        <div
                                            className="fh-modal-category"
                                            key={category.id}
                                            style={{
                                                '--category-color':
                                                    category.color,
                                                '--category-bg':
                                                    category.background,
                                            }}
                                        >
                                            <div className="fh-modal-category-icon">
                                                <Icon size={20} />
                                            </div>

                                            <div>
                                                <strong>
                                                    {category.name} —{' '}
                                                    {category.subtitle}
                                                </strong>

                                                <p>
                                                    {category.description}
                                                </p>

                                                <span>
                                                    คะแนนเต็ม 100 คะแนน
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="fh-modal-note">
                                <CircleHelp size={17} />
                                <p>
                                    รายละเอียดสูตรคำนวณและเกณฑ์คะแนนของแต่ละตัวชี้วัด
                                    จะแสดงในหน้ารายละเอียดของแต่ละด้าน
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="fh-modal-done"
                            onClick={() => setShowCriteria(false)}
                        >
                            เข้าใจแล้ว
                        </button>
                    </section>
                </div>
            )}

            <Navbar />
        </div>
    );
}

export default FinHealth;