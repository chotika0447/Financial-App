import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

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

function FinHealthDetail() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [spendMetrics, setSpendMetrics] = useState(null);
    const [spendLoading, setSpendLoading] = useState(false);
    const [spendError, setSpendError] = useState('');

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

    const trcMonths = spendMetrics?.trc_months || [];

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
                                        คำนวณจากรายจ่ายทั้งหมดของเดือน
                                        เปรียบเทียบกับรายได้สุทธิของเดือนนั้น
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
                                        <span>ผลการคำนวณ EIR</span>

                                        {spendMetrics.expense_ratio == null ? (
                                            <strong className="fhd-spend-no-result">
                                                ยังไม่สามารถคำนวณได้
                                                เนื่องจากรายได้สุทธิเป็นศูนย์
                                            </strong>
                                        ) : (
                                            <div className="fhd-spend-result-value">
                                                <strong>
                                                    {formatSpendMoney(
                                                        spendMetrics.expense_ratio
                                                    )}
                                                </strong>
                                                <span>%</span>
                                            </div>
                                        )}
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
                                        ตรวจสอบจำนวนเดือนที่มีการบันทึก
                                        ทั้งรายการรายรับและรายจ่าย
                                    </p>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">
                                            สูตรคำนวณ
                                        </span>
                                        <p>
                                            (จำนวนเดือนที่มีทั้งรายรับและรายจ่าย
                                            ÷ จำนวนเดือนที่ใช้ประเมิน) × 100
                                        </p>
                                    </div>

                                    <div className="fhd-trc-summary">
                                        <div>
                                            <span>เดือนที่บันทึกครบ</span>
                                            <strong>
                                                {spendMetrics.trc_complete_months}
                                                {' / '}
                                                {spendMetrics.trc_period_months}
                                                {' เดือน'}
                                            </strong>
                                        </div>

                                        <div className="fhd-trc-percentage">
                                            <span>ผลการคำนวณ TRC</span>
                                            <strong>
                                                {formatSpendMoney(
                                                    spendMetrics.trc_percentage
                                                )}%
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="fhd-trc-month-list">
                                        <h3>รายละเอียดข้อมูลรายเดือน</h3>

                                        {trcMonths.map((item) => {
                                            const isComplete =
                                                item.has_income &&
                                                item.has_expense;

                                            return (
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
                                                            รายรับ {item.income_count} รายการ
                                                            {' · '}
                                                            รายจ่าย {item.expense_count} รายการ
                                                        </span>
                                                    </div>

                                                    <span
                                                        className={`fhd-trc-status ${
                                                            isComplete
                                                                ? 'is-complete'
                                                                : 'is-incomplete'
                                                        }`}
                                                    >
                                                        {isComplete
                                                            ? 'บันทึกครบ'
                                                            : 'ข้อมูลไม่ครบ'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="fhd-trc-note">
                                        <strong>หมายเหตุ</strong>
                                        <p>
                                            ระบบใช้ข้อมูลย้อนหลัง 3 เดือน
                                            รวมเดือนปัจจุบัน หากมีข้อมูลบันทึก
                                            ไม่ครบทั้ง 3 เดือน คะแนนที่คำนวณได้
                                            อาจไม่สะท้อนพฤติกรรมทางการเงิน
                                            ที่แท้จริง และอาจมีความคลาดเคลื่อน
                                            จากความเป็นจริงได้
                                        </p>
                                    </div>
                                </section>

                                {/* Spend score */}
                                <section className="fhd-card fhd-spend-total-card">
                                    <h2>คะแนนด้านรายรับ–รายจ่าย</h2>
                                    <p>
                                        คะแนนด้านนี้คำนวณจากค่าเฉลี่ยของคะแนน
                                        EIR และ TRC
                                    </p>

                                    <div className="fhd-spend-formula">
                                        <span className="fhd-spend-label">
                                            สูตรคำนวณ
                                        </span>
                                        <p>
                                            (คะแนน EIR + คะแนน TRC) ÷ 2
                                        </p>
                                    </div>

                                    <p className="fhd-spend-message">
                                        ยังไม่สามารถคำนวณคะแนนเฉลี่ยได้
                                        เนื่องจากยังไม่ได้กำหนดเกณฑ์
                                        แปลงค่า EIR และ TRC เป็นระดับคะแนน
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
