
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CompoundInterest.css';
import CalNavbar from '../components/CalNavbar';
import CompoundInterestChart from '../components/CompoundInterestChart';
import Navbar from '../components/Navbar';

function CompoundInterest() {
  const navigate = useNavigate();

  const [presentValue, setPresentValue] = useState(
    localStorage.getItem('compoundPresentValue') || ''
  );
  const [rate, setRate] = useState(
    localStorage.getItem('compoundRate') || ''
  );
  const [numberOfPeriods, setNumberOfPeriods] = useState(
    localStorage.getItem('compoundNumberOfPeriods') || ''
  );
  const [frequency, setFrequency] = useState(
    localStorage.getItem('compoundFrequency') || ''
  );

  const principal = Number(presentValue);
  const interestRate = Number(rate);
  const years = Number(numberOfPeriods);
  const compoundingFrequency = Number(frequency);

  const validInputs =
    presentValue !== '' &&
    rate !== '' &&
    numberOfPeriods !== '' &&
    frequency !== '' &&
    Number.isFinite(principal) &&
    Number.isFinite(interestRate) &&
    Number.isFinite(years) &&
    Number.isFinite(compoundingFrequency) &&
    principal >= 0 &&
    interestRate >= 0 &&
    years > 0 &&
    compoundingFrequency > 0;

  const futureValue = validInputs
    ? principal *
      Math.pow(
        1 + interestRate / 100 / compoundingFrequency,
        compoundingFrequency * years
      )
    : 0;

  const formatMoney = (amount) =>
    amount.toLocaleString('th-TH', {
      maximumFractionDigits: 2,
    });

  return (
    <div className="compound-interest-page">
      <header className="compound-interest-header">
        <button
          type="button"
          className="compound-interest-back-button"
          onClick={() => navigate('/saving/')}
          aria-label="กลับไปหน้า Wallet"
        >
          ‹
        </button>

        <h1 className="compound-interest-title">
          คำนวณดอกเบี้ยทบต้น
        </h1>
      </header>

      <main className="compound-interest-content">
        <CalNavbar />

        <section className="compound-interest-intro">
          <p>
            คำนวณมูลค่าเงินในอนาคตจากเงินต้น อัตราดอกเบี้ย
            ระยะเวลาลงทุน และความถี่ในการทบต้น
          </p>
        </section>

        <section className="compound-interest-form">
          <div className="compound-interest-field">
            <label
              className="compound-interest-label"
              htmlFor="presentValue"
            >
              เงินต้น (บาท)
            </label>
            <input
              id="presentValue"
              className="compound-interest-input"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="เช่น 10000"
              value={presentValue}
              onChange={(e) => {
                const value = e.target.value;
                setPresentValue(value);
                localStorage.setItem('compoundPresentValue', value);
              }}
            />
          </div>

          <div className="compound-interest-field">
            <label
              className="compound-interest-label"
              htmlFor="numberOfPeriods"
            >
              ระยะเวลา (ปี)
            </label>
            <input
              id="numberOfPeriods"
              className="compound-interest-input"
              type="number"
              min="0.01"
              step="any"
              inputMode="decimal"
              placeholder="เช่น 10"
              value={numberOfPeriods}
              onChange={(e) => {
                const value = e.target.value;
                setNumberOfPeriods(value);
                localStorage.setItem('compoundNumberOfPeriods', value);
              }}
            />
          </div>

          <div className="compound-interest-field">
            <label
              className="compound-interest-label"
              htmlFor="rate"
            >
              อัตราดอกเบี้ยต่อปี (%)
            </label>
            <input
              id="rate"
              className="compound-interest-input"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="เช่น 3.5"
              value={rate}
              onChange={(e) => {
                const value = e.target.value;
                setRate(value);
                localStorage.setItem('compoundRate', value);
              }}
            />
          </div>

          <div className="compound-interest-field">
            <label
              className="compound-interest-label"
              htmlFor="frequency"
            >
              ความถี่ในการทบต้น (ครั้งต่อปี)
            </label>
            <input
              id="frequency"
              className="compound-interest-input"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              placeholder="เช่น 12"
              value={frequency}
              onChange={(e) => {
                const value = e.target.value;
                setFrequency(value);
                localStorage.setItem('compoundFrequency', value);
              }}
            />
            <p className="compound-interest-field-note">
              เช่น 1 = รายปี, 4 = รายไตรมาส, 12 = รายเดือน
            </p>
          </div>
        </section>

        <section className="compound-interest-summary">
          <h2 className="compound-interest-result-title">
            มูลค่าเงินในอนาคต
          </h2>

          <div className="compound-interest-result" aria-live="polite">
            <span className="compound-interest-result-amount">
              {formatMoney(futureValue)}
            </span>
            <span className="compound-interest-result-unit">บาท</span>
          </div>

          {validInputs && (
            <div className="compound-interest-breakdown">
              <div>
                <span>เงินต้น</span>
                <strong>{formatMoney(principal)} บาท</strong>
              </div>
              <div>
                <span>ผลตอบแทนโดยประมาณ</span>
                <strong>
                  {formatMoney(futureValue - principal)} บาท
                </strong>
              </div>
            </div>
          )}
        </section>

        <section className="compound-interest-chart-section">
          <CompoundInterestChart
            presentValue={presentValue}
            rate={rate}
            numberOfPeriods={numberOfPeriods}
            frequency={frequency}
          />
        </section>

        <p className="compound-interest-disclaimer">
          * เป็นการคำนวณโดยสมมติว่าอัตราดอกเบี้ยคงที่
          และยังไม่หักภาษี ค่าธรรมเนียม หรือความผันผวนของผลตอบแทน
        </p>
      </main>

      <Navbar />
    </div>
  );
}

export default CompoundInterest;
