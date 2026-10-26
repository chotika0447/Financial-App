
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SavingPlan.css';
import CalNavbar from '../components/CalNavbar';
import SavingPlanChart from '../components/SavingPlanChart';
import Navbar from '../components/Navbar';

function SavingPlan() {
  const navigate = useNavigate();

  const [monthlyIncome, setMonthlyIncome] = useState(
    localStorage.getItem('savingPlanMonthlyIncome') || ''
  );

  const income = Number(monthlyIncome);
  const validIncome = monthlyIncome !== '' && Number.isFinite(income) && income >= 0;

  const essentialExpenses = validIncome ? income * 0.5 : 0;
  const personalExpenses = validIncome ? income * 0.3 : 0;
  const savingAndInvestment = validIncome ? income * 0.2 : 0;

  const formatMoney = (amount) =>
    amount.toLocaleString('th-TH', {
      maximumFractionDigits: 2,
    });

  return (
    <div className="saving-plan-page">
      <header className="saving-plan-header">
        <button
          type="button"
          className="saving-plan-back-button"
          onClick={() => navigate('/saving/')}
          aria-label="กลับไปหน้า Wallet"
        >
          ‹
        </button>

        <h1 className="saving-plan-title">
          คำนวณแผนการออมเงิน
        </h1>
      </header>

      <main className="saving-plan-content">
        <CalNavbar />

        <section className="saving-plan-intro">
          <h2 className="saving-plan-subtitle">
            วางแผนการเงินตามทฤษฎี 50/30/20
          </h2>
          <p>
            แบ่งรายได้ต่อเดือนเป็นค่าใช้จ่ายจำเป็น 50%
            ค่าใช้จ่ายส่วนตัว 30% และเงินออมกับการลงทุน 20%
          </p>
        </section>

        <section className="saving-plan-form">
          <label
            className="saving-plan-label"
            htmlFor="monthlyIncome"
          >
            รายรับต่อเดือน (บาท)
          </label>

          <input
            id="monthlyIncome"
            className="saving-plan-input"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            placeholder="กรอกรายรับต่อเดือน"
            value={monthlyIncome}
            onChange={(e) => {
              const value = e.target.value;
              setMonthlyIncome(value);
              localStorage.setItem('savingPlanMonthlyIncome', value);
            }}
          />
        </section>

        <section className="saving-plan-result">
          <h2 className="saving-plan-result-title">
            สัดส่วนการจัดสรรรายรับ
          </h2>

          <div className="saving-plan-result-item">
            <div className="saving-plan-result-heading">
              <span className="saving-plan-dot essential-dot" />
              <h3>50% — ค่าใช้จ่ายจำเป็น</h3>
            </div>
            <strong>{formatMoney(essentialExpenses)} บาท</strong>
            <div className="saving-plan-progress">
              <div
                className="saving-plan-progress-fill essential-fill"
                style={{ width: validIncome ? '50%' : '0%' }}
              />
            </div>
          </div>

          <div className="saving-plan-result-item">
            <div className="saving-plan-result-heading">
              <span className="saving-plan-dot personal-dot" />
              <h3>30% — ค่าใช้จ่ายส่วนตัว</h3>
            </div>
            <strong>{formatMoney(personalExpenses)} บาท</strong>
            <div className="saving-plan-progress">
              <div
                className="saving-plan-progress-fill personal-fill"
                style={{ width: validIncome ? '30%' : '0%' }}
              />
            </div>
          </div>

          <div className="saving-plan-result-item">
            <div className="saving-plan-result-heading">
              <span className="saving-plan-dot saving-dot" />
              <h3>20% — เงินออมและการลงทุน</h3>
            </div>
            <strong>{formatMoney(savingAndInvestment)} บาท</strong>
            <div className="saving-plan-progress">
              <div
                className="saving-plan-progress-fill saving-fill"
                style={{ width: validIncome ? '20%' : '0%' }}
              />
            </div>
          </div>

          <div className="saving-plan-total">
            <span>รายรับรวม</span>
            <strong>
              {formatMoney(validIncome ? income : 0)} บาท
            </strong>
          </div>
        </section>

        <section className="saving-plan-chart-section">
          <SavingPlanChart monthlyIncome={monthlyIncome} />
        </section>
      </main>

      <Navbar />
    </div>
  );
}

export default SavingPlan;
