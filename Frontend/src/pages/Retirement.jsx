
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Retirement.css';
import CalNavbar from '../components/CalNavbar';
import RetirementChart from '../components/RetirementChart';
import Navbar from '../components/Navbar';

function Retirement() {
  const navigate = useNavigate();

  const [monthlyExpenses, setMonthlyExpenses] = useState(
    localStorage.getItem('retirementMonthlyExpenses') || ''
  );
  const [retirementAge, setRetirementAge] = useState(
    localStorage.getItem('retirementAge') || ''
  );
  const [yearsInRetirement, setYearsInRetirement] = useState(
    localStorage.getItem('retirementYearsInRetirement') || ''
  );

  const expenses = Number(monthlyExpenses);
  const age = Number(retirementAge);
  const years = Number(yearsInRetirement);

  const retirementMoney =
    monthlyExpenses !== '' && yearsInRetirement !== ''
      ? expenses * 12 * years
      : 0;

  const formatMoney = (amount) =>
    amount.toLocaleString('th-TH', {
      maximumFractionDigits: 2,
    });

  return (
    <div className="retirement-page">
      <header className="retirement-header">
        <button
          type="button"
          className="retirement-back-button"
          onClick={() => navigate('/saving/')}
          aria-label="กลับไปหน้ากระเป๋าเงิน"
        >
          <span className="retirement-back-arrow" aria-hidden="true">
            ←
          </span>
          <span>กลับ</span>
        </button>

        <h1 className="retirement-title">
          คำนวณแผนเกษียณเบื้องต้น
        </h1>
      </header>

      <main className="retirement-content">
        <CalNavbar />

        <section className="retirement-form">
          <div className="retirement-field">
            <label
              className="retirement-label"
              htmlFor="monthlyExpenses"
            >
              ค่าใช้จ่ายต่อเดือนหลังเกษียณ (บาท)
            </label>
            <input
              id="monthlyExpenses"
              className="retirement-input"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="เช่น 20000"
              value={monthlyExpenses}
              onChange={(e) => {
                const value = e.target.value;
                setMonthlyExpenses(value);
                localStorage.setItem(
                  'retirementMonthlyExpenses',
                  value
                );
              }}
            />
          </div>

          <div className="retirement-field">
            <label
              className="retirement-label"
              htmlFor="retirementAge"
            >
              อายุที่เกษียณ (ปี)
            </label>
            <input
              id="retirementAge"
              className="retirement-input"
              type="number"
              min="1"
              max="100"
              inputMode="numeric"
              placeholder="เช่น 60"
              value={retirementAge}
              onChange={(e) => {
                const value = e.target.value;
                setRetirementAge(value);
                localStorage.setItem('retirementAge', value);
              }}
            />
          </div>

          <div className="retirement-field">
            <label
              className="retirement-label"
              htmlFor="yearsInRetirement"
            >
              จำนวนปีที่คาดว่าจะใช้ชีวิตหลังเกษียณ (ปี)
            </label>
            <input
              id="yearsInRetirement"
              className="retirement-input"
              type="number"
              min="1"
              max="100"
              inputMode="numeric"
              placeholder="เช่น 25"
              value={yearsInRetirement}
              onChange={(e) => {
                const value = e.target.value;
                setYearsInRetirement(value);
                localStorage.setItem(
                  'retirementYearsInRetirement',
                  value
                );
              }}
            />
          </div>
        </section>

        <section className="retirement-summary">
          <h2 className="retirement-summary-title">
            เงินเกษียณที่ต้องการ
          </h2>

          <div className="retirement-result" aria-live="polite">
            <span className="retirement-result-amount">
              {formatMoney(retirementMoney)}
            </span>
            <span className="retirement-result-unit">บาท</span>
          </div>

          <p className="retirement-summary-note">
            ประมาณการเงินเก็บสำหรับค่าใช้จ่ายหลังเกษียณ
          </p>
        </section>

        <div className="retirement-chart-section">
          <RetirementChart
            monthlyExpenses={monthlyExpenses}
            yearsInRetirement={yearsInRetirement}
          />
        </div>

        <section className="retirement-explanation">
          <h2>สรุปแผนเกษียณเบื้องต้น</h2>

          {monthlyExpenses !== '' &&
          yearsInRetirement !== '' &&
          expenses >= 0 &&
          years > 0 ? (
            <p>
              คุณควรมีเงินเก็บประมาณ{' '}
              <strong>{formatMoney(retirementMoney)} บาท</strong>{' '}
              ก่อนเกษียณ เพื่อรองรับค่าใช้จ่ายเดือนละ{' '}
              <strong>{formatMoney(expenses)} บาท</strong>{' '}
              เป็นเวลา <strong>{years} ปี</strong>
              {retirementAge !== '' && age > 0
                ? ` โดยมีอายุเกษียณที่ ${age} ปี`
                : ''}
            </p>
          ) : (
            <p>
              กรอกค่าใช้จ่ายต่อเดือนและจำนวนปีหลังเกษียณ
              เพื่อดูประมาณการเงินที่ควรเตรียมไว้
            </p>
          )}

          <p className="retirement-disclaimer">
            * ผลคำนวณนี้เป็นการประมาณการเบื้องต้น
            ยังไม่รวมอัตราเงินเฟ้อ ผลตอบแทนจากการลงทุน
            หรือรายได้อื่นหลังเกษียณ
          </p>
        </section>
      </main>

      <Navbar />
    </div>
  );
}

export default Retirement;
