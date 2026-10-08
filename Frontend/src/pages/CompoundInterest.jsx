import { useState } from "react";
import './CompoundInterest.css'
import CalNavbar from "../components/CalNavbar";
import CompoundInterestChart from "../components/CompoundInterestChart";

function CompoundInterest() {
    const [presentValue, setPresentValue] = useState(localStorage.getItem('compoundPresentValue') || '');
    const [rate, setRate] = useState(localStorage.getItem('compoundRate') || '');
    const [numberOfPeriods, setNumberOfPeriods] = useState(localStorage.getItem('compoundNumberOfPeriods') || '');
    const [frequency, setFrequency] = useState(localStorage.getItem('compoundFrequency') || '');

    let futureValue = 0;
    if(presentValue && rate && numberOfPeriods && frequency) {
        futureValue = Number(presentValue) * Math.pow((1 + (Number(rate) / 100) / Number(frequency)), Number(frequency) * Number(numberOfPeriods));
    }

    return(
        <div className="compound-interest-page">
            <h1 className="compound-interest-title">
                คำนวณดอกเบี้ยทบต้น</h1>

            <CalNavbar />
            
            <label className="compound-interest-label">
                เงินต้น</label>
            <input className="compound-interest-input"
                type="number"
                value={presentValue}
                onChange={(e) => {
                    setPresentValue(e.target.value);
                    localStorage.setItem('compoundPresentValue', e.target.value);
                }}
            />

            <label className="compound-interest-label">
                ระยะเวลา (ปี)</label>
            <input className="compound-interest-input"
                type="number"
                value={numberOfPeriods}
                onChange={(e) => {
                    setNumberOfPeriods(e.target.value);
                    localStorage.setItem('compoundNumberOfPeriods', e.target.value);
                }}
            />

            <label className="compound-interest-label">
                อัตราดอกเบี้ยต่อปี (%)</label>
            <input className="compound-interest-input"
                type="number"
                value={rate}
                onChange={(e) => {
                    setRate(e.target.value);
                    localStorage.setItem('compoundRate', e.target.value);
                }}
            />

            <label className="compound-interest-label">
                ความถี่ในการทบต้น</label>
            <input className="compound-interest-input"
                type="number"
                value={frequency}
                onChange={(e) => {
                    setFrequency(e.target.value);
                    localStorage.setItem('compoundFrequency', e.target.value);
                }}
            />

            <div className="compound-interest-result">
                <h3>มูลค่าเงินในอนาคต: {futureValue.toLocaleString()} บาท</h3>
            </div>

            <CompoundInterestChart
                presentValue={presentValue}
                rate={rate}
                numberOfPeriods={numberOfPeriods}
                frequency={frequency}
            />
        </div>
    );
}
export default CompoundInterest;