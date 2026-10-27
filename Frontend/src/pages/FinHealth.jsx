
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CircleHelp,
    ShieldCheck,
    X,
} from 'lucide-react';

import './FinHealth.css';
import Navbar from '../components/Navbar';
import CriteriaCard from '../components/CriteriaCard';
import finHealthCriteria from '../data/finHealthCriteria';

function FinHealth() {
    const navigate = useNavigate();
    const [showCriteria, setShowCriteria] = useState(false);

    // TODO: เชื่อมคะแนนจริงจาก Backend ในภายหลัง
    const score = null;

    return (
        <div className="financial-health-page">
            <header className="fh-header">

                <div className="fh-score-heading">
                    <h1>คะแนนสุขภาพการเงินโดยรวมของคุณ</h1>

                    <button
                        type="button"
                        className="fh-criteria-button"
                        onClick={() => setShowCriteria(true)}
                    >
                        <CircleHelp size={16} />
                        <span>เกณฑ์คะแนน</span>
                    </button>
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
                        <p>โปรดเลือกหัวข้อเพื่อดูรายละเอียด</p>
                    </div>
                </div>


                <div className="fh-category-list">
                    {finHealthCriteria.map((item) => (
                        <CriteriaCard
                            key={item.id}
                            item={item}
                            onClick={() =>
                                navigate(`/financial-health/${item.id}`)
                            }
                        />
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
                            {finHealthCriteria.map((item, index) => (
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

export default FinHealth;
