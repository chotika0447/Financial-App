import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Trash2 } from 'lucide-react';

import Navbar from '../components/Navbar';
import finHealthCriteria from '../data/finHealthCriteria';
import './FinHealthDetail.css';

const PLAN_ANSWERS_KEY = 'financialHealthPlanAnswers';
const PLAN_ANSWERS_EVENT = 'financialHealthPlanAnswersChanged';
const PLAN_QUESTIONS = [
    {
        id: 'q7',
        number: '7',
        title:
            'เมื่อคิดถึงประกันทุกประเภทที่คุณและสมาชิกในครัวเรือนมีอยู่ในปัจจุบัน คุณมั่นใจเพียงใดว่ากรมธรรม์ประกันเหล่านั้นจะให้ความคุ้มครองเพียงพอเมื่อเกิดเหตุฉุกเฉิน?',
        description:
            'ตัวอย่างเช่น ประกันสุขภาพ ประกันรถยนต์หรือยานพาหนะ ประกันบ้านหรือทรัพย์สิน ประกันชีวิต และประกันทุพพลภาพ',
        options: [
            { value: '100', label: 'มั่นใจมากที่สุด' },
            { value: '75', label: 'มั่นใจค่อนข้างมาก' },
            { value: '50', label: 'มั่นใจปานกลาง' },
            { value: '25', label: 'มั่นใจเล็กน้อย' },
            { value: '10', label: 'ไม่มั่นใจเลย' },
            { value: '0', label: 'ไม่มีสมาชิกในครัวเรือนคนใดมีประกัน' },
        ],
    },
    {
        id: 'q8',
        number: '8',
        title:
            'คุณเห็นด้วยหรือไม่เห็นด้วยกับข้อความต่อไปนี้มากน้อยเพียงใด?',
        statement:
            '“ครัวเรือนของฉันมีการวางแผนทางการเงินไว้ล่วงหน้า”',
        options: [
            { value: '100', label: 'เห็นด้วยอย่างยิ่ง' },
            { value: '65', label: 'เห็นด้วย' },
            { value: '35', label: 'ไม่เห็นด้วยหรือไม่เห็นด้วยก็ไม่ใช่' },
            { value: '15', label: 'ไม่เห็นด้วย' },
            { value: '0', label: 'ไม่เห็นด้วยอย่างยิ่ง' },
        ],
    },
];

function calculatePlanAverage(answers) {
    if (!answers.q7 || !answers.q8) {
        return null;
    }

    return (
        (Number(answers.q7) + Number(answers.q8)) / 2
    );
}

function FinHealthDetail() {
    const navigate = useNavigate();

    const [spendMetrics, setSpendMetrics] = useState(null);
    const [spendLoading, setSpendLoading] = useState(false);
    const [spendError, setSpendError] = useState('');

    const { id } = useParams();
    const [planAnswers, setPlanAnswers] = useState({ q7: '', q8: '' });
    const planAverage = calculatePlanAverage(planAnswers);

    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (id !== 'plan') return;

        try {
            const saved = localStorage.getItem(PLAN_ANSWERS_KEY);

            if (saved) {
                const parsed = JSON.parse(saved);

                setPlanAnswers({
                    q7: parsed.q7 ?? '',
                    q8: parsed.q8 ?? '',
                });
            } else {
                setPlanAnswers({ q7: '', q8: '' });
            }
        } catch {
            setPlanAnswers({ q7: '', q8: '' });
            setSaveError('ไม่สามารถอ่านข้อมูลแบบประเมินที่บันทึกไว้ได้');
        }
    }, [id]);

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
                        'ไม่สามารถโหลดข้อมูลการใช้จ่ายได้'
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

    function handlePlanAnswerChange(questionId, value) {
        const updatedAnswers = {
            ...planAnswers,
            [questionId]: value,
        };

        setPlanAnswers(updatedAnswers);
        setSaveError('');

        try {
            localStorage.setItem(
                PLAN_ANSWERS_KEY,
                JSON.stringify(updatedAnswers)
            );

            window.dispatchEvent(
                new Event(PLAN_ANSWERS_EVENT)
            );
        } catch {
            setSaveError('บันทึกคำตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        }
    }

    function handleClearPlanAnswers() {
        try {
            localStorage.removeItem(PLAN_ANSWERS_KEY);
            setPlanAnswers({ q7: '', q8: '' });
            setSaveError('');

            window.dispatchEvent(
                new Event(PLAN_ANSWERS_EVENT)
            );
        } catch {
            setSaveError('ล้างคำตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        }
    }

    const formatSpendMoney = (value) => {
        return Number(value || 0).toLocaleString('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

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
                
                {/* เลือกมาแท็บหน้าการใช้จ่าย */}
                {criterion.id === 'spend' && (
                    <section className="fhd-card fhd-spend-card">
                        <h2>อัตราค่าใช้จ่ายต่อรายได้</h2>

                        <p className="fhd-spend-description">
                            คำนวณจากรายการรายรับและรายจ่ายของเดือนปัจจุบัน
                            รวมกับรายได้ประจำเดือนที่ระบุไว้ในข้อมูลส่วนตัว
                        </p>

                        <div className="fhd-spend-formula">
                            <span className="fhd-spend-label">สูตร</span>
                            <p>
                                อัตราค่าใช้จ่ายต่อรายได้ =
                                (ค่าใช้จ่ายทั้งหมดต่อเดือน ÷ รายได้สุทธิต่อเดือน) × 100
                            </p>
                        </div>

                        {spendLoading ? (
                            <p className="fhd-spend-message">
                                กำลังคำนวณข้อมูลการใช้จ่าย...
                            </p>
                        ) : spendError ? (
                            <p className="fhd-spend-error" role="alert">
                                {spendError}
                            </p>
                        ) : spendMetrics ? (
                            <>
                                <div className="fhd-spend-period">
                                    ข้อมูลเดือน {spendMetrics.month}/{spendMetrics.year + 543}
                                </div>

                                <div className="fhd-spend-breakdown">
                                    <div className="fhd-spend-row">
                                        <span>ค่าใช้จ่ายทั้งหมดต่อเดือน</span>
                                        <strong>
                                            {formatSpendMoney(spendMetrics.expense_total)} บาท
                                        </strong>
                                    </div>

                                    <div className="fhd-spend-row">
                                        <span>รายได้ประจำเดือนจากข้อมูลส่วนตัว</span>
                                        <strong>
                                            {formatSpendMoney(spendMetrics.monthly_income)} บาท
                                        </strong>
                                    </div>

                                    <div className="fhd-spend-row">
                                        <span>รายรับจากธุรกรรมเดือนนี้</span>
                                        <strong>
                                            {formatSpendMoney(
                                                spendMetrics.transaction_income_total
                                            )} บาท
                                        </strong>
                                    </div>

                                    <div className="fhd-spend-row fhd-spend-row-total">
                                        <span>รายได้สุทธิต่อเดือน</span>
                                        <strong>
                                            {formatSpendMoney(
                                                spendMetrics.net_monthly_income
                                            )} บาท
                                        </strong>
                                    </div>
                                </div>

                                <div className="fhd-spend-result">
                                    <span>ผลการคำนวณ</span>

                                    {spendMetrics.expense_ratio === null ? (
                                        <strong className="fhd-spend-no-result">
                                            ยังไม่สามารถคำนวณได้ เนื่องจากรายได้รวมเป็นศูนย์
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
                            </>
                        ) : (
                            <p className="fhd-spend-message">
                                ยังไม่มีข้อมูลสำหรับคำนวณ
                            </p>
                        )}
                    </section>
                )}

                {criterion.id === 'plan' && (
                    <section className="fhd-card fhd-survey-card">
                        <div className="fhd-survey-heading">
                            <div>
                                <h2>แบบประเมินการวางแผนและการคุ้มครอง</h2>
                                <p className="fhd-survey-description">
                                    โปรดเลือกคำตอบที่ตรงกับสถานการณ์ของคุณมากที่สุด
                                    คุณสามารถกลับมาแก้ไขหรือล้างคำตอบได้ตลอดเวลา
                                </p>
                            </div>

                            <button
                                type="button"
                                className="fhd-clear-button fhd-clear-button-top"
                                onClick={handleClearPlanAnswers}
                                disabled={!planAnswers.q7 && !planAnswers.q8}
                                aria-label="ล้างคำตอบแบบประเมินทั้งหมด"
                                title="ล้างคำตอบทั้งหมด"
                            >
                                <Trash2 size={16} />
                                <span>ล้างคำตอบ</span>
                            </button>
                        </div>

                        {PLAN_QUESTIONS.map((question) => (
                            <fieldset
                                className="fhd-question"
                                key={question.id}
                            >
                                <legend className="fhd-question-title">
                                    <span className="fhd-question-number">
                                        {question.number}
                                    </span>
                                    <span>{question.title}</span>
                                </legend>

                                {question.description && (
                                    <p className="fhd-question-description">
                                        {question.description}
                                    </p>
                                )}

                                {question.statement && (
                                    <p className="fhd-question-statement">
                                        {question.statement}
                                    </p>
                                )}

                                <div className="fhd-answer-options">
                                    {question.options.map((option) => (
                                        <label
                                            className={`fhd-answer-option ${planAnswers[question.id] === option.value
                                                ? 'is-selected'
                                                : ''
                                                }`}
                                            key={option.value}
                                        >
                                            <input
                                                type="radio"
                                                name={question.id}
                                                value={option.value}
                                                checked={
                                                    planAnswers[question.id] === option.value
                                                }
                                                onChange={() =>
                                                    handlePlanAnswerChange(
                                                        question.id,
                                                        option.value
                                                    )
                                                }
                                            />

                                            <span className="fhd-radio-indicator" />

                                            <span className="fhd-answer-label">
                                                {option.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        ))}

                        {saveError && (
                            <p className="fhd-survey-error" role="alert">
                                {saveError}
                            </p>
                        )}

                        <div className="fhd-survey-footer">
                            <div className="fhd-survey-status">
                                {planAnswers.q7 && planAnswers.q8
                                    ? 'ตอบแบบประเมินครบแล้ว'
                                    : 'โปรดตอบคำถามให้ครบทั้ง 2 ข้อเพื่อคำนวณคะแนนเฉลี่ย'}
                            </div>

                            <div className="fhd-average-score">
                                <span className="fhd-average-score-label">
                                    คะแนนเฉลี่ยด้านการวางแผนและการคุ้มครอง
                                </span>

                                <div className="fhd-average-score-value">
                                    <strong>
                                        {planAverage === null
                                            ? '—'
                                            : Number(planAverage.toFixed(2))}
                                    </strong>
                                    <span>/ 100 คะแนน</span>
                                </div>
                            </div>
                        </div>
                    </section>
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