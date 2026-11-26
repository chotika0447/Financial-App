import { useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "../utils/auth";
import CalNavbar from "../components/CalNavbar";
import Navbar from "../components/Navbar";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";
import "./Retirement.css";
import "./CalculatorTools.css";

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);
const fields = [["age", "อายุปัจจุบัน (ปี)", "retirementCurrentAge"], ["retire", "อายุที่ต้องการเกษียณ (ปี)", "retirementAge"], ["life", "อายุขัยที่คาดการณ์ (ปี)", "retirementLifeAge"], ["expense", "ค่าใช้จ่ายต่อเดือนในปัจจุบัน (บาท)", "retirementCurrentExpense"], ["inflation", "อัตราเงินเฟ้อต่อปี (%)", "retirementInflation"]];
const format = value => value.toLocaleString("th-TH", {maximumFractionDigits: 2});
function calculate(v) {
const [age,retire,life,expense,inflation] = v;
const t = retire-age;
const n = life-retire;
const E = expense*Math.pow(1+inflation/100,t);
const target = E*12*n;
const labels = Array.from({length:n+1},(_,j)=>`อายุ ${retire+j}`);
return {rows:[['ระยะเวลาก่อนเกษียณ',t,'ปี'],['ระยะเวลาหลังเกษียณ',n,'ปี'],['ค่าใช้จ่ายต่อเดือน ณ วันเกษียณ',E],['เงินเป้าหมาย ณ วันเกษียณ',target]],labels,series:[{label:'เงินคงเหลือหลังเกษียณ (ประมาณการ)',data:labels.map((_,j)=>Math.max(0,E*12*(n-j))),borderColor:'#729b27'}]};
}
export default function Retirement() {
  const [values,setValues] = useState(() => fields.map(([id, , key], index) => index === 0 ? "" : localStorage.getItem(key) ?? (id === "inflation" ? "3" : "")));
  const [result,setResult] = useState(null);
  const [error,setError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const edited = useRef(false);
  const accessToken = sessionStorage.getItem("accessToken");
  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!accessToken) return;
      try {
        const response = await authenticatedFetch("/users/me/", {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error("Profile request failed");
        const data = await response.json();
        if (!active || edited.current) return;
        const raw = data.age;
        const value = Number(raw);
        if (raw == null || String(raw).trim() === "" || !Number.isFinite(value) || value <= 0 || value > 120 || !Number.isInteger(value)) return;
        setValues(old => old.map((x, index) => index === 0 ? String(raw) : x));

      } catch {
        if (active && !edited.current) setProfileNotice("ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณากรอกข้อมูลด้วยตนเอง");
      }
    }
    loadProfile();
    return () => { active = false; };
  }, [accessToken]);
  function submit(e) {
    e.preventDefault();
    const v = values.map(Number);
    if(values.some(x=>x.trim()==="") || !v.every(x=>Number.isFinite(x)&&x>=0)) {setError("กรุณากรอกข้อมูลให้ครบและไม่ติดลบ");setResult(null);return;}
    if(!(v.slice(0,3).every(Number.isInteger) && v[0]>0 && v[0]<=v[1] && v[1]<v[2] && v[2]<=120 && v[4]<=100)) {setError("อายุต้องเป็นจำนวนเต็ม อายุปัจจุบันไม่เกินอายุเกษียณ และอายุขัยมากกว่าอายุเกษียณ (ไม่เกิน 120 ปี)");setResult(null);return;}
    const next=calculate(v);
    if(!next.rows.every(([,x])=>Number.isFinite(x)) || !next.series.every(s=>s.data.every(Number.isFinite))) {setError("ค่าที่กรอกสูงเกินไป");setResult(null);return;}
    setError("");setResult(next);
  }
  function reset() {edited.current = true;setProfileNotice("");fields.forEach(([, ,key])=>localStorage.removeItem(key));setValues(fields.map(([id]) => id === "inflation" ? "3" : ""));setResult(null);setError("");}
  return <div className="retirement-page">
    <div className="retirement-header"><h1 className="retirement-title">คำนวณแผนเกษียณเบื้องต้น</h1></div>
    <CalNavbar />
    <main className="kc-calculator">
      <form onSubmit={submit} noValidate>
        {fields.map(([id,label,key],index)=><div className="kc-field" key={id}>
          <label htmlFor={id}>{label}</label>
          <input id={id} type="number" min="0" step="any" inputMode="decimal" value={values[index]} onChange={e=>{const value=e.target.value;if(index===0) edited.current=true;setValues(old=>old.map((x,i)=>i===index?value:x));if(index!==0) localStorage.setItem(key,value);setResult(null);setError("");}} />
        </div>)}
        <div className="kc-actions"><button type="submit">คำนวณ</button><button type="button" onClick={reset}>ล้างข้อมูล</button></div>
      </form>
      {profileNotice && <p className="kc-note">{profileNotice}</p>}
      {error && <p role="alert" className="kc-error">{error}</p>}
      {result && <section aria-live="polite" className="kc-results"><h2>ผลการคำนวณ</h2>
        {result.rows.map(([label,value,unit])=><div className="kc-result" key={label}><span>{label}</span><strong>{format(value)} {unit || "บาท"}</strong></div>)}
        <div className="kc-chart"><Line data={{labels:result.labels,datasets:result.series}} options={{responsive:true,maintainAspectRatio:false}} /></div>
      </section>}
      <p className="kc-note">สมมติค่าใช้จ่ายหลังเกษียณคงที่ ณ วันเกษียณ ไม่รวมผลตอบแทนการลงทุนหรือเงินเฟ้อหลังเกษียณ</p>
    </main>
    <Navbar />
  </div>;
}
