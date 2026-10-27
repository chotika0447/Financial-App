
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    ChevronRight,
    CircleHelp,
    Wallet,
    ChartNoAxesCombined,
    HandCoins,
    ShieldCheck,
    X,
} from 'lucide-react';

import './FinancialHealth.css';
import Navbar from '../components/Navbar';

const criteria = [
    {
        id: 'saving',
        title: 'สุขภาพการออม',
        name: 'อัตราการออม (Saving rate)',
        weight: 30,
        description: 'วัดว่าคุณเก็บออมเงินได้มากน้อยเพียงใดเมื่อเทียบกับรายได้',
        formula: 'เงินออม ÷ รายได้ × 100',
        target: 'ควรออมอย่างน้อย 10–20% ของรายได้',
        Icon: Wallet,
        color: '#159b76',
        background: '#e7f7f0',
    },
    {
        id: 'expense',
        title: 'สุขภาพการใช้จ่าย',
        name: 'สัดส่วนค่าใช้จ่าย (Expense Ratio)',
        weight: 30,
        description: 'วัดสัดส่วนค่าใช้จ่ายทั้งหมดเมื่อเทียบกับรายได้',
        formula: 'ค่าใช้จ่าย ÷ รายได้ × 100',
        target: 'ควรจัดสรรเงินตามหลัก 50/30/20',
        Icon: ChartNoAxesCombined,
        color: '#3978d4',
        background: '#eaf1ff',
    },
    {
        id: 'debt',
        title: 'สุขภาพหนี้สิน',
        name: 'ภาระหนี้ต่อรายได้ (Debt-to-Income Ratio)',
        weight: 25,
        description: 'วัดภาระผ่อนชำระหนี้เทียบกับรายได้ต่อเดือน',
        formula: 'ภาระผ่อนหนี้ต่อเดือน ÷ รายได้ต่อเดือน × 100',
        target: 'ภาระหนี้ยิ่งต่ำ ยิ่งมีความคล่องตัวทางการเงิน',
        Icon: HandCoins,
        color: '#dc7650',
        background: '#fff0e9',
    },
    {
        id: 'liquidity',
        title: 'สุขภาพเงินสภาพคล่อง',
        name: 'อัตราส่วนสภาพคล่องพื้นฐาน (Liquidity Ratio)',
        weight: 15,
        description: 'วัดความสามารถในการใช้สินทรัพย์สภาพคล่องรองรับค่าใช้จ่าย',
        formula: 'สินทรัพย์สภาพคล่อง ÷ ค่าใช้จ่ายรายเดือน',
        target: 'ควรมีเงินสำรองฉุกเฉินประมาณ 3–6 เดือนของค่าใช้จ่าย',
        Icon: ShieldCheck,
        color: '#8a60c9',
        background: '#f1eaff',
    },
];

function FinancialHealth() {
    const navigate = useNavigate();
    const [showCriteria, setShowCriteria] = useState(false);

    // TODO: เชื่อมคะแนนจริงจาก Backend ในภายหลัง
    const score = null;

    return (
        <div className="financial-health-page">
            <header className="fh-header">
                <div className="fh-topbar">
                    <button
                        type="button"
                        className="fh-back-button"
                        onClick={() => navigate(-1)}
                        aria-label="ย้อนกลับ"
                    >
                        <ArrowLeft size={21} />
                    </button>

                    <span className="fh-topbar-title">
                        สุขภาพการเงิน
                    </span>

                    <button
                        type="button"
                        className="fh-criteria-button"
                        onClick={() => setShowCriteria(true)}
                    >
                        <CircleHelp size={17} />
                        <span>เกณฑ์คะแนน</span>
                    </button>
                </div>

                <div className="fh-intro">
                    <span className="fh-eyebrow">
                        FINANCIAL WELLNESS
                    </span>

                    <h1>ดูแลสุขภาพการเงิน<br />ของคุณ</h1>

                    <p>
                        สำรวจสถานะทางการเงินของคุณ
                        เพื่อวางแผนอนาคตได้อย่างมั่นใจ
                    </p>
                </div>

                <section className="fh-score-card">
                    <div className="fh-score-info">
                        <span className="fh-score-label">
                            คะแนนสุขภาพการเงิน
                        </span>

                        <div className="fh-score-value">
                            <strong>
                                {score === null ? '—' : score}
                            </strong>
                            <span>/ 100</span>
                        </div>

                        <span className="fh-score-status">
                            {score === null
                                ? 'ยังไม่มีข้อมูลประเมิน'
                                : 'คะแนนสุขภาพการเงินของคุณ'}
                        </span>
                    </div>

                    <div className="fh-score-illustration" aria-hidden="true">
                        <div className="fh-score-ring">
                            <ShieldCheck size={35} strokeWidth={1.7} />
                        </div>
                    </div>
                </section>

                <p className="fh-score-note">
                    คะแนนจะแสดงเมื่อระบบมีข้อมูลเพียงพอสำหรับการประเมิน
                </p>
            </header>

            <main className="fh-main">
                <div className="fh-section-heading">
                    <div>
                        <h2>สุขภาพการเงิน 4 ด้าน</h2>
                        <p>เลือกหัวข้อเพื่อดูรายละเอียด</p>
                    </div>

                    <span className="fh-total-count">4 ด้าน</span>
                </div>

                <div className="fh-category-list">
                    {criteria.map((item) => {
                        const Icon = item.Icon;

                        return (
                            <button
                                type="button"
                                key={item.id}
                                className="fh-category-card"
                                onClick={() =>
                                    navigate(`/financial-health/${item.id}`)
                                }
                            >
                                <span
                                    className="fh-category-icon"
                                    style={{
                                        '--category-color': item.color,
                                        '--category-bg': item.background,
                                    }}
                                >
                                    <Icon size={23} strokeWidth={1.8} />
                                </span>

                                <span className="fh-category-content">
                                    <span className="fh-category-title">
                                        {item.title}
                                    </span>

                                    <span className="fh-category-description">
                                        {item.description}
                                    </span>

                                    <span className="fh-category-weight">
                                        น้ำหนักคะแนน {item.weight}%
                                    </span>
                                </span>

                                <ChevronRight
                                    className="fh-category-arrow"
                                    size={21}
                                />
                            </button>
                        );
                    })}
                </div>

                <div className="fh-tip">
                    <span className="fh-tip-icon">
                        <CircleHelp size={19} />
                    </span>

                    <p>
                        <strong>รู้จักการเงินของตัวเอง</strong>
                        <span>
                            การติดตามรายรับ รายจ่าย เงินออม และภาระหนี้
                            จะช่วยให้คุณวางแผนการเงินได้ดียิ่งขึ้น
                        </span>
                    </p>
                </div>
            </main>

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
                                    เกณฑ์การให้คะแนน
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

                        <p className="fh-modal-intro">
                            คะแนนเต็ม 100 คะแนน แบ่งน้ำหนักตามตัวชี้วัด
                            ทั้ง 4 ด้าน ดังนี้
                        </p>

                        <div className="fh-criteria-list">
                            {criteria.map((item, index) => (
                                <article
                                    className="fh-criterion"
                                    key={item.id}
                                >
                                    <div className="fh-criterion-heading">
                                        <span className="fh-criterion-number">
                                            {index + 1}
                                        </span>

                                        <div>
                                            <h3>{item.name}</h3>
                                            <span>
                                                น้ำหนัก {item.weight}%
                                            </span>
                                        </div>
                                    </div>

                                    <p>{item.description}</p>

                                    <div className="fh-formula">
                                        <span>สูตรคำนวณ</span>
                                        <p>{item.formula}</p>
                                    </div>

                                    <div className="fh-target">
                                        {item.target}
                                    </div>
                                </article>
                            ))}
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

export default FinancialHealth;
