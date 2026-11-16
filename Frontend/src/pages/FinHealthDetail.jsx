import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CalendarDays, CheckCircle2, CircleHelp, Wallet, ReceiptText, TrendingUp } from 'lucide-react';
import { authenticatedFetch as fetch } from '../utils/auth';

import Navbar from '../components/Navbar';
import finHealthCriteria from '../data/finHealthCriteria';
import './FinHealthDetail.css';

function formatSpendMoney(value) {
    return Number(value || 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatThaiMonth(year, month) {
    const numericYear = Number(year);
    const numericMonth = Number(month);

    if (
        !Number.isInteger(numericYear) ||
        numericYear < 1 ||
        !Number.isInteger(numericMonth) ||
        numericMonth < 1 ||
        numericMonth > 12
    ) {
        return null;
    }

    return new Date(numericYear, numericMonth - 1, 1).toLocaleDateString('th-TH', {
        month: 'long',
        year: 'numeric',
    });
}

function formatThaiMonthRange(startDate, endDate) {
    function formatDate(date) {
        if (typeof date !== 'string') return null;

        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
        if (!match) return null;

        const [, year, month, day] = match;
        const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

        if (
            parsedDate.getFullYear() !== Number(year) ||
            parsedDate.getMonth() !== Number(month) - 1 ||
            parsedDate.getDate() !== Number(day)
        ) {
            return null;
        }

        return formatThaiMonth(year, month);
    }

    const startMonth = formatDate(startDate);
    const endMonth = formatDate(endDate);

    if (!startMonth || !endMonth) return null;
    return startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
}
// Calculate EIR Score
function calculateEirScore(eir) {
    if (eir == null || !Number.isFinite(Number(eir))) {
        return null;
    }

    const score = 100 - (1.25 * (Number(eir) - 60));

    return Math.round(
        Math.max(0, Math.min(100, score)) * 100
    ) / 100;
}
// Calculate Saving Rate Score
function calculateSrScore(sr) {
    if (sr == null || !Number.isFinite(Number(sr))) {
        return null;
    }

    return Math.round(
        Math.max(0, Math.min(100, Number(sr) * 5)) * 100
    ) / 100;
}

// Calculate DSR Score (Piecewise Linear)
function calculateDsrScore(dsr) {
    if (dsr == null || !Number.isFinite(Number(dsr))) {
        return null;
    }

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

// Get DSR Score Level
function getDsrLevel(dsr) {
    if (dsr == null || !Number.isFinite(Number(dsr))) {
        return null;
    }

    const value = Number(dsr);

    if (value <= 15) return 'ดีเยี่ยม';
    if (value <= 30) return 'ดี';
    if (value <= 35) return 'ปานกลาง';
    if (value <= 40) return 'ควรปรับปรุง';
    if (value <= 45) return 'เสี่ยงสูง';
    return 'เสี่ยงมาก';
}

// Calculate ODP Score
function calculateOdpScore(odp) {
    if (odp == null || !Number.isFinite(Number(odp))) return null;
    return Math.max(0, Math.min(100, Number(odp)));
}

function getOdpLevel(odp) {
    if (odp == null || !Number.isFinite(Number(odp))) return null;

    const value = Number(odp);
    if (value >= 100) return 'ดีเยี่ยม';
    if (value >= 95) return 'ดีมาก';
    if (value >= 90) return 'ดี';
    if (value >= 85) return 'ค่อนข้างดี';
    if (value >= 80) return 'ปานกลาง';
    if (value >= 70) return 'ควรปรับปรุง';
    if (value >= 60) return 'ค่อนข้างเสี่ยง';
    if (value >= 50) return 'เสี่ยง';
    if (value > 0) return 'เสี่ยงมาก';
    return 'ไม่ชำระตรงเวลา';
}

// Get Saving Rate Level
function getSrLevel(sr) {
    if (sr == null || !Number.isFinite(Number(sr))) {
        return null;
    }

    const rate = Number(sr);

    if (rate <= 0) return 'ไม่มีเงินออม หรือไม่มีการออมเงิน';
    if (rate < 5) return 'มีการออมเงินในระดับต่ำมาก';
    if (rate < 10) return 'มีการออมเงินในระดับต่ำ';
    if (rate < 15) return 'มีการออมเงินในระดับปานกลาง';
    if (rate < 20) return 'มีการออมเงินในระดับดี';

    return 'มีการออมเงินในระดับดีมาก';
}
const numeric = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const money = value => numeric(value) === null ? '—' : numeric(value).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = value => numeric(value) === null ? '—' : numeric(value).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const scoreEir = value => numeric(value) === null ? null : Math.round(Math.max(0, Math.min(100, 100 - 1.25 * (numeric(value) - 60))) * 100) / 100;
const mean = (a, b) => a === null || b === null ? null : Math.round((a + b) * 50) / 100;
const dateLabel = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
    ? date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
};

function ScoreBar({ value }) {
  return <div className="sp-score-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined} aria-label="คะแนนจาก 100"><div style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} /></div>;
}


function FinHealthDetail() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [spendMetrics, setSpendMetrics] = useState(null);
    const [spendLoading, setSpendLoading] = useState(false);
    const [spendError, setSpendError] = useState('');

    const [saveMetrics, setSaveMetrics] = useState(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [borrowMetrics, setBorrowMetrics] = useState(null);
    const [borrowLoading, setBorrowLoading] = useState(false);
    const [borrowError, setBorrowError] = useState('');

    //Spend
    useEffect(() => {
        if (id !== 'spend') return;

        const accessToken = sessionStorage.getItem('accessToken');

        if (!accessToken) {
            setSpendError('ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
            return;
        }

        const controller = new AbortController();

        async function fetchSpendMetrics() {
            setSpendLoading(true);
            setSpendError('');

            try {
                const response = await fetch(
                    '/transactions/financial-health/spend/',
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                        signal: controller.signal,
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.detail ||
                        data.error ||
                        'ไม่สามารถโหลดข้อมูลสุขภาพการเงินได้'
                    );
                }

                setSpendMetrics(data);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setSpendError(
                        error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setSpendLoading(false);
                }
            }
        }

        fetchSpendMetrics();

        return () => controller.abort();
    }, [id]);
    //Save
    useEffect(() => {
        if (id !== 'save') return;

        const accessToken = sessionStorage.getItem('accessToken');

        if (!accessToken) {
            setSaveError('ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
            return;
        }

        const controller = new AbortController();

        async function fetchSaveMetrics() {
            setSaveLoading(true);
            setSaveError('');

            try {
                const response = await fetch(
                    '/savings/financial-health/wallet/',
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                        signal: controller.signal,
                    }
                );

                const contentType = response.headers.get('content-type') || '';
                const raw = await response.text();
                if (!contentType.toLowerCase().includes('application/json')) {
                    throw new Error(`API ด้านการออมส่งข้อมูลที่ไม่ใช่ JSON (HTTP ${response.status}) กรุณาตรวจสอบเส้นทาง Backend และ Vercel Rewrite`);
                }
                let data;
                try {
                    data = JSON.parse(raw);
                } catch {
                    throw new Error('ข้อมูล JSON จาก API ด้านการออมไม่ถูกต้อง');
                }

                if (!response.ok) {
                    throw new Error(
                        data.detail ||
                        data.error ||
                        'ไม่สามารถโหลดข้อมูลด้านการออมได้'
                    );
                }

                setSaveMetrics(data);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setSaveError(
                        error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setSaveLoading(false);
                }
            }
        }

        fetchSaveMetrics();

        return () => controller.abort();
    }, [id]);

    //Debt: Borrow
    useEffect(() => {
        if (id !== 'borrow') return;

        const accessToken = sessionStorage.getItem('accessToken');

        if (!accessToken) {
            setBorrowError('ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่');
            return;
        }

        const controller = new AbortController();

        async function fetchBorrowMetrics() {
            setBorrowLoading(true);
            setBorrowError('');

            try {
                const response = await fetch(
                    '/debts/financial-health/borrow/',
                    {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                        signal: controller.signal,
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.detail ||
                        data.error ||
                        'ไม่สามารถโหลดข้อมูลสุขภาพการเงินได้'
                    );
                }

                setBorrowMetrics(data);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setBorrowError(
                        error.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setBorrowLoading(false);
                }
            }
        }

        fetchBorrowMetrics();

        return () => controller.abort();
    }, [id]);

    const criterion = finHealthCriteria.find(
        (item) => item.id === id
    );

    if (!criterion) {
        return (
            <div className="fhd-page">
                <header className="fhd-header">
                    <button
                        type="button"
                        className="fhd-back-button"
                        onClick={() => navigate('/financial-health')}
                        aria-label="กลับหน้าสุขภาพการเงิน"
                    >
                        <ChevronLeft size={22} />
                    </button>
                    <h1>ไม่พบเกณฑ์คะแนน</h1>
                </header>

                <main className="fhd-main">
                    <p>ไม่พบข้อมูลเกณฑ์ที่เลือก</p>
                    <button
                        type="button"
                        className="fhd-primary-button"
                        onClick={() => navigate('/financial-health')}
                    >
                        กลับหน้าสุขภาพการเงิน
                    </button>
                </main>

                <Navbar />
            </div>
        );
    }

    const Icon = criterion.Icon;

    const saveMonths = saveMetrics?.monthly_breakdown || [];
    const spendPeriod = formatThaiMonth(spendMetrics?.year, spendMetrics?.month);
    const savePeriod = formatThaiMonthRange(
        saveMetrics?.period_start,
        saveMetrics?.period_end
    );
    const eirScore = calculateEirScore(spendMetrics?.expense_ratio);

    const trcScore = spendMetrics?.trc_score;
    const srScore = calculateSrScore(saveMetrics?.saving_rate);
    const srLevel = getSrLevel(saveMetrics?.saving_rate);

    const dsrScore = calculateDsrScore(borrowMetrics?.dsr_percentage);
    const dsrLevel = getDsrLevel(borrowMetrics?.dsr_percentage);
    const odpScore = calculateOdpScore(borrowMetrics?.odp_percentage);
    const odpLevel = getOdpLevel(borrowMetrics?.odp_percentage);
    const borrowTotalScore =
        dsrScore == null || odpScore == null
            ? null
            : Math.round(((dsrScore + odpScore) / 2) * 100) / 100;

    // Saving Consistency
    const scFrequency = saveMetrics?.sc_recording_frequency;
    const scDistribution = saveMetrics?.sc_recording_distribution;

    const scScore =
        scFrequency == null ||
            scDistribution == null ||
            !Number.isFinite(Number(scFrequency)) ||
            !Number.isFinite(Number(scDistribution))
            ? null
            : Math.round(
                ((Number(scFrequency) + Number(scDistribution)) / 2) * 100
            ) / 100;

    // Saving Total Score
    const saveTotalScore =
        srScore == null || scScore == null
            ? null
            : Math.round(((srScore + scScore) / 2) * 100) / 100;

    const spendTotalScore =
        eirScore == null ||
            trcScore == null ||
            !Number.isFinite(Number(trcScore))
            ? null
            : Math.round(((eirScore + Number(trcScore)) / 2) * 100) / 100;

    return (
        <div className="fhd-page">
            <header className="fhd-header">
                <div className="fhd-heading">
                    <button
                        type="button"
                        className="fhd-back-button"
                        onClick={() => navigate('/financial-health')}
                        aria-label="กลับหน้าสุขภาพการเงิน"
                    >
                        <ChevronLeft size={22} />
                    </button>

                    <div
                        className="fhd-icon"
                        style={{
                            '--category-color': criterion.color,
                            '--category-bg': criterion.background,
                        }}
                    >
                        <Icon size={27} strokeWidth={1.8} />
                    </div>

                    <div className="fhd-title-content">
                        <h1>{criterion.title}</h1>
                    </div>
                </div>
            </header>

            <main className="fhd-main">
                {/* <section className="fhd-card">
                    <h2>เกี่ยวกับเกณฑ์นี้</h2>
                    <p>{criterion.description}</p>
                </section> */}

                {criterion.id === 'spend' && (
                    spendLoading ? (
                        <section className="fhd-card"><p className="fhd-message">กำลังคำนวณข้อมูลสุขภาพการเงิน...</p></section>
                    ) : spendError ? (
                        <section className="fhd-card"><p className="fhd-error" role="alert">{spendError}</p></section>
                    ) : spendMetrics ? (
                        (() => {
                            const metrics = spendMetrics;
                            const income = numeric(metrics.net_monthly_income);
                            const expense = numeric(metrics.expense_total);
                            const eir = income !== null && income > 0 ? numeric(metrics.expense_ratio) : null;
                            const eirScore = scoreEir(eir);
                            const rf = numeric(metrics.trc_recording_frequency);
                            const rd = numeric(metrics.trc_recording_distribution);
                            const trc = rf !== null && rd !== null ? mean(rf, rd) : null;
                            const total = mean(eirScore, trc);
                            const periods = Array.isArray(metrics.trc_periods) ? metrics.trc_periods : [];
                            const daily = Array.isArray(metrics.trc_daily_records) ? metrics.trc_daily_records : [];
                            const start = dateLabel(metrics.period_start);
                            const end = dateLabel(metrics.period_end);
                            const periodLabel = start && end ? `${start} – ${end}` : 'ช่วงประเมินตามข้อมูลที่ Backend ส่งมา';
                            const recordedDays = numeric(metrics.trc_recorded_days);
                            const recordedPeriods = numeric(metrics.trc_recorded_periods);
                            const recommendation = eirScore === null ? 'ยังคำนวณ EIR ไม่ได้ เพราะไม่มีข้อมูลรายได้สุทธิที่มากกว่า 0'
                            : trc === null ? 'ยังไม่มีข้อมูล RF หรือ RD ครบสำหรับคำนวณความสม่ำเสมอ'
                            : eirScore <= trc ? 'ลองทบทวนค่าใช้จ่ายเทียบกับรายได้สุทธิ เพื่อปรับปรุงคะแนน EIR' : 'เพิ่มความสม่ำเสมอในการบันทึกรายการให้ครอบคลุมหลายวันและทุกช่วงของรอบ';
                            
                            return (
                                <div className="sp-dashboard">
                                    <section className="sp-hero">
                                      <div className="sp-eyebrow"><TrendingUp size={16}/> ผลประเมินด้านรายรับ–รายจ่าย</div>
                                      <div className="sp-hero-layout">
                                        <div><div className="sp-hero-score">{total === null ? '—' : number(total)} <span>/ 100</span></div>
                                          <p>{total === null ? 'ยังประเมินคะแนนรวมไม่ได้ เนื่องจากตัวชี้วัดไม่ครบ' : 'คะแนนเฉลี่ยจาก EIR และ TRC'}</p></div>
                                        <div className="sp-hero-side"><CalendarDays size={17}/><span>{periodLabel}</span></div>
                                      </div>
                                      <ScoreBar value={total}/>
                                      <div className="sp-score-pills"><span>EIR <strong>{number(eirScore)}</strong></span><span>TRC <strong>{number(trc)}</strong></span></div>
                                    </section>
                                
                                    <div className="sp-stat-grid">
                                      <div className="sp-stat"><div className="sp-stat-label"><Wallet size={17}/> รายได้สุทธิ</div><strong>฿{money(income)}</strong><small>รายได้ที่ใช้คำนวณ EIR</small></div>
                                      <div className="sp-stat"><div className="sp-stat-label"><ReceiptText size={17}/> ค่าใช้จ่ายทั้งหมด</div><strong>฿{money(expense)}</strong><small>รายจ่ายในช่วงประเมิน</small></div>
                                    </div>
                                
                                    <section className="sp-panel">
                                      <div className="sp-panel-head"><div><span className="sp-index">01</span><h2>อัตราส่วนค่าใช้จ่ายต่อรายได้</h2><p>Expense-to-Income Ratio (EIR)</p></div><span className="sp-tag">EIR</span></div>
                                      <div className="sp-metric-line"><div><small>สัดส่วนค่าใช้จ่าย</small><strong>{eir === null ? '—' : `${number(eir)}%`}</strong></div><div className="sp-metric-score"><small>คะแนน EIR</small><strong>{number(eirScore)} <span>/ 100</span></strong></div></div>
                                      <ScoreBar value={eirScore}/>
                                      {eir === null && <p className="sp-muted">ข้อมูลรายได้สุทธิไม่เพียงพอ จึงไม่สามารถคำนวณ EIR ได้</p>}
                                      <details className="sp-details"><summary><CircleHelp size={16}/> ดูสูตรและที่มาของข้อมูล</summary><div className="sp-details-content">
                                        <p>EIR = (ค่าใช้จ่ายทั้งหมด ÷ รายได้สุทธิ) × 100</p>
                                        <p>คะแนน EIR = จำกัดค่า 100 − 1.25 × (EIR − 60) ให้อยู่ระหว่าง 0–100</p>
                                        <div className="sp-detail-row"><span>รายได้ประจำ</span><strong>฿{money(metrics.monthly_income)}</strong></div>
                                        <div className="sp-detail-row"><span>รายรับจากธุรกรรม</span><strong>฿{money(metrics.transaction_income_total)}</strong></div>
                                        <div className="sp-detail-row"><span>รายได้สุทธิ</span><strong>฿{money(income)}</strong></div>
                                        <div className="sp-detail-row"><span>ค่าใช้จ่ายทั้งหมด</span><strong>฿{money(expense)}</strong></div>
                                      </div></details>
                                    </section>
                                
                                    <section className="sp-panel">
                                      <div className="sp-panel-head"><div><span className="sp-index">02</span><h2>ความสม่ำเสมอในการบันทึก</h2><p>Transaction Recording Consistency (TRC)</p></div><span className="sp-tag">TRC</span></div>
                                      <div className="sp-trc-top"><div><small>คะแนน TRC</small><strong>{number(trc)} <span>/ 100</span></strong></div><p>เฉลี่ยจากความถี่ (RF) และการกระจายการบันทึก (RD)</p></div>
                                      <ScoreBar value={trc}/>
                                      <div className="sp-mini-grid"><div><small>RF · ความถี่</small><strong>{number(rf)} <span>/ 100</span></strong><p>{recordedDays === null ? 'ไม่พบจำนวนวันที่บันทึก' : `บันทึก ${number(recordedDays)} วัน · เป้าหมาย 8 วัน`}</p></div>
                                        <div><small>RD · การกระจาย</small><strong>{number(rd)} <span>/ 100</span></strong><p>{recordedPeriods === null ? 'ไม่พบจำนวนช่วงที่บันทึก' : `มีบันทึก ${number(recordedPeriods)} จาก 4 ช่วง`}</p></div></div>
                                      <h3 className="sp-subtitle">การบันทึกใน 4 ช่วงของรอบ</h3>
                                      {periods.length ? <div className="sp-period-grid">{periods.map((item, index) => <div className={`sp-period ${item.has_records ? 'is-recorded' : ''}`} key={item.period ?? index}>
                                        <span>ช่วง {item.period ?? index + 1}</span><strong>{item.has_records ? <><CheckCircle2 size={17}/> มีบันทึก</> : 'ไม่มีบันทึก'}</strong>
                                        <small>{item.start_day != null && item.end_day != null ? `วันที่ ${item.start_day}–${item.end_day}` : 'ไม่ระบุช่วงวันที่'}</small>
                                      </div>)}</div> : <p className="sp-muted">Backend ยังไม่ได้ส่งรายละเอียดการบันทึกทั้ง 4 ช่วง</p>}
                                      <details className="sp-details"><summary><CircleHelp size={16}/> ดูสูตรและรายการบันทึก</summary><div className="sp-details-content">
                                        <p>RF = min(100, จำนวนวันที่มีการบันทึกจริง ÷ 8 × 100)</p>
                                        <p>RD = จำนวนช่วงที่มีการบันทึก ÷ 4 × 100</p>
                                        <p>TRC = (RF + RD) ÷ 2</p>
                                        <p>ช่วงที่ 1–3 มีช่วงละ 7 วัน และช่วงที่ 4 คือวันที่ 22 ถึงวันสุดท้ายของรอบการเงิน</p>
                                        {daily.length > 0 && <div className="sp-daily-list">{daily.map((item, index) => <div className="sp-detail-row" key={item.date ?? index}><span>{dateLabel(item.date) ?? `วันที่ ${item.day ?? '—'}`}</span><strong>รายรับ {item.income_count ?? 0} · รายจ่าย {item.expense_count ?? 0}</strong></div>)}</div>}
                                      </div></details>
                                    </section>
                                
                                    <section className="sp-tip"><strong>แนวทางปรับปรุง</strong><p>{recommendation}</p></section>
                                    <p className="sp-footnote">หมายเหตุ: คะแนนและช่วงวันที่อ้างอิงข้อมูลจาก API ปัจจุบัน การคำนวณตามรอบการเงินที่กำหนดเองต้องให้ Backend ส่งข้อมูลในช่วงเดียวกันก่อน</p>
                                  </div>
                            );
                        })()
                    ) : (
                        <section className="fhd-card"><p className="fhd-message">ยังไม่มีข้อมูลสำหรับคำนวณ</p></section>
                    )
                )}

                {criterion.id === 'save' && (
                    saveLoading ? (
                        <section className="fhd-card"><p className="fhd-message">กำลังคำนวณข้อมูลด้านการออม...</p></section>
                    ) : saveError ? (
                        <section className="fhd-card"><p className="fhd-error" role="alert">{saveError}</p></section>
                    ) : saveMetrics ? (
                        (() => {
                            const m = saveMetrics;
                            const sr = numeric(m.saving_rate);
                            const srPoints = numeric(m.sr_score) ?? calculateSrScore(sr);
                            const sf = numeric(m.sc_recording_frequency);
                            const sd = numeric(m.sc_recording_distribution);
                            const scPoints = numeric(m.sc_score) ?? mean(sf, sd);
                            const total = srPoints !== null && scPoints !== null ? mean(srPoints, scPoints) : null;
                            const periods = Array.isArray(m.sc_periods) ? m.sc_periods : [];
                            const daily = Array.isArray(m.sc_daily_records) ? m.sc_daily_records : [];
                            const from = dateLabel(m.period_start);
                            const to = dateLabel(m.period_end);
                            const periodText = from && to ? `${from} – ${to}` : 'ยังไม่ระบุช่วงประเมิน';
                            const days = numeric(m.sc_recorded_days);
                            const segments = numeric(m.sc_recorded_periods);
                            const saving = numeric(m.total_saving);
                            const advice = srPoints === null ? 'เพิ่มข้อมูลรายได้สุทธิเพื่อให้ระบบคำนวณอัตราการออมได้' : scPoints === null ? 'บันทึกการฝากและถอนเพื่อให้ประเมินความสม่ำเสมอได้' : srPoints <= scPoints ? 'ลองเพิ่มสัดส่วนเงินออมสุทธิเทียบกับรายได้ เพื่อพัฒนาคะแนน SR' : 'กระจายการออมให้ครอบคลุมหลายวันและครบทั้ง 4 ช่วงของรอบการเงิน';
                            return (
                                <div className="sp-dashboard save-dashboard">
                                    <section className="sp-hero">
                                        <div className="sp-eyebrow"><Wallet size={16} /> ผลประเมินด้านการออม</div>
                                        <div className="sp-hero-layout">
                                            <div><div className="sp-hero-score">{number(total)} <span>/ 100</span></div><p>{total === null ? 'ยังประเมินคะแนนรวมไม่ได้ เนื่องจากข้อมูลไม่ครบ' : 'คะแนนเฉลี่ยจากอัตราการออม (SR) และความสม่ำเสมอ (SC)'}</p></div>
                                            <div className="sp-hero-side"><CalendarDays size={17} /><span>{periodText}</span></div>
                                        </div>
                                        <ScoreBar value={total} />
                                        <div className="sp-score-pills"><span>SR <strong>{number(srPoints)}</strong></span><span>SC <strong>{number(scPoints)}</strong></span></div>
                                        {m.is_provisional && <p className="save-provisional">คะแนนระหว่างรอบการเงิน อาจเปลี่ยนแปลงเมื่อมีรายการใหม่</p>}
                                    </section>
                                    <div className="sp-stat-grid save-stat-grid">
                                        <div className="sp-stat"><div className="sp-stat-label"><TrendingUp size={17} /> เงินออมสุทธิ</div><strong>{saving === null ? '—' : `฿${money(saving)}`}</strong><small>ยอดฝากหักยอดถอนในรอบประเมิน</small></div>
                                        <div className="sp-stat"><div className="sp-stat-label"><Wallet size={17} /> รายได้รวม</div><strong>{numeric(m.total_income) === null ? '—' : `฿${money(m.total_income)}`}</strong><small>รายได้ที่ใช้คำนวณอัตราการออม</small></div>
                                    </div>
                                    <section className="sp-panel">
                                        <div className="sp-panel-head"><div><span className="sp-index">01</span><h2>อัตราการออม</h2><p>Saving Rate (SR)</p></div><span className="sp-tag">SR</span></div>
                                        <div className="sp-metric-line"><div><small>สัดส่วนเงินออมสุทธิ</small><strong>{sr === null ? '—' : `${number(sr)}%`}</strong></div><div className="sp-metric-score"><small>คะแนน SR</small><strong>{number(srPoints)} <span>/ 100</span></strong></div></div>
                                        <ScoreBar value={srPoints} />
                                        {sr !== null && <p className="save-level">{getSrLevel(sr)}</p>}
                                        {sr === null && <p className="sp-muted">ยังไม่สามารถคำนวณได้ เนื่องจากไม่มีข้อมูลรายได้สุทธิที่มากกว่า 0</p>}
                                        <details className="sp-details"><summary><CircleHelp size={16} /> ดูสูตรและที่มาของยอดเงิน</summary><div className="sp-details-content">
                                            <p>SR = (เงินออมสุทธิ ÷ รายได้รวม) × 100</p>
                                            <p>เงินออมสุทธิ = ยอดฝาก − ยอดถอน</p>
                                            <p>คะแนน SR = จำกัดค่า (SR × 5) ให้อยู่ระหว่าง 0–100</p>
                                            <div className="sp-detail-row"><span>ยอดฝาก</span><strong>฿{money(m.total_deposit)}</strong></div>
                                            <div className="sp-detail-row"><span>ยอดถอน</span><strong>฿{money(m.total_withdraw)}</strong></div>
                                            <div className="sp-detail-row"><span>เงินออมสุทธิ</span><strong>฿{money(m.total_saving)}</strong></div>
                                            <div className="sp-detail-row"><span>รายได้ประจำ</span><strong>฿{money(m.monthly_income)}</strong></div>
                                            <div className="sp-detail-row"><span>รายรับจากธุรกรรม</span><strong>฿{money(m.transaction_income)}</strong></div>
                                            <div className="sp-detail-row"><span>รายได้รวม</span><strong>฿{money(m.total_income)}</strong></div>
                                        </div></details>
                                    </section>
                                    <section className="sp-panel">
                                        <div className="sp-panel-head"><div><span className="sp-index">02</span><h2>ความสม่ำเสมอในการออม</h2><p>Saving Consistency (SC)</p></div><span className="sp-tag">SC</span></div>
                                        <div className="sp-trc-top"><div><small>คะแนน SC</small><strong>{number(scPoints)} <span>/ 100</span></strong></div><p>เฉลี่ยจากความถี่ (SF) และการกระจายการออม (SD)</p></div>
                                        <ScoreBar value={scPoints} />
                                        <div className="sp-mini-grid"><div><small>SF · ความถี่</small><strong>{number(sf)} <span>/ 100</span></strong><p>{days === null ? 'ไม่มีข้อมูลวันที่ออม' : `ออมสุทธิเป็นบวก ${number(days)} วัน · เป้าหมาย 4 วัน`}</p></div><div><small>SD · การกระจาย</small><strong>{number(sd)} <span>/ 100</span></strong><p>{segments === null ? 'ไม่มีข้อมูลช่วงการออม' : `มีการออม ${number(segments)} จาก 4 ช่วง`}</p></div></div>
                                        <h3 className="sp-subtitle">การออมใน 4 ช่วงของรอบการเงิน</h3>
                                        {periods.length ? <div className="sp-period-grid">{periods.map((item, index) => <div className={`sp-period ${item.has_records ? 'is-recorded' : ''}`} key={item.period ?? index}><span>ช่วง {item.period ?? index + 1}</span><strong>{item.has_records ? <><CheckCircle2 size={17} /> มีการออม</> : 'ยังไม่มีการออม'}</strong><small>{item.start_day != null && item.end_day != null ? `วันที่ ${item.start_day}–${item.end_day}` : 'ไม่ระบุช่วงวันที่'}</small></div>)}</div> : <p className="sp-muted">ยังไม่มีรายละเอียดการออมแยกตามช่วงจาก API</p>}
                                        <details className="sp-details"><summary><CircleHelp size={16} /> ดูสูตรและประวัติการออมรายวัน</summary><div className="sp-details-content">
                                            <p>SF = min(100, จำนวนวันที่มีเงินออมสุทธิเป็นบวก ÷ 4 × 100)</p>
                                            <p>SD = จำนวนช่วงที่มีการออม ÷ 4 × 100</p>
                                            <p>SC = (SF + SD) ÷ 2</p>
                                            <p>ระบบพิจารณาวันที่ยอดฝากหักยอดถอนมากกว่า 0 และแบ่งรอบการเงินเป็น 4 ช่วง</p>
                                            {daily.length ? <div className="sp-daily-list">{daily.map((item, index) => <div className="sp-detail-row save-daily-row" key={item.date ?? index}><span>{dateLabel(item.date) ?? `วันที่ ${item.day ?? '—'}`}</span><strong>ฝาก ฿{money(item.deposit)} · ถอน ฿{money(item.withdraw)} · สุทธิ ฿{money(item.net_saving)}</strong></div>)}</div> : <p className="sp-muted">ยังไม่มีรายการออมรายวันในรอบนี้</p>}
                                        </div></details>
                                    </section>
                                    <section className="sp-tip"><strong>แนวทางปรับปรุง</strong><p>{advice}</p></section>
                                    <p className="sp-footnote">หมายเหตุ: ข้อมูลอ้างอิงรอบการเงินและคะแนนจาก API หากข้อมูลบางตัวไม่พร้อม ระบบจะแสดงเครื่องหมาย — แทนคะแนนศูนย์</p>
                                </div>
                            );
                        })()
                    ) : (
                        <section className="fhd-card"><p className="fhd-message">ยังไม่มีข้อมูลสำหรับคำนวณ</p></section>
                    )
                )}

                {criterion.id === 'borrow' && (
                    borrowLoading ? (
                        <section className="fhd-card"><p className="fhd-message">กำลังคำนวณข้อมูลด้านหนี้สิน...</p></section>
                    ) : borrowError ? (
                        <section className="fhd-card"><p className="fhd-error" role="alert">{borrowError}</p></section>
                    ) : borrowMetrics ? (
                        (() => {
                            const metrics = borrowMetrics;
                            const dsr = numeric(metrics.dsr_percentage);
                            const odp = numeric(metrics.odp_percentage);
                            const dsrPoints = calculateDsrScore(dsr);
                            const odpPoints = calculateOdpScore(odp);
                            const total = mean(dsrPoints, odpPoints);
                            const debts = Array.isArray(metrics.debt_odp_details) ? metrics.debt_odp_details : [];
                            const due = numeric(metrics.due_installments);
                            const onTime = numeric(metrics.on_time_installments);
                            const monthlyDebt = numeric(metrics.monthly_debt_total);
                            const income = numeric(metrics.net_monthly_income);
                            const recommendation = dsrPoints === null ? 'ยังไม่สามารถประเมินภาระหนี้ต่อรายได้ได้ กรุณาตรวจสอบข้อมูลรายได้และยอดผ่อนชำระ'
                                : odpPoints === null ? 'ยังไม่มีงวดหนี้ที่ถึงกำหนดสำหรับประเมินความตรงเวลา'
                                : dsrPoints <= odpPoints ? 'พิจารณาลดภาระผ่อนรายเดือนเมื่อเทียบกับรายได้ เพื่อช่วยปรับปรุงคะแนน DSR'
                                : 'ติดตามวันครบกำหนดและชำระให้ตรงเวลา เพื่อช่วยปรับปรุงคะแนน ODP';
                            return (
                                <div className="sp-dashboard borrow-dashboard">
                                    <section className="sp-hero">
                                        <div className="sp-eyebrow"><Wallet size={16} /> ผลประเมินด้านหนี้สิน</div>
                                        <div className="sp-hero-layout">
                                            <div><div className="sp-hero-score">{number(total)} <span>/ 100</span></div><p>{total === null ? 'ยังคำนวณคะแนนรวมไม่ได้ เนื่องจากข้อมูลตัวชี้วัดไม่ครบ' : 'คะแนนเฉลี่ยจาก DSR และ ODP'}</p></div>
                                            <div className="sp-hero-side"><CheckCircle2 size={17} /><span>ภาพรวมภาระหนี้และการชำระตรงเวลา</span></div>
                                        </div>
                                        <ScoreBar value={total} />
                                        <div className="sp-score-pills"><span>DSR <strong>{number(dsrPoints)}</strong></span><span>ODP <strong>{number(odpPoints)}</strong></span></div>
                                    </section>
                                    <div className="sp-stat-grid">
                                        <div className="sp-stat"><div className="sp-stat-label"><ReceiptText size={17} /> ยอดผ่อนชำระต่อเดือน</div><strong>฿{money(monthlyDebt)}</strong><small>ภาระหนี้รายเดือนที่ใช้ประเมิน DSR</small></div>
                                        <div className="sp-stat"><div className="sp-stat-label"><Wallet size={17} /> รายได้สุทธิต่อเดือน</div><strong>฿{money(income)}</strong><small>รายได้ที่ใช้เปรียบเทียบภาระหนี้</small></div>
                                    </div>
                                    <section className="sp-panel">
                                        <div className="sp-panel-head"><div><span className="sp-index">01</span><h2>ภาระหนี้ต่อรายได้</h2><p>Debt Service Ratio (DSR)</p></div><span className="sp-tag">DSR</span></div>
                                        <div className="sp-metric-line"><div><small>อัตราส่วนภาระหนี้</small><strong>{dsr === null ? '—' : `${number(dsr)}%`}</strong></div><div className="sp-metric-score"><small>คะแนน DSR</small><strong>{number(dsrPoints)} <span>/ 100</span></strong></div></div>
                                        <ScoreBar value={dsrPoints} />
                                        {dsr !== null && <p className="borrow-level">{getDsrLevel(dsr)}</p>}
                                        {dsr === null && <p className="sp-muted">ยังไม่มีข้อมูลเพียงพอสำหรับคำนวณ DSR</p>}
                                        <details className="sp-details"><summary><CircleHelp size={16} /> ดูสูตรและที่มาของข้อมูล</summary><div className="sp-details-content">
                                            <p>DSR = (ยอดผ่อนชำระหนี้รายเดือน ÷ รายได้สุทธิต่อเดือน) × 100</p>
                                            <p>คะแนน DSR คำนวณตามช่วงอัตราส่วนภาระหนี้ที่กำหนดไว้ในเกณฑ์ประเมิน</p>
                                            <div className="sp-detail-row"><span>ยอดผ่อนชำระต่อเดือน</span><strong>฿{money(monthlyDebt)}</strong></div>
                                            <div className="sp-detail-row"><span>รายได้ประจำ</span><strong>฿{money(metrics.monthly_income)}</strong></div>
                                            <div className="sp-detail-row"><span>รายรับจากธุรกรรม</span><strong>฿{money(metrics.transaction_income_total)}</strong></div>
                                            <div className="sp-detail-row"><span>รายได้สุทธิ</span><strong>฿{money(income)}</strong></div>
                                        </div></details>
                                    </section>
                                    <section className="sp-panel">
                                        <div className="sp-panel-head"><div><span className="sp-index">02</span><h2>การชำระหนี้ตรงเวลา</h2><p>On-time Debt Payment (ODP)</p></div><span className="sp-tag">ODP</span></div>
                                        <div className="sp-metric-line"><div><small>อัตราการชำระตรงเวลา</small><strong>{odp === null ? '—' : `${number(odp)}%`}</strong></div><div className="sp-metric-score"><small>คะแนน ODP</small><strong>{number(odpPoints)} <span>/ 100</span></strong></div></div>
                                        <ScoreBar value={odpPoints} />
                                        {odp !== null && <p className="borrow-level">{getOdpLevel(odp)}</p>}
                                        <div className="sp-mini-grid"><div><small>ชำระตรงเวลา</small><strong>{number(onTime)} <span>งวด</span></strong><p>จำนวนงวดที่ชำระครบภายในกำหนด</p></div><div><small>ถึงกำหนดทั้งหมด</small><strong>{number(due)} <span>งวด</span></strong><p>จำนวนงวดที่นำมาประเมิน</p></div></div>
                                        {odp === null && <p className="sp-muted">ยังไม่มีงวดหนี้รายเดือนที่ถึงกำหนดชำระ</p>}
                                        <details className="sp-details"><summary><CircleHelp size={16} /> ดูสูตรและรายละเอียดแยกตามหนี้</summary><div className="sp-details-content">
                                            <p>ODP = (จำนวนงวดที่ชำระตรงเวลา ÷ จำนวนงวดที่ถึงกำหนด) × 100</p>
                                            {debts.length ? <div className="borrow-debt-list">{debts.map((debt, index) => <div className="borrow-debt-item" key={debt.debt_id ?? index}><div><strong>{debt.debt_name || `รายการหนี้ ${index + 1}`}</strong><small>ตรงเวลา {number(debt.on_time_installments)} / {number(debt.due_installments)} งวด</small></div><span>{numeric(debt.odp_percentage) === null ? 'ยังไม่มีข้อมูล' : `${number(debt.odp_percentage)}%`}</span></div>)}</div> : <p className="sp-muted">ยังไม่มีรายละเอียดหนี้ที่ถึงกำหนดชำระ</p>}
                                        </div></details>
                                    </section>
                                    <section className="sp-tip"><strong>แนวทางปรับปรุง</strong><p>{recommendation}</p></section>
                                </div>
                            );
                        })()
                    ) : (
                        <section className="fhd-card"><p className="fhd-message">ยังไม่มีข้อมูลสำหรับคำนวณ</p></section>
                    )
                )}

                {criterion.id !== 'spend' && (
                    <section className="fhd-card">
                        <h2>เป้าหมายการประเมิน</h2>
                        <p>{criterion.target}</p>
                    </section>
                )}
            </main>

            <Navbar />
        </div>
    );
}

export default FinHealthDetail;
