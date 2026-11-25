import { useState } from "react";
import CalNavbar from "../components/CalNavbar";
import Navbar from "../components/Navbar";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import "./SavingPlan.css";
import "./CalculatorTools.css";

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
const fields = [["income", "รายรับต่อเดือน (บาท)", "savingPlanMonthlyIncome"]];
const format = value => value.toLocaleString("th-TH", {maximumFractionDigits: 2});
function calculate(v) {
const income = v[0];
return { rows: [['ค่าใช้จ่ายจำเป็น (50%)',income*.5],['ค่าใช้จ่ายเพื่อความต้องการ (30%)',income*.3],['เงินออม / การชำระหนี้ (20%)',income*.2]], labels:['จำเป็น','ความต้องการ','ออม / ชำระหนี้'], series:[{label:'การจัดสรรรายได้',data:[income*.5,income*.3,income*.2],backgroundColor:['#A2F9FF','#FFD0D0','#FFEFC6']}] };
}
export default function SavingPlan() {
  const [values,setValues] = useState(() => fields.map(([, , key]) => localStorage.getItem(key) ?? ""));
  const [result,setResult] = useState(null);
  const [error,setError] = useState("");
  function submit(e) {
    e.preventDefault();
    const v = values.map(Number);
    if(values.some(x=>x.trim()==="") || !v.every(x=>Number.isFinite(x)&&x>=0)) {setError("กรุณากรอกข้อมูลให้ครบและไม่ติดลบ");setResult(null);return;}
    if(!(v[0] > 0)) {setError("รายรับควรมากกว่า 0");setResult(null);return;}
    const next=calculate(v);
    if(!next.rows.every(([,x])=>Number.isFinite(x)) || !next.series.every(s=>s.data.every(Number.isFinite))) {setError("ค่าที่กรอกสูงเกินไป");setResult(null);return;}
    setError("");setResult(next);
  }
  function reset() {fields.forEach(([, ,key])=>localStorage.removeItem(key));setValues(fields.map(()=>""));setResult(null);setError("");}
  return <div className="saving-plan-page">
    <div className="saving-plan-header"><h1 className="saving-plan-title">คำนวณแผนการออมเงิน</h1></div>
    <CalNavbar />
    <main className="kc-calculator">
      <form onSubmit={submit} noValidate>
        {fields.map(([id,label,key],index)=><div className="kc-field" key={id}>
          <label htmlFor={id}>{label}</label>
          <input id={id} type="number" min="0" step="any" inputMode="decimal" value={values[index]} onChange={e=>{const value=e.target.value;setValues(old=>old.map((x,i)=>i===index?value:x));localStorage.setItem(key,value);setResult(null);setError("");}} />
        </div>)}
        <div className="kc-actions"><button type="submit">คำนวณ</button><button type="button" onClick={reset}>ล้างข้อมูล</button></div>
      </form>
      {error && <p role="alert" className="kc-error">{error}</p>}
      {result && <section aria-live="polite" className="kc-results"><h2>ผลการคำนวณ</h2>
        {result.rows.map(([label,value,unit])=><div className="kc-result" key={label}><span>{label}</span><strong>{format(value)} {unit || "บาท"}</strong></div>)}
        <div className="kc-chart"><Pie data={{labels:result.labels,datasets:result.series}} options={{responsive:true,maintainAspectRatio:false}} /></div>
      </section>}
      <p className="kc-note">ผลลัพธ์เป็นแนวทางการจัดสรรรายได้ ไม่ใช่ข้อบังคับในการใช้จ่าย</p>
    </main>
    <Navbar />
  </div>;
}
