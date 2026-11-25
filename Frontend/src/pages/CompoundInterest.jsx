import { useState } from "react";
import CalNavbar from "../components/CalNavbar";
import Navbar from "../components/Navbar";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";
import "./CompoundInterest.css";
import "./CalculatorTools.css";

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
const fields = [["pv", "เงินต้นเริ่มต้น (บาท)", "compoundPresentValue"], ["pmt", "เงินฝากเพิ่มต่อเดือน (บาท)", "compoundMonthlyDeposit"], ["rate", "อัตราดอกเบี้ยต่อปี (%)", "compoundRate"], ["inflation", "อัตราเงินเฟ้อต่อปี (%)", "compoundInflation"], ["years", "ระยะเวลาออม (ปี)", "compoundNumberOfPeriods"]];
const format = value => value.toLocaleString("th-TH", {maximumFractionDigits: 2});
function calculate(v) {
const [pv,pmt,rate,inflation,years] = v;
const i = rate / 100 / 12;
const r = inflation / 100;
const future = n => i === 0 ? pv+pmt*n : pv*Math.pow(1+i,n)+pmt*Math.expm1(n*Math.log1p(i))/i;
const N = years*12;
const fv = future(N);
const real = fv/Math.pow(1+r,years);
const labels = Array.from({length:years+1},(_,j)=>`ปีที่ ${j}`);
return {rows:[['เงินต้นเริ่มต้น',pv],['เงินฝากเพิ่มสะสม',pmt*N],['เงินที่ฝากทั้งหมด',pv+pmt*N],['ดอกเบี้ยสะสม',fv-pv-pmt*N],['มูลค่าเงินออมในอนาคต',fv],['มูลค่าเทียบกำลังซื้อปัจจุบัน',real]],labels,series:[{label:'เงินฝากสะสม',data:labels.map((_,j)=>pv+pmt*j*12),borderColor:'#64748b'},{label:'เงินออมรวม',data:labels.map((_,j)=>future(j*12)),borderColor:'#729b27'},{label:'มูลค่าหลังปรับเงินเฟ้อ',data:labels.map((_,j)=>future(j*12)/Math.pow(1+r,j)),borderColor:'#e49b42'}]};
}
export default function CompoundInterest() {
  const [values,setValues] = useState(() => fields.map(([, , key]) => localStorage.getItem(key) ?? ""));
  const [result,setResult] = useState(null);
  const [error,setError] = useState("");
  function submit(e) {
    e.preventDefault();
    const v = values.map(Number);
    if(values.some(x=>x.trim()==="") || !v.every(x=>Number.isFinite(x)&&x>=0)) {setError("กรุณากรอกข้อมูลให้ครบและไม่ติดลบ");setResult(null);return;}
    if(!(Number.isInteger(v[4]) && v[4]>=1 && v[4]<=100 && v[2]<=100 && v[3]<=100)) {setError("ระยะเวลาออมต้องเป็นจำนวนเต็ม 1–100 ปี และอัตราไม่เกิน 100%");setResult(null);return;}
    const next=calculate(v);
    if(!next.rows.every(([,x])=>Number.isFinite(x)) || !next.series.every(s=>s.data.every(Number.isFinite))) {setError("ค่าที่กรอกสูงเกินไป");setResult(null);return;}
    setError("");setResult(next);
  }
  function reset() {fields.forEach(([, ,key])=>localStorage.removeItem(key));setValues(fields.map(()=>""));setResult(null);setError("");}
  return <div className="compound-interest-page">
    <div className="compound-interest-header"><h1 className="compound-interest-title">คำนวณดอกเบี้ยทบต้น</h1></div>
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
        <div className="kc-chart"><Line data={{labels:result.labels,datasets:result.series}} options={{responsive:true,maintainAspectRatio:false}} /></div>
      </section>}
      <p className="kc-note">สมมติฝากเงินปลายเดือน ทบต้นรายเดือน อัตราคงที่ ไม่รวมภาษีและค่าธรรมเนียม ผลตอบแทนไม่รับประกัน</p>
    </main>
    <Navbar />
  </div>;
}
