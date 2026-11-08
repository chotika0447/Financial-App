import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CircleHelp,
    X,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

import { authenticatedFetch as fetch } from '../utils/auth';
import './FinHealth.css';
import finHealthCriteria from '../data/finHealthCriteria';
import Navbar from '../components/Navbar';

function isAvailable(value) {
    return (
        value !== null &&
        value !== undefined &&
        Number.isFinite(Number(value))
    );
}

// ใช้สูตรเดียวกับ FinHealthDetail.jsx
function calculateEirScore(eir) {
    if (!isAvailable(eir)) return null;

    const score = 100 - (1.25 * (Number(eir) - 60));

    return Math.round(
        Math.max(0, Math.min(100, score)) * 100
    ) / 100;
}

function calculateSrScore(sr) {
    if (!isAvailable(sr)) return null;

    return Math.round(
        Math.max(0, Math.min(100, Number(sr) * 5)) * 100
    ) / 100;
}

function calculateDsrScore(dsr) {
    if (!isAvailable(dsr)) return null;

    const value = Number(dsr);
    let score;

    if (value <= 15) score = 100;
    else if (value <= 30) score = 100 - 2 * (value - 15);
    else if (value <= 35) score = 70 - 2 * (value - 30);
    else if (value <= 40) score = 60 - 4 * (value - 35);
    else if (value <= 45) score = 40 - 4 * (value - 40);
    else score = 0;

    return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100;
}

function calculateOdpScore(odp) {
    if (!isAvailable(odp)) return null;

    const value = Number(odp);

    if (value >= 100) return 100;
    if (value >= 95) return 90;
    if (value >= 90) return 80;
    if (value >= 85) return 70;
    if (value >= 80) return 60;
    if (value >= 70) return 50;
    if (value >= 60) return 40;
    if (value >= 50) return 30;
    if (value > 0) return 15;
    return 0;
}

function averageScores(first, second) {
    if (first == null || second == null) return null;

    return Math.round(((first + second) / 2) * 100) / 100;
}

function FinHealth() {
    const navigate = useNavigate();
    // const [showCriteria, setShowCriteria] = useState(false);

    const [spendMetrics, setSpendMetrics] = useState(null);
    const [saveMetrics, setSaveMetrics] = useState(null);
    const [borrowMetrics, setBorrowMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();
        const accessToken = sessionStorage.getItem('accessToken');

        if (!accessToken) {
            setLoading(false);
            return () => controller.abort();
        }

        async function loadMetric(url) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    signal: controller.signal,
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.detail ||
                        data.error ||
                        'ไม่สามารถโหลดข้อมูลตัวชี้วัดได้'
                    );
                }

                return data;
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error(`โหลดข้อมูล ${url} ไม่สำเร็จ:`, error);
                }
                return null;
            }
        }

        async function loadAllMetrics() {
            setLoading(true);

            const [spend, save, borrow] = await Promise.all([
                loadMetric('/transactions/financial-health/spend/'),
                loadMetric('/savings/financial-health/wallet/'),
                loadMetric('/debts/financial-health/borrow/'),
            ]);

            if (!controller.signal.aborted) {
                setSpendMetrics(spend);
                setSaveMetrics(save);
                setBorrowMetrics(borrow);
                setLoading(false);
            }
        }

        loadAllMetrics();

        return () => controller.abort();
    }, []);

    // Spend: EIR + TRC
    const eirScore = calculateEirScore(spendMetrics?.expense_ratio);
    const trcScore = isAvailable(spendMetrics?.trc_score)
        ? Number(spendMetrics.trc_score)
        : null;
    const spendTotalScore = averageScores(eirScore, trcScore);

    // Save: SR + SC
    const srScore = calculateSrScore(saveMetrics?.saving_rate);
    const scFrequency = saveMetrics?.sc_recording_frequency;
    const scDistribution = saveMetrics?.sc_recording_distribution;

    const scScore =
        isAvailable(scFrequency) && isAvailable(scDistribution)
            ? Math.round(
                ((Number(scFrequency) + Number(scDistribution)) / 2) * 100
            ) / 100
            : null;

    const saveTotalScore = averageScores(srScore, scScore);

    // Borrow: DSR + ODP
    const dsrScore = calculateDsrScore(borrowMetrics?.dsr_percentage);
    const odpScore = calculateOdpScore(borrowMetrics?.odp_percentage);
    const borrowTotalScore = averageScores(dsrScore, odpScore);

    const scores = {
        spend: spendTotalScore,
        save: saveTotalScore,
        borrow: borrowTotalScore,
    };

    // สถานะข้อมูลของแต่ละตัวชี้วัด ใช้เกณฑ์เดียวกับการคำนวณคะแนนในหน้ารายละเอียด
    const indicatorStatus = {
        spend: [
            {
                name: 'อัตราส่วนค่าใช้จ่ายต่อรายได้ (EIR)',
                available: eirScore !== null,
            },
            {
                name: 'ความสม่ำเสมอในการบันทึกรายรับ–รายจ่าย (TRC)',
                available: trcScore !== null,
            },
        ],
        save: [
            {
                name: 'อัตราการออม (SR)',
                available: srScore !== null,
            },
            {
                name: 'ความสม่ำเสมอในการออม (SC)',
                available: scScore !== null,
            },
        ],
        borrow: [
            {
                name: 'อัตราส่วนภาระหนี้ต่อรายได้ (DSR)',
                available: dsrScore !== null,
            },
            {
                name: 'อัตราการชำระหนี้ตรงเวลา (ODP)',
                available: odpScore !== null,
            },
        ],
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
                        <h1>คะแนนสุขภาพการเงิน</h1>
                        <p>
                            ติดตามพฤติกรรมทางการเงินและพัฒนาสุขภาพการเงินของคุณ
                        </p>
                    </div>

                    {/* <button
                        type="button"
                        className="fh-criteria-button"
                        onClick={() => setShowCriteria(true)}
                    >
                        <CircleHelp size={17} />
                        <span>เกณฑ์คะแนน</span>
                    </button> */}
                </div>
            </header>

            <main className="fh-main">
                {/* CURRENT SCORES */}
                <section className="fh-section">
                    <div className="fh-section-heading">
                        <p>แบ่งออกเป็น 3 ด้านตามการใช้งานแต่ละฟีเจอร์ ดังนี้</p>
                    </div>

                    <div className="fh-score-grid">
                        {finHealthCriteria.map((category) => {
                            const Icon = category.Icon;
                            const score = scores[category.id];
                            const indicators = indicatorStatus[category.id] || [];

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
                                            {loading
                                                ? '...'
                                                : score === null
                                                    ? '-'
                                                    : score}
                                        </strong>
                                        <span>/ 100</span>
                                    </div>

                                    <div
                                        className="fh-indicator-checklist"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            marginTop: '14px',
                                            paddingTop: '12px',
                                            borderTop: '1px solid #edf1ee',
                                        }}
                                    >
                                        {loading ? (
                                            <span
                                                style={{
                                                    color: '#87948d',
                                                    fontSize: '11px',
                                                }}
                                            >
                                                กำลังตรวจสอบข้อมูลตัวชี้วัด...
                                            </span>
                                        ) : (
                                            indicators.map((item) => (
                                                <span
                                                    key={item.name}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '7px',
                                                        color: item.available
                                                            ? '#25845f'
                                                            : '#87918b',
                                                        fontSize: '11px',
                                                        lineHeight: 1.5,
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    {item.available ? (
                                                        <CheckCircle2
                                                            size={15}
                                                            style={{
                                                                flexShrink: 0,
                                                                marginTop: '1px',
                                                            }}
                                                        />
                                                    ) : (
                                                        <XCircle
                                                            size={15}
                                                            style={{
                                                                flexShrink: 0,
                                                                marginTop: '1px',
                                                            }}
                                                        />
                                                    )}
                                                    <span>{item.name}</span>
                                                </span>
                                            ))
                                        )}
                                    </div>

                                    <div className="fh-score-card-footer">
                                        <span className="fh-score-card-status">
                                            {loading
                                                ? 'กำลังโหลดข้อมูล'
                                                : score === null
                                                    ? 'ข้อมูลตัวชี้วัดยังไม่ครบ'
                                                    : 'คำนวณคะแนนครบแล้ว'}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            </main>

            {/* เกณฑ์การประเมินคะแนน
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
                                                '--category-color': category.color,
                                                '--category-bg': category.background,
                                            }}
                                        >
                                            <div className="fh-modal-category-icon">
                                                <Icon size={20} />
                                            </div>

                                            <div>
                                                <strong>
                                                    {category.title}
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
            )} */}

            <Navbar />
        </div>
    );
}

export default FinHealth;
