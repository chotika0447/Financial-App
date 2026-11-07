import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
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
    return new Date(year, month - 1, 1).toLocaleDateString('th-TH', {
        month: 'long',
        year: 'numeric',
    });
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

                const data = await response.json();

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
    const eirScore = calculateEirScore(spendMetrics?.expense_ratio);
    const trcScore = spendMetrics?.trc_score;

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
                <section className="fhd-card">
                    <h2>เกี่ยวกับเกณฑ์นี้</h2>
                    <p>{criterion.description}</p>
                </section>

                {criterion.id === 'spend' && (
                    <>
                        {spendLoading ? (
                            <section className="fhd-card">
                                <p className="fhd-spend-message">
                                    กำลังคำนวณข้อมูลสุขภาพการเงิน...
                                </p>
                            </section>
                        ) : spendError ? (
                            <section className="fhd-card">
                                <p className="fhd-spend-error" role="alert">
                                    {spendError}
                                </p>
                            </section>
                        ) : spendMetrics ? (
                            <>
                                {/* Spend Total Score */}
                                <section className="fhd-card fhd-spend-total-card">
                                    <h2>คะแนนด้านรายรับ–รายจ่าย</h2>

                                    <p>
                                        คะแนนด้านนี้คำนวณจากค่าเฉลี่ยของคะแนน EIR และ TRC
                                    </p>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">
                                            สูตรคำนวณ
                                        </span>
                                        <p>
                                            (คะแนน EIR + คะแนน TRC) ÷ 2
                                        </p>
                                    </div>

                                    <div className="fhd-spend-result">
                                        <div className="fhd-spend-result-card">
                                            <span className="fhd-spend-result-label">
                                                คะแนนเฉลี่ยด้านรายรับ–รายจ่าย
                                            </span>

                                            {spendTotalScore == null ? (
                                                <strong className="fhd-spend-no-result">
                                                    ยังไม่สามารถคำนวณคะแนนเฉลี่ยได้
                                                    เนื่องจากข้อมูลคะแนนไม่ครบถ้วน
                                                </strong>
                                            ) : (
                                                <div className="fhd-spend-result-value">
                                                    <strong>
                                                        {formatSpendMoney(spendTotalScore)}
                                                    </strong>
                                                    <span>/ 100</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* EIR */}
                                <section className="fhd-card fhd-spend-card">
                                    <div className="fhd-indicator-heading">
                                        <span className="fhd-indicator-number">
                                            01
                                        </span>
                                        <div>
                                            <h2>
                                                อัตราส่วนค่าใช้จ่ายต่อรายได้
                                            </h2>
                                            <p>
                                                Expense-to-Income Ratio (EIR)
                                            </p>
                                        </div>
                                    </div>

                                    <p className="fhd-spend-description">
                                        ใช้ประเมินว่าภาระค่าใช้จ่ายของเรามีมากน้อยเพียงใดเมื่อเทียบกับรายได้ที่ได้รับใน 1 เดือน
                                    </p>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">
                                            สูตรคำนวณ
                                        </span>
                                        <p>
                                            (ค่าใช้จ่ายทั้งหมด ÷ รายได้สุทธิ) × 100
                                        </p>
                                    </div>

                                    <div className="fhd-spend-period">
                                        ข้อมูลเดือน{' '}
                                        {formatThaiMonth(
                                            spendMetrics.year,
                                            spendMetrics.month
                                        )}
                                    </div>

                                    <div className="fhd-spend-breakdown">
                                        <div className="fhd-spend-row">
                                            <span>ค่าใช้จ่ายทั้งหมด</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    spendMetrics.expense_total
                                                )} บาท
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row">
                                            <span>เงินเดือน</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    spendMetrics.monthly_income
                                                )} บาท
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row">
                                            <span>รายรับจากธุรกรรม</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    spendMetrics.transaction_income_total
                                                )} บาท
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row fhd-spend-row-total">
                                            <span>รายได้สุทธิ</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    spendMetrics.net_monthly_income
                                                )} บาท
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="fhd-spend-result">
                                        {/* ช่องที่ 1: EIR */}
                                        <div className="fhd-spend-result-card">
                                            <span className="fhd-spend-result-label">
                                                ผลการคำนวณ EIR
                                            </span>

                                            {spendMetrics.expense_ratio == null ? (
                                                <strong className="fhd-spend-no-result">
                                                    ไม่สามารถคำนวณได้
                                                </strong>
                                            ) : (
                                                <div className="fhd-spend-result-value">
                                                    <strong>
                                                        {formatSpendMoney(spendMetrics.expense_ratio)}
                                                    </strong>
                                                    <span>%</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* ช่องที่ 2: EIR Score */}
                                        <div className="fhd-spend-result-card">
                                            <span className="fhd-spend-result-label">
                                                คะแนน EIR
                                            </span>

                                            {eirScore == null ? (
                                                <strong className="fhd-spend-no-result">
                                                    ยังไม่มีคะแนน
                                                </strong>
                                            ) : (
                                                <div className="fhd-spend-result-value">
                                                    <strong>{eirScore}</strong>
                                                    <span>/ 100</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* TRC */}
                                <section className="fhd-card fhd-trc-card">
                                    <div className="fhd-indicator-heading">
                                        <span className="fhd-indicator-number">
                                            02
                                        </span>
                                        <div>
                                            <h2>
                                                ความสม่ำเสมอในการบันทึก
                                                รายรับ–รายจ่าย
                                            </h2>
                                            <p>
                                                Transaction Recording Consistency (TRC)
                                            </p>
                                        </div>
                                    </div>

                                    <p className="fhd-spend-description">
                                        ประเมินความสม่ำเสมอในการบันทึกรายรับหรือรายจ่าย
                                        ภายใน 1 เดือน โดยพิจารณาทั้งจำนวนวันที่มีการบันทึก
                                        และการกระจายตัวของวันที่บันทึกตลอดทั้งเดือน
                                    </p>

                                    <div className="fhd-spend-period">
                                        ข้อมูลเดือน{' '}
                                        {formatThaiMonth(
                                            spendMetrics.year,
                                            spendMetrics.month
                                        )}
                                    </div>

                                    {/* Recording Frequency */}
                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">
                                            1. Recording Frequency (RF)
                                        </span>
                                        <p>
                                            (จำนวนวันที่มีการบันทึก ÷ จำนวนวันที่ใช้ประเมิน) × 100
                                        </p>
                                    </div>

                                    <div className="fhd-trc-summary">
                                        <div>
                                            <span>วันที่มีการบันทึก</span>
                                            <strong>
                                                {spendMetrics.trc_recorded_days}
                                                {' / '}
                                                {spendMetrics.trc_days_evaluated}
                                                {' วัน'}
                                            </strong>
                                        </div>

                                        <div className="fhd-trc-percentage">
                                            <span>คะแนน Recording Frequency</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    spendMetrics.trc_recording_frequency
                                                )}%
                                            </strong>
                                        </div>
                                    </div>

                                    {/* Recording Distribution */}
                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">
                                            2. Recording Distribution (RD)
                                        </span>
                                        <p>
                                            (จำนวนช่วงที่มีการบันทึก ÷ 4) × 100
                                        </p>
                                    </div>

                                    <div className="fhd-trc-summary">
                                        <div>
                                            <span>ช่วงที่มีการบันทึก</span>
                                            <strong>
                                                {spendMetrics.trc_recorded_periods}
                                                {' / '}
                                                {spendMetrics.trc_total_periods}
                                                {' ช่วง'}
                                            </strong>
                                        </div>

                                        <div className="fhd-trc-percentage">
                                            <span>คะแนน Recording Distribution</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    spendMetrics.trc_recording_distribution
                                                )}%
                                            </strong>
                                        </div>
                                    </div>

                                    {/* TRC Score */}
                                    <div className="fhd-spend-result">
                                        <div className="fhd-spend-result-card">
                                            <span className="fhd-spend-result-label">
                                                คะแนน TRC
                                            </span>

                                            <div className="fhd-spend-result-value">
                                                <strong>
                                                    {formatSpendMoney(spendMetrics.trc_score)}
                                                </strong>
                                                <span>/ 100</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">
                                            สูตรคำนวณคะแนน TRC
                                        </span>
                                        <p>
                                            (คะแนน RF + คะแนน RD) ÷ 2
                                        </p>
                                    </div>

                                    {/* รายละเอียด 4 ช่วงของเดือน */}
                                    <div className="fhd-trc-month-list">
                                        <h3>รายละเอียดการบันทึกในแต่ละช่วง</h3>

                                        {(spendMetrics.trc_periods || []).map((item) => (
                                            <div
                                                className="fhd-trc-month-item"
                                                key={item.period}
                                            >
                                                <div className="fhd-trc-month-name">
                                                    <strong>
                                                        ช่วงที่ {item.period}
                                                    </strong>

                                                    <span>
                                                        วันที่ {item.start_day} - {item.end_day}
                                                    </span>

                                                    {item.recorded_days?.length > 0 && (
                                                        <span>
                                                            วันที่บันทึก: {item.recorded_days.join(', ')}
                                                        </span>
                                                    )}
                                                </div>

                                                <span
                                                    className={`fhd-trc-status ${item.has_records
                                                        ? 'is-complete'
                                                        : 'is-incomplete'
                                                        }`}
                                                >
                                                    {item.has_records
                                                        ? 'มีการบันทึก'
                                                        : 'ไม่มีการบันทึก'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* รายละเอียดรายวัน */}
                                    <div className="fhd-trc-month-list">
                                        <h3>รายละเอียดรายการบันทึกรายวัน</h3>

                                        {(spendMetrics.trc_daily_records || []).length > 0 ? (
                                            spendMetrics.trc_daily_records.map((item) => (
                                                <div
                                                    className="fhd-trc-month-item"
                                                    key={item.date}
                                                >
                                                    <div className="fhd-trc-month-name">
                                                        <strong>
                                                            วันที่ {item.day}
                                                        </strong>

                                                        <span>
                                                            รายรับ {item.income_count} รายการ
                                                            {' · '}
                                                            รายจ่าย {item.expense_count} รายการ
                                                        </span>
                                                    </div>

                                                    <span className="fhd-trc-status is-complete">
                                                        บันทึกแล้ว
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="fhd-spend-message">
                                                ยังไม่มีรายการบันทึกในเดือนนี้
                                            </p>
                                        )}
                                    </div>

                                    <div className="fhd-trc-note">
                                        <strong>หมายเหตุ</strong>
                                        <p>
                                            ระบบนับวันที่มีรายการรายรับหรือรายจ่ายอย่างน้อย 1 รายการ
                                            โดยไม่จำเป็นต้องมีทั้งรายรับและรายจ่ายในวันเดียวกัน
                                            และแบ่งช่วงการประเมินเป็นวันที่ 1–7, 8–14,
                                            15–21 และวันที่ 22 จนถึงวันสุดท้ายของเดือน
                                            สำหรับเดือนปัจจุบัน ระบบจะประเมินเฉพาะวันที่ผ่านไปแล้ว
                                        </p>
                                    </div>
                                </section>

                            </>
                        ) : (
                            <section className="fhd-card">
                                <p className="fhd-spend-message">
                                    ยังไม่มีข้อมูลสำหรับคำนวณ
                                </p>
                            </section>
                        )}
                    </>
                )}

                {criterion.id === 'save' && (
                    <>
                        {saveLoading ? (
                            <section className="fhd-card">
                                <p className="fhd-spend-message">
                                    กำลังคำนวณข้อมูลสุขภาพการเงิน...
                                </p>
                            </section>
                        ) : saveError ? (
                            <section className="fhd-card">
                                <p className="fhd-spend-error" role="alert">
                                    {saveError}
                                </p>
                            </section>
                        ) : saveMetrics ? (
                            <>
                                {/* Saving Rate */}
                                <section className="fhd-card">
                                    <div className="fhd-indicator-heading">
                                        <span className="fhd-indicator-number">
                                            01
                                        </span>

                                        <div>
                                            <h2>อัตราการออม</h2>
                                            <p>Saving Rate (SR)</p>
                                        </div>
                                    </div>

                                    <p className="fhd-spend-description">
                                        วัดสัดส่วนเงินออมสุทธิเมื่อเทียบกับรายได้สุทธิ
                                        ในช่วงเวลาที่ใช้ประเมิน
                                    </p>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">
                                            สูตรคำนวณ
                                        </span>
                                        <p>
                                            (จำนวนเงินออมสุทธิ ÷ รายได้สุทธิ) × 100
                                        </p>
                                    </div>

                                    <div className="fhd-spend-breakdown">
                                        <div className="fhd-spend-row">
                                            <span>ยอดฝากเงิน</span>
                                            <strong>
                                                {formatSpendMoney(saveMetrics.total_deposit)} บาท
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row">
                                            <span>ยอดถอนเงิน</span>
                                            <strong>
                                                {formatSpendMoney(saveMetrics.total_withdraw)} บาท
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row fhd-spend-row-total">
                                            <span>จำนวนเงินออมสุทธิ</span>
                                            <strong>
                                                {formatSpendMoney(saveMetrics.total_saving)} บาท
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row">
                                            <span>รายได้ประจำ</span>
                                            <strong>
                                                {formatSpendMoney(saveMetrics.monthly_income)} บาท/เดือน
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row">
                                            <span>รายได้จากธุรกรรม</span>
                                            <strong>
                                                {formatSpendMoney(saveMetrics.transaction_income)} บาท
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row fhd-spend-row-total">
                                            <span>รายได้สุทธิรวม</span>
                                            <strong>
                                                {formatSpendMoney(saveMetrics.total_income)} บาท
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="fhd-spend-result">
                                        <span>ผลการคำนวณ SR</span>

                                        {saveMetrics.saving_rate == null ? (
                                            <strong className="fhd-spend-no-result">
                                                ยังไม่สามารถคำนวณได้
                                                เนื่องจากไม่มีรายได้สุทธิ
                                            </strong>
                                        ) : (
                                            <div className="fhd-spend-result-value">
                                                <strong>
                                                    {formatSpendMoney(saveMetrics.saving_rate)}
                                                </strong>
                                                <span>%</span>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* Saving Consistency */}
                                <section className="fhd-card">
                                    <div className="fhd-indicator-heading">
                                        <span className="fhd-indicator-number">
                                            02
                                        </span>

                                        <div>
                                            <h2>ความสม่ำเสมอในการออม</h2>
                                            <p>Saving Consistency (SC)</p>
                                        </div>
                                    </div>

                                    <p className="fhd-spend-description">
                                        ตรวจสอบจำนวนเดือนที่มีการออมสุทธิ
                                        ในช่วงเวลาที่ใช้ประเมิน
                                    </p>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">
                                            สูตรคำนวณ
                                        </span>
                                        <p>
                                            (จำนวนเดือนที่มีการออม ÷ จำนวนเดือนที่ใช้ประเมิน) × 100
                                        </p>
                                    </div>

                                    <div className="fhd-trc-summary">
                                        <div>
                                            <span>เดือนที่มีการออม</span>
                                            <strong>
                                                {saveMetrics.sc_months}
                                                {' / '}
                                                {saveMetrics.sc_period_months}
                                                {' เดือน'}
                                            </strong>
                                        </div>

                                        <div className="fhd-trc-percentage">
                                            <span>ผลการคำนวณ SC</span>
                                            <strong>
                                                {formatSpendMoney(saveMetrics.saving_consistency)}%
                                            </strong>
                                        </div>
                                    </div>
                                </section>

                                {/* Monthly Breakdown */}
                                <section className="fhd-card">
                                    <h2>รายละเอียดข้อมูลรายเดือน</h2>

                                    <div className="fhd-trc-month-list">
                                        {saveMonths.map((item) => (
                                            <div
                                                className="fhd-trc-month-item"
                                                key={`${item.year}-${item.month}`}
                                            >
                                                <div className="fhd-trc-month-name">
                                                    <strong>
                                                        {formatThaiMonth(
                                                            item.year,
                                                            item.month
                                                        )}
                                                    </strong>

                                                    <span>
                                                        ฝาก {formatSpendMoney(item.deposit)} บาท
                                                        {' · '}
                                                        ถอน {formatSpendMoney(item.withdraw)} บาท
                                                        {' · '}
                                                        ออมสุทธิ {formatSpendMoney(item.net_saving)} บาท
                                                    </span>
                                                </div>

                                                <span
                                                    className={`fhd-trc-status ${item.net_saving > 0
                                                        ? 'is-complete'
                                                        : 'is-incomplete'
                                                        }`}
                                                >
                                                    {item.net_saving > 0
                                                        ? 'มีการออม'
                                                        : 'ไม่มีการออมสุทธิ'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="fhd-trc-note">
                                        <strong>หมายเหตุ</strong>
                                        <p>
                                            ระบบใช้ข้อมูลย้อนหลัง 3 เดือน รวมเดือนปัจจุบัน
                                            โดยคำนวณจำนวนเงินออมจากยอดฝากหักยอดถอน
                                            และนับเดือนที่มีการออมเมื่อยอดฝากสุทธิมากกว่า 0 บาท
                                        </p>
                                    </div>
                                </section>

                                {/* Save Score */}
                                <section className="fhd-card fhd-spend-total-card">
                                    <h2>คะแนนด้านการออม</h2>

                                    <p>
                                        คะแนนด้านนี้คำนวณจากค่าเฉลี่ยของคะแนน SR และ SC
                                    </p>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">
                                            สูตรคำนวณ
                                        </span>
                                        <p>
                                            (คะแนน SR + คะแนน SC) ÷ 2
                                        </p>
                                    </div>

                                    <p className="fhd-spend-message">
                                        ยังไม่สามารถคำนวณคะแนนเฉลี่ยได้
                                        เนื่องจากยังไม่ได้กำหนดเกณฑ์
                                        แปลงค่า SR และ SC เป็นระดับคะแนน
                                    </p>
                                </section>
                            </>
                        ) : (
                            <section className="fhd-card">
                                <p className="fhd-spend-message">
                                    ยังไม่มีข้อมูลสำหรับคำนวณ
                                </p>
                            </section>
                        )}
                    </>
                )}

                {criterion.id === 'borrow' && (
                    <>
                        {borrowLoading ? (
                            <section className="fhd-card">
                                <p className="fhd-spend-message">
                                    กำลังคำนวณข้อมูลสุขภาพการเงิน...
                                </p>
                            </section>
                        ) : borrowError ? (
                            <section className="fhd-card">
                                <p className="fhd-spend-error" role="alert">
                                    {borrowError}
                                </p>
                            </section>
                        ) : borrowMetrics ? (
                            <>
                                {/* DSR */}
                                <section className="fhd-card fhd-spend-card">
                                    <div className="fhd-indicator-heading">
                                        <span className="fhd-indicator-number">01</span>
                                        <div>
                                            <h2>อัตราส่วนภาระหนี้ต่อรายได้</h2>
                                            <p>Debt Service Ratio (DSR)</p>
                                        </div>
                                    </div>

                                    <p className="fhd-spend-description">
                                        คำนวณจากยอดผ่อนชำระหนี้รายเดือนที่ยังดำเนินการอยู่
                                        เทียบกับรายได้สุทธิรายเดือน
                                        โดยไม่รวมหนี้แบบทยอยชำระ
                                    </p>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">สูตรคำนวณ</span>
                                        <p>
                                            (ยอดผ่อนชำระหนี้รายเดือน ÷ รายได้สุทธิ) × 100
                                        </p>
                                    </div>

                                    <div className="fhd-spend-breakdown">
                                        <div className="fhd-spend-row">
                                            <span>ยอดผ่อนชำระหนี้รายเดือน</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    borrowMetrics.monthly_debt_total
                                                )} บาท
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row">
                                            <span>เงินเดือน</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    borrowMetrics.monthly_income
                                                )} บาท
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row">
                                            <span>รายรับจากธุรกรรม</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    borrowMetrics.transaction_income_total
                                                )} บาท
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row fhd-spend-row-total">
                                            <span>รายได้สุทธิ</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    borrowMetrics.net_monthly_income
                                                )} บาท
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="fhd-spend-result">
                                        <span>ผลการคำนวณ DSR</span>

                                        {borrowMetrics.dsr_percentage == null ? (
                                            <strong className="fhd-spend-no-result">
                                                ยังไม่สามารถคำนวณได้
                                                เนื่องจากรายได้สุทธิเป็นศูนย์
                                            </strong>
                                        ) : (
                                            <div className="fhd-spend-result-value">
                                                <strong>
                                                    {formatSpendMoney(
                                                        borrowMetrics.dsr_percentage
                                                    )}
                                                </strong>
                                                <span>%</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="fhd-trc-note">
                                        <strong>หมายเหตุ</strong>
                                        <p>
                                            ระบบนับเฉพาะหนี้ที่ผู้ใช้เป็นลูกหนี้
                                            และเป็นการผ่อนชำระแบบรายเดือนที่ยังดำเนินการอยู่
                                            ไม่รวมหนี้แบบทยอยชำระและหนี้ที่ชำระครบแล้ว
                                        </p>
                                    </div>
                                </section>

                                {/* ODP */}
                                <section className="fhd-card fhd-spend-card">
                                    <div className="fhd-indicator-heading">
                                        <span className="fhd-indicator-number">02</span>
                                        <div>
                                            <h2>อัตราการชำระหนี้ตรงเวลา</h2>
                                            <p>On-time Debt Payment (ODP)</p>
                                        </div>
                                    </div>

                                    <p className="fhd-spend-description">
                                        คำนวณจากจำนวนงวดหนี้รายเดือนที่ชำระครบภายใน
                                        วันครบกำหนด เทียบกับจำนวนงวดที่ถึงกำหนดทั้งหมด
                                    </p>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">สูตรคำนวณ</span>
                                        <p>
                                            (จำนวนงวดที่ชำระตรงเวลา ÷ จำนวนงวดที่ถึงกำหนด) × 100
                                        </p>
                                    </div>

                                    <div className="fhd-spend-breakdown">
                                        <div className="fhd-spend-row">
                                            <span>งวดที่ชำระตรงเวลา</span>
                                            <strong>
                                                {borrowMetrics.on_time_installments} งวด
                                            </strong>
                                        </div>

                                        <div className="fhd-spend-row">
                                            <span>งวดที่ถึงกำหนดทั้งหมด</span>
                                            <strong>
                                                {borrowMetrics.due_installments} งวด
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="fhd-spend-result">
                                        <span>ผลการคำนวณ ODP</span>

                                        {borrowMetrics.odp_percentage == null ? (
                                            <strong className="fhd-spend-no-result">
                                                ยังไม่มีงวดหนี้รายเดือนที่ถึงกำหนดชำระ
                                            </strong>
                                        ) : (
                                            <div className="fhd-spend-result-value">
                                                <strong>
                                                    {formatSpendMoney(
                                                        borrowMetrics.odp_percentage
                                                    )}
                                                </strong>
                                                <span>%</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="fhd-trc-note">
                                        <strong>หมายเหตุ</strong>
                                        <p>
                                            หนี้ที่ผูกบัญชีเพื่อนจะนับเฉพาะรายการที่ได้รับ
                                            การอนุมัติแล้ว ส่วนหนี้ที่ไม่ได้ผูกบัญชีเพื่อน
                                            จะพิจารณาจากยอดชำระและวันที่ชำระจริง
                                            โดยไม่จำเป็นต้องมีสถานะอนุมัติ
                                            ระบบจะนับการชำระบางส่วนรวมกันภายในงวดเดียวกัน
                                        </p>
                                    </div>
                                </section>

                                {/* Borrow score */}
                                <section className="fhd-card fhd-spend-total-card">
                                    <h2>คะแนนด้านหนี้สิน</h2>
                                    <p>
                                        คะแนนด้านนี้คำนวณจากค่าเฉลี่ยของคะแนน DSR และ ODP
                                    </p>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">สูตรคำนวณ</span>
                                        <p>(คะแนน DSR + คะแนน ODP) ÷ 2</p>
                                    </div>

                                    <p className="fhd-spend-message">
                                        ยังไม่สามารถคำนวณคะแนนเฉลี่ยได้
                                        เนื่องจากยังไม่ได้กำหนดเกณฑ์
                                        แปลงค่า DSR และ ODP เป็นระดับคะแนน
                                    </p>
                                </section>
                            </>
                        ) : (
                            <section className="fhd-card">
                                <p className="fhd-spend-message">
                                    ยังไม่มีข้อมูลสำหรับคำนวณ
                                </p>
                            </section>
                        )}
                    </>
                )}

                <section className="fhd-card">
                    <h2>เป้าหมายการประเมิน</h2>
                    <p>{criterion.target}</p>
                </section>
            </main>

            <Navbar />
        </div>
    );
}

export default FinHealthDetail;
