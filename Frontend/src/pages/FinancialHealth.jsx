
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    },
    {
        id: 'expense',
        title: 'สุขภาพการใช้จ่าย',
        name: 'สัดส่วนค่าใช้จ่าย (Expense Ratio)',
        weight: 30,
        description: 'วัดสัดส่วนค่าใช้จ่ายทั้งหมดเมื่อเทียบกับรายได้',
        formula: 'ค่าใช้จ่าย ÷ รายได้ × 100',
        target: 'ควรจัดสรรเงินตามหลัก 50/30/20',
    },
    {
        id: 'debt',
        title: 'สุขภาพหนี้สิน',
        name: 'ภาระหนี้ต่อรายได้ (Debt-to-Income Ratio)',
        weight: 25,
        description: 'วัดภาระผ่อนชำระหนี้เทียบกับรายได้ต่อเดือน',
        formula: 'ภาระผ่อนหนี้ต่อเดือน ÷ รายได้ต่อเดือน × 100',
        target: 'ภาระหนี้ยิ่งต่ำ ยิ่งมีความคล่องตัวทางการเงิน',
    },
    {
        id: 'liquidity',
        title: 'สุขภาพเงินสภาพคล่อง',
        name: 'อัตราส่วนสภาพคล่องพื้นฐาน (Liquidity Ratio)',
        weight: 15,
        description: 'วัดความสามารถในการใช้สินทรัพย์สภาพคล่องรองรับค่าใช้จ่าย',
        formula: 'สินทรัพย์สภาพคล่อง ÷ ค่าใช้จ่ายรายเดือน',
        target: 'ควรมีเงินสำรองฉุกเฉินประมาณ 3–6 เดือนของค่าใช้จ่าย',
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
                <button
                    className="fh-back-button"
                    onClick={() => navigate(-1)}
                    aria-label="ย้อนกลับ"
                >
                    ‹
                </button>

                <button
                    className="fh-criteria-button"
                    onClick={() => setShowCriteria(true)}
                >
                    <span className="fh-help-icon">?</span>
                    เกณฑ์การให้คะแนน
                </button>

                <h1>ประเมินสุขภาพ<br />การเงิน</h1>

                <div className="fh-score-area">
                    <p className="fh-score-heading">สุขภาพการเงินโดยรวมของคุณ</p>

                    <div className="fh-score-card">
                        <strong>{score === null ? '—' : score}</strong>
                        <span>คะแนน</span>

                        <div className="fh-score-faces">
                            <span>🙂</span>
                            <span>🙁</span>
                        </div>
                    </div>

                    <p className="fh-score-note">
                        *ข้อมูลขณะนี้ไม่เพียงพอต่อการประเมิน
                    </p>

                    <p className="fh-score-level">
                        อยู่ในระดับ “{score === null ? 'รอประเมิน' : 'กำลังประเมิน'}”
                    </p>
                </div>
            </header>

            <main className="fh-main">
                <h2>เจาะลึกในแต่ละด้าน</h2>

                <div className="fh-category-list">
                    {criteria.map((item) => (
                        <button
                            key={item.id}
                            className="fh-category-card"
                            onClick={() => navigate(`/financial-health/${item.id}`)}
                        >
                            <span>{item.title}</span>
                            <span className="fh-category-arrow">›</span>
                        </button>
                    ))}
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
                        <button
                            className="fh-modal-close"
                            onClick={() => setShowCriteria(false)}
                            aria-label="ปิดหน้าต่าง"
                        >
                            ×
                        </button>

                        <h2 id="fh-modal-title">เกณฑ์การให้คะแนน</h2>

                        <p className="fh-modal-intro">
                            การคำนวณคะแนนสุขภาพทางการเงิน (คะแนนเต็ม 100%)
                            โดยอ้างอิงตัวชี้วัดทั้ง 4 ข้อ ได้แก่
                        </p>

                        {criteria.map((item, index) => (
                            <article className="fh-criterion" key={item.id}>
                                <h3>
                                    {index + 1}. {item.name}
                                    {' '}
                                    <span>(น้ำหนัก {item.weight}%)</span>
                                </h3>

                                <p>{item.description}</p>
                                <ul>
                                    <li>สูตรคำนวณ: {item.formula}</li>
                                    <li>{item.target}</li>
                                </ul>
                            </article>
                        ))}
                    </section>
                </div>
            )}

            <Navbar />
        </div>
    );
}

export default FinancialHealth;
