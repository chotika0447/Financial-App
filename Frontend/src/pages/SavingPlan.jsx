import { useState } from "react";
import './SavingPlan.css'
import CalNavbar from "../components/CalNavbar";
import SavingPlanChart from "../components/SavingPlanChart";
import CustomHeader from '../components/CustomHeader';
import Navbar from '../components/Navbar';

function SavingPlan() {
    const [monthlyIncome, setMonthlyIncome] = useState(localStorage.getItem('savingPlanMonthlyIncome') || '');

    let essentialExpenses = 0;
    let personalExpenses = 0;
    let savingAndInvestment = 0;

    if(monthlyIncome) {
        essentialExpenses = Number(monthlyIncome) * 0.5;
        personalExpenses = Number(monthlyIncome) * 0.3;
        savingAndInvestment = Number(monthlyIncome) * 0.2;
    }

    return (
        <div className="saving-plan-page">
            {/* <CustomHeader title="กระเป๋าเงินออม" color="var(--color-saving)" /> */}
            <h1 className="saving-plan-title">
                คำนวณแผนการออมเงิน</h1>
            <CalNavbar />

            <h2 className="saving-plan-subtitle">
                คำนวณแผนการออม ตามทฤษฎีจัดสรรงบประมาณ 50/30/20 โดยแบ่งรายได้ต่อเดือนออกเป็น 3 ส่วน คือ ค่าใช้จ่ายจำเป็น 50% ค่าใช้จ่ายส่วนตัว 30% และเงินออมและการลงทุน 20%</h2>

            <label className="saving-plan-label">
                รายรับ</label>

            <input
                className="saving-plan-input"
                type="number"
                value={monthlyIncome}
                onChange={(e) => {
                    setMonthlyIncome(e.target.value);
                    localStorage.setItem('savingPlanMonthlyIncome', e.target.value);
                }}
            />
            <div className="saving-plan-result">
                <h3>50% - ค่าใช้จ่ายจำเป็น: {essentialExpenses.toLocaleString()} บาท</h3>
                <h3>30% - ค่าใช้จ่ายส่วนตัว: {personalExpenses.toLocaleString()} บาท</h3>
                <h3>20% - เงินออมและการลงทุน: {savingAndInvestment.toLocaleString()} บาท</h3>
            </div>
            <SavingPlanChart
                monthlyIncome={monthlyIncome}
            />

            <Navbar />
        </div>
    );
}
export default SavingPlan;