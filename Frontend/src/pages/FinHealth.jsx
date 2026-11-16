import {
    eirScore as scoreEir,
    srScore as scoreSr,
    dsrScore as scoreDsr,
    odpScore as scoreOdp,
    odpLevel as scoreOdpLevel,
    average as scoreAverage,
    valid as scoreValid
} from "../data/finHealthScores";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CircleHelp,
    X,
    CheckCircle2,
    XCircle,
    CalendarDays,
    Save,
    Info,
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
function calculateEirScore(eir) { return scoreEir(eir); }
function calculateSrScore(sr) { return scoreSr(sr); }
function calculateDsrScore(dsr) { return scoreDsr(dsr); }
function calculateOdpScore(odp) { return scoreOdp(odp); }

function averageScores(first, second) {
    if (first == null || second == null) return null;

    return Math.round(((first + second) / 2) * 100) / 100;
}

async function readApiJson(response) {
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.toLowerCase().includes('application/json')) {
        const body = await response.text();

        console.error('API returned non-JSON:', {
            url: response.url,
            status: response.status,
            contentType,
            preview: body.slice(0, 300),
        });

        throw new Error(
            `API ${response.url} ส่งข้อมูลไม่ใช่ JSON ` +
            `(HTTP ${response.status})`
        );
    }

    const data = await response.json();

    if (!response.ok) {
        const message =
            data.detail ??
            data.error ??
            `API Error (HTTP ${response.status})`;

        throw new Error(
            typeof message === 'string'
                ? message
                : JSON.stringify(message)
        );
    }

    return data;
}

function FinHealth() {

    const navigate = useNavigate();
    const [cycle, setCycle] = useState(null);
    const [cycleDay, setCycleDay] = useState('1');
    const [cycleMessage, setCycleMessage] = useState('');
    const [cycleSaving, setCycleSaving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [spendMetrics, setSpendMetrics] = useState(null);
    const [saveMetrics, setSaveMetrics] = useState(null);
    const [borrowMetrics, setBorrowMetrics] = useState(null);
    const [loading, setLoading] = useState(true);


    async function saveCycle() {
        const selectedDay = Number(cycleDay);

        if (!Number.isInteger(selectedDay) ||
            selectedDay < 1 || selectedDay > 31) {
            setCycleMessage('กรุณาเลือกวันที่ 1–31');
            return;
        }

        const token = sessionStorage.getItem('accessToken');

        if (!token) {
            setCycleMessage('กรุณาเข้าสู่ระบบใหม่');
            return;
        }

        setCycleSaving(true);
        setCycleMessage('');

        try {
            const response = await fetch('/financial-health/cycle/', {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    start_day: selectedDay,
                }),
            });

            const result = await readApiJson(response);

            setCycle(result);
            setCycleDay(String(result.start_day ?? selectedDay));

            setCycleMessage(
                result.new_cycle_start
                    ? `บันทึกสำเร็จ วันเริ่มรอบใหม่มีผลวันที่ ${result.new_cycle_start}`
                    : 'บันทึกวันเริ่มรอบการเงินสำเร็จ'
            );

            setRefreshKey(value => value + 1);

        } catch (error) {
            console.error('Save financial cycle failed:', error);
            setCycleMessage(
                error.message || 'ไม่สามารถบันทึกวันเริ่มรอบการเงินได้'
            );
        } finally {
            setCycleSaving(false);
        }
    }

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

                return await readApiJson(response);

            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error(
                        `โหลดข้อมูล ${url} ไม่สำเร็จ:`,
                        error
                    );
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
    }, [refreshKey]);


    useEffect(() => {
        const controller = new AbortController();
        const token = sessionStorage.getItem('accessToken');

        if (!token) {
            setCycleMessage('กรุณาเข้าสู่ระบบใหม่');
            return () => controller.abort();
        }

        async function loadCycle() {
            try {
                const response = await fetch('/financial-health/cycle/', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                    signal: controller.signal,
                });

                const data = await readApiJson(response);

                if (controller.signal.aborted) return;

                setCycle(data);
                setCycleDay(String(data.start_day ?? 1));
                setCycleMessage('');

            } catch (error) {
                if (error.name === 'AbortError') return;

                console.error('Load financial cycle failed:', error);
                setCycleMessage(error.message);
            }
        }

        loadCycle();

        return () => controller.abort();
    }, [refreshKey]);

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

                <section className="fh-section fh-cycle-section">
                    <div className="fh-cycle-header">
                        <div className="fh-cycle-icon">
                            <CalendarDays size={22} />
                        </div>

                        <div className="fh-cycle-heading">
                            <h2>รอบการประเมินสุขภาพทางการเงิน</h2>
                            <p>กำหนดวันที่เริ่มต้นรอบการเงินในแต่ละเดือน</p>
                        </div>
                    </div>

                    <div className="fh-cycle-body">
                        <label
                            htmlFor="cycle-start-day"
                            className="fh-cycle-label"
                        >
                            วันที่เริ่มบันทึกทึกรอบการประเมิณสุขภาพทางการเงิน
                        </label>

                        <div className="fh-cycle-controls">
                            <select
                                id="cycle-start-day"
                                className="fh-cycle-select"
                                value={cycleDay}
                                onChange={(e) => setCycleDay(e.target.value)}
                                disabled={cycleSaving}
                            >
                                {Array.from({ length: 31 }, (_, i) => i + 1)
                                    .map((day) => (
                                        <option key={day} value={day}>
                                            วันที่ {day} 
                                        </option>
                                    ))}
                            </select>

                            <button
                                type="button"
                                className="fh-cycle-save"
                                onClick={saveCycle}
                                disabled={cycleSaving}
                            >
                                <Save size={17} />
                                <span>
                                    {cycleSaving
                                        ? 'กำลังบันทึก...'
                                        : 'บันทึกวันเริ่มรอบ'}
                                </span>
                            </button>
                        </div>

                        {cycle && (
                            <div className="fh-cycle-current">
                                <CalendarDays size={16} />
                                <span>
                                    รอบปัจจุบัน: {cycle.period_start}
                                    {' ถึง '}
                                    {cycle.period_end}
                                    {cycle.is_transition && ' (รอบเปลี่ยนผ่าน)'}
                                </span>
                            </div>
                        )}

                        {cycleMessage && (
                            <div
                                className="fh-cycle-message"
                                role="status"
                            >
                                {cycleMessage}
                            </div>
                        )}

                        <div className="fh-cycle-note">
                            <Info size={17} />
                            <span>
                                การเปลี่ยนแปลงวันเริ่มรอบจะมีผลหลังรอบปัจจุบันสิ้นสุด
                            </span>
                        </div>
                    </div>
                </section>

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
