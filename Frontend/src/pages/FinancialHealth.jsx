
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
        id: 'spend',
        title: 'สุขภาพการใช้จ่าย',
        name: 'การใช้จ่าย (Spend)',
        weight: 25,
        description:
            'ประเมินสัดส่วนค่าใช้จ่ายเทียบกับรายได้ และความสามารถในการชำระบิลตรงเวลา',
        indicators: [
            'ตัวชี้วัดที่ 1: สัดส่วนค่าใช้จ่ายต่อรายได้',
            'ตัวชี้วัดที่ 2: ความสามารถในการชำระบิลตรงเวลา',
        ],
        formula:
            'คะแนนด้านการใช้จ่าย = (S1 + S2) ÷ 2',
        target:
            'สัดส่วนค่าใช้จ่ายยิ่งเหมาะสม และชำระบิลตรงเวลาได้สม่ำเสมอ ยิ่งได้คะแนนสูง',
        Icon: ChartNoAxesCombined,
        color: '#3978d4',
        background: '#eaf1ff',
    },
    {
        id: 'save',
        title: 'สุขภาพการออม',
        name: 'การออม (Save)',
        weight: 25,
        description:
            'ประเมินเงินสำรองที่พร้อมใช้และความคืบหน้าของการออมตามเป้าหมาย',
        indicators: [
            'ตัวชี้วัดที่ 3: เงินสำรองสภาพคล่อง',
            'ตัวชี้วัดที่ 4: ความคืบหน้าตามเป้าหมายการออม',
        ],
        formula:
            'คะแนนด้านการออม = (S3 + S4) ÷ 2',
        target:
            'พิจารณาเงินสำรองที่พร้อมใช้จริง และความคืบหน้าของเงินออมเทียบกับแผน',
        Icon: Wallet,
        color: '#159b76',
        background: '#e7f7f0',
    },
    {
        id: 'borrow',
        title: 'สุขภาพการกู้ยืม',
        name: 'การกู้ยืม (Borrow)',
        weight: 25,
        description:
            'ประเมินภาระหนี้เทียบกับรายได้และประวัติการชำระหนี้',
        indicators: [
            'ตัวชี้วัดที่ 5: สัดส่วนภาระหนี้ต่อรายได้',
            'ตัวชี้วัดที่ 6: ประวัติการชำระหนี้',
        ],
        formula:
            'คะแนนด้านการกู้ยืม = (S5 + S6) ÷ 2',
        target:
            'ภาระหนี้ที่เหมาะสมและประวัติการชำระหนี้ที่ดีช่วยสะท้อนความสามารถในการจัดการหนี้',
        Icon: HandCoins,
        color: '#dc7650',
        background: '#fff0e9',
    },
    {
        id: 'plan',
        title: 'การวางแผนและการคุ้มครอง',
        name: 'การวางแผนและการคุ้มครอง (Plan & Protect)',
        weight: 25,
        description:
            'ประเมินความเพียงพอของประกันและการวางแผนทางการเงินล่วงหน้า',
        indicators: [
            'ตัวชี้วัดที่ 7: ความเพียงพอของประกัน',
            'ตัวชี้วัดที่ 8: การวางแผนการเงินล่วงหน้า',
        ],
        formula:
            'คะแนนด้านการวางแผนและการคุ้มครอง = (S7 + S8) ÷ 2',
        target:
            'พิจารณาความพร้อมในการรับมือเหตุฉุกเฉินและการวางแผนการเงินในอนาคต',
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
                    <h1>คะแนนสุขภาพการเงินของคุณ</h1>
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
                        <h2>สุขภาพการเงิน 4 ด้าน โดยคำนวณจาก 8 ตัวชี้วัด</h2>
                        <p>โปรดเลือกหัวข้อเพื่อดูรายละเอียด</p>
                    </div>
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
                            ทั้ง 4 ด้าน 8 ตัวชี้วัด ดังนี้
                        </p>

                        <div className="fh-criteria-list">
                            {criteria.map((item, index) => (
                                <article className="fh-criterion" key={item.id}>
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

                                    <ul className="fh-indicator-list">
                                        {item.indicators.map((indicator) => (
                                            <li key={indicator}>{indicator}</li>
                                        ))}
                                    </ul>

                                    <div className="fh-formula">
                                        <span>สูตรคะแนนของด้านนี้</span>
                                        <p>{item.formula}</p>
                                    </div>

                                    <div className="fh-target">
                                        {item.target}
                                    </div>

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
