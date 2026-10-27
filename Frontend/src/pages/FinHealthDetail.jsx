import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

import Navbar from '../components/Navbar';
import finHealthCriteria from '../data/finHealthCriteria';
import './FinHealthDetail.css';

function FinHealthDetail() {
    const navigate = useNavigate();
    const { id } = useParams();

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
                        <ArrowLeft size={22} />
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
                <button
                    type="button"
                    className="fhd-back-button"
                    onClick={() => navigate('/financial-health')}
                    aria-label="กลับหน้าสุขภาพการเงิน"
                >
                    <ArrowLeft size={22} />
                </button>

                <div className="fhd-heading">
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
                        <span className="fhd-eyebrow">
                            FINANCIAL HEALTH CRITERIA
                        </span>

                        <h1>{criterion.title}</h1>

                        <span className="fhd-weight">
                            น้ำหนักคะแนน {criterion.weight}%
                        </span>
                    </div>
                </div>
            </header>

            <main className="fhd-main">
                <section className="fhd-card">
                    <h2>เกี่ยวกับเกณฑ์นี้</h2>
                    <p>{criterion.description}</p>
                </section>

                <section className="fhd-card">
                    <h2>ตัวชี้วัด</h2>

                    <div className="fhd-indicators">
                        {criterion.indicators.map((indicator) => (
                            <div
                                className="fhd-indicator"
                                key={indicator}
                            >
                                <CheckCircle2
                                    size={20}
                                    color={criterion.color}
                                    aria-hidden="true"
                                />

                                <span>{indicator}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="fhd-card">
                    <h2>สูตรคะแนนของด้านนี้</h2>

                    <div className="fhd-formula">
                        {criterion.formula}
                    </div>

                    <p className="fhd-note">
                        สูตรนี้แสดงตามข้อมูลเกณฑ์ที่กำหนดไว้ในระบบ
                    </p>
                </section>

                <section className="fhd-card">
                    <h2>เป้าหมายการประเมิน</h2>
                    <p>{criterion.target}</p>
                </section>

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

export default FinHealthDetail;