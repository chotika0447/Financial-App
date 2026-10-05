import { useState } from "react";
import './Retirement.css'
import CalNavbar from "../components/CalNavbar";
import RetirementChart from "../components/RetirementChart";

function Retirement() {
  const [monthlyExpenses, setMonthlyExpenses] = useState(localStorage.getItem('retirementMonthlyExpenses') || '');
  const [retirementAge, setRetirementAge] = useState(localStorage.getItem('retirementAge') || '');
  const [yearsInRetirement, setYearsInRetirement] = useState(localStorage.getItem('retirementYearsInRetirement') || '');

  let retirementMoney = 0;
  
  if(monthlyExpenses && retirementAge && yearsInRetirement) {
    retirementMoney = Number(monthlyExpenses) * 12 * Number(yearsInRetirement)
  }

  return (
    <div className="retirement-page">

      <h1 className="retirement-title">
        คำนวณแผนเกษียณเบื้องต้น</h1>

      <CalNavbar />

      <label className="retirement-label">
        ค่าใช้จ่ายต่อเดือนหลังเกษียณ (บาท)</label>

      <input
        className="retirement-input"
        type="number"
        value={monthlyExpenses}
        onChange={(e) => {
          setMonthlyExpenses(e.target.value);
          localStorage.setItem('retirementMonthlyExpenses', e.target.value);
        }}
      />

      <label className="retirement-label">
        อายุที่เกษียณ (ปี)</label>

      <input
        className="retirement-input"
        type="number"
        value={retirementAge}
        onChange={(e) => {
          setRetirementAge(e.target.value);
          localStorage.setItem('retirementAge', e.target.value);
        }}
      />

      <label className="retirement-label">
        จำนวนปีที่คาดว่าจะใช้ชีวิตหลังเกษียณ (ปี)</label>

      <input
        className="retirement-input"
        type="number"
        value={yearsInRetirement}
        onChange={(e) => {
          setYearsInRetirement(e.target.value);
          localStorage.setItem('retirementYearsInRetirement', e.target.value);
        }}
      />

      <div className="retirement-label">
        <h3>เงินเกษียณที่ต้องการ</h3> </div>

      <div className="retirement-result">
        {retirementMoney.toLocaleString()} บาท</div>

      <RetirementChart
        monthlyExpenses={monthlyExpenses}
        yearsInRetirement={yearsInRetirement}
      />

      <div className="retirement-explanation">
        <h3>คุณควรมีเงินเก็บประมาณ {retirementMoney.toLocaleString()} บาท ก่อนเกษียณเพื่อรองรับค่าใช้จ่ายเดือนละ {Number(monthlyExpenses).toLocaleString()} บาท เป็นเวลา {Number(yearsInRetirement)} ปี</h3>
      </div>

    </div>
  );
}

export default Retirement;