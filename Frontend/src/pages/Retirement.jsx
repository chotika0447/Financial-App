
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
	const validExpenses = monthlyExpenses !== '' && Number.isFinite(expenses) && expenses >= 0;
	
	const age = Number(retirementAge);
	const validAge = retirementAge !== '' && Number.isFinite(age) && age > 0 && age <= 100;
	
	const years = Number(yearsInRetirement);
	const validYears = yearsInRetirement !== '' && Number.isFinite(years) && Number.isInteger(years) && years > 0 && years <= 100;

	let retirementMoney = 0;
		if(validExpenses && validAge && validYears) {
			retirementMoney = expenses * 12 * years;
		}

	const formatMoney = (amount) =>
		amount.toLocaleString('th-TH', {
			maximumFractionDigits: 2,
		});
	let explanation = '';
		if (validExpenses && validAge && validYears) {
			explanation = (
			<p>
				คุณควรมีเงินเก็บประมาณ{' '}
				<strong>{formatMoney(retirementMoney)} บาท</strong>{' '}
				ก่อนเกษียณ เพื่อรองรับค่าใช้จ่ายเดือนละ{' '}
				<strong>{formatMoney(expenses)} บาท</strong>{' '}
				เป็นเวลา <strong>{years} ปี</strong>
				โดยมีอายุเกษียณที่ {age} ปี
			</p>
			);
		}else{
			explanation = (
			<p>
			กรอกค่าใช้จ่ายต่อเดือนและจำนวนปีหลังเกษียณ
			เพื่อดูประมาณการเงินที่ควรเตรียมไว้
			</p>
			);
		}
	return (
		<div className="retirement-page">

			<header className="retirement-header">
				<button
					type="button"
					className="retirement-back-button"
					onClick={() => navigate('/saving/')}
					aria-label="กลับไปหน้า Wallet"
				>
					‹
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
							step="1"
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
							step="1"
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
					
					{explanation}

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
