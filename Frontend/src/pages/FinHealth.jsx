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
                                แบ่งออกเป็น 3 ด้านตามการใช้งานแต่ละฟีเจอร์ ดังนี้
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
                                        navigate(`/financial-health/${category.id}`)
                                    }
                                    style={{
                                        '--category-color': category.color,
                                        '--category-bg': category.background,
                                    }}
                                >
                                    <div className="fh-score-card-heading">
                                        <div className="fh-score-icon">
                                            <Icon size={19} />
                                        </div>

                                        <div className="fh-score-card-title">
                                            <strong>{category.title}</strong>
                                        </div>
                                    </div>

                                    <div className="fh-score-number">
                                        <strong>
                                            {score === null ? '—' : score}
                                        </strong>
                                        <span>/ 100</span>
                                    </div>

                                    <div className="fh-score-card-footer">
                                        <span className="fh-score-card-status">
                                            {score === null
                                                ? 'ยังไม่มีข้อมูลประเมิน'
                                                : 'ดูรายละเอียดคะแนน'}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

            </main>

            {/* เกณฑ์การประเมิณคะแนน */}
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
                                                    {category.title} —{' '}
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