import { useState } from "react";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import { Line } from "react-chartjs-2";
import CalNavbar from "../components/CalNavbar";
import Navbar from "../components/Navbar";
import "./CompoundInterest.css";
import "./CalculatorTools.css";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);
const fields = [
  ["principal", "เงินต้นเริ่มต้น (บาท)", "compoundPresentValue", ""],
  ["monthly", "เงินฝากเพิ่มต่อเดือน (บาท)", "compoundMonthlyDeposit", "0"],
  ["rate", "อัตราดอกเบี้ยต่อปี (%)", "compoundRate", ""],
  ["years", "ระยะเวลาการออม (ปี)", "compoundNumberOfPeriods", ""],
  ["inflation", "อัตราเงินเฟ้อต่อปี (%)", "compoundInflation", "3"],
  ["frequency", "ความถี่ในการทบต้น", "compoundFrequency", "12"],
  ["timing", "ช่วงเวลาการฝากเงิน", "compoundTiming", "end"],
];
const frequencies = [["12", "รายเดือน"], ["4", "รายไตรมาส"], ["2", "รายครึ่งปี"], ["1", "รายปี"]];
const money = n => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = n => `${(n * 100).toFixed(2)}%`;
function initialValues(saved = true) {
  const values = Object.fromEntries(fields.map(([id, , key, fallback]) => [id, (saved ? localStorage.getItem(key) : null) ?? fallback]));
  if (!frequencies.some(([value]) => value === values.frequency)) values.frequency = "12";
  if (!["start", "end"].includes(values.timing)) values.timing = "end";
  return values;
}

// Calccents-style model: group monthly contributions into each compounding period.
export function calculateCompoundInterest(values) {
  const { principal, monthly, rate, years, inflation, frequency, timing } = values;
  const P = Number(principal), C = Number(monthly), R = Number(rate) / 100;
  const t = Number(years), pi = Number(inflation) / 100, m = Number(frequency);
  const r = R / m, n = m * t, PMT = C * 12 / m;
  const EAR = Math.expm1(m * Math.log1p(r));
  const realRate = (1 + EAR) / (1 + pi) - 1;
  let balance = P;
  const rows = [{ year: 0, balance: P, contributed: P, interest: 0, real: P }];
  for (let k = 1; k <= n; k++) {
    balance = timing === "start" ? (balance + PMT) * (1 + r) : balance * (1 + r) + PMT;
    if (k % m === 0) {
      const year = k / m;
      const contributed = P + C * 12 * year;
      rows.push({ year, balance, contributed, interest: balance - contributed, real: balance / Math.pow(1 + pi, year) });
    }
  }
  return { ...rows[rows.length - 1], EAR, realRate, rows };
}

export default function CompoundInterest() {
  const [values, setValues] = useState(() => initialValues());
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  function change(id, key, value) {
    setValues(old => ({ ...old, [id]: value }));
    localStorage.setItem(key, value);
    setResult(null); setError("");
  }
  function submit(event) {
    event.preventDefault();
    const numeric = ["principal", "monthly", "rate", "years", "inflation"];
    if (numeric.some(id => values[id].trim() === "" || !Number.isFinite(Number(values[id])) || Number(values[id]) < 0)) {
      setError("กรุณากรอกข้อมูลให้ครบและไม่ติดลบ"); setResult(null); return;
    }
    const years = Number(values.years);
    if (!Number.isInteger(years) || years < 1 || years > 100 || Number(values.rate) > 100 || Number(values.inflation) > 100) {
      setError("ระยะเวลาออมต้องเป็นจำนวนเต็ม 1–100 ปี และอัตราดอกเบี้ยและเงินเฟ้อต้องไม่เกิน 100%"); setResult(null); return;
    }
    const next = calculateCompoundInterest(values);
    if (!next.rows.every(row => Object.values(row).every(Number.isFinite))) {
      setError("ข้อมูลมีค่าสูงเกินไป"); setResult(null); return;
    }
    setError(""); setResult(next);
  }
  function reset() {
    fields.forEach(([, , key]) => localStorage.removeItem(key));
    setValues(initialValues(false)); setResult(null); setError("");
  }
  const chartData = result && {
    labels: result.rows.map(row => `ปีที่ ${row.year}`),
    datasets: [
      { label: "เงินฝากสะสม", data: result.rows.map(row => row.contributed), borderColor: "#5797ad", pointRadius: 2 },
      { label: "เงินออมรวม", data: result.rows.map(row => row.balance), borderColor: "#719c34", backgroundColor: "rgba(113,156,52,.16)", fill: "-1", pointRadius: 2 },
      { label: "หลังปรับเงินเฟ้อ", data: result.rows.map(row => row.real), borderColor: "#d39137", pointRadius: 2 },
    ],
  };
  return (
    <div className="compound-interest-page">
      <header className="compound-interest-header"><h1 className="compound-interest-title">คำนวณดอกเบี้ยทบต้น</h1></header>
      <CalNavbar />
      <main className="ci-content">
        <form className="ci-card" onSubmit={submit} noValidate>
          <h2>ข้อมูลสำหรับการคำนวณ</h2>
          <div className="ci-fields">
            {fields.map(([id, label, key]) => (
              <div className="ci-field" key={id}>
                <label htmlFor={`ci-${id}`}>{label}</label>
                {id === "frequency" || id === "timing" ? (
                  <select id={`ci-${id}`} value={values[id]} onChange={e => change(id, key, e.target.value)}>
                    {(id === "frequency" ? frequencies : [["start", "ต้นงวด"], ["end", "สิ้นงวด"]]).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                  </select>
                ) : <input id={`ci-${id}`} type="number" min={id === "years" ? 1 : 0} step={id === "years" ? 1 : "any"} inputMode="decimal" value={values[id]} onChange={e => change(id, key, e.target.value)} />}
              </div>
            ))}
          </div>
          <p className="ci-note">เงินฝากรายเดือนจะรวมเป็นเงินฝากต่องวดทบต้นตามความถี่ที่เลือก</p>
          {error && <p className="ci-error" role="alert">{error}</p>}
          <div className="kc-actions"><button type="submit">คำนวณ</button><button type="button" onClick={reset}>ล้างข้อมูล</button></div>
        </form>
        {result && <>
          <section className="ci-card" aria-live="polite">
            <h2>ผลการคำนวณ</h2>
            <div className="ci-total"><span>มูลค่าเงินออมรวมในอนาคต</span><strong>{money(result.balance)} บาท</strong></div>
            <div className="ci-results">
              {[["เงินฝากสะสมทั้งหมด", money(result.contributed) + " บาท"], ["ดอกเบี้ยสะสมทั้งหมด", money(result.interest) + " บาท"], ["มูลค่าเทียบกำลังซื้อปัจจุบัน", money(result.real) + " บาท"], ["อัตราดอกเบี้ยรายปีที่แท้จริง (EAR)", percent(result.EAR)], ["ผลตอบแทนรายปีหลังปรับเงินเฟ้อ", percent(result.realRate)], ["ระยะเวลาการออม", `${result.year} ปี`]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </section>
          <section className="ci-card"><h2>การเติบโตของเงินออม</h2><div className="ci-chart"><Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, scales: { y: { beginAtZero: true } } }} /></div></section>
          <section className="ci-card"><h2>ตารางผลลัพธ์รายปี</h2><div className="ci-table-wrap"><table><thead><tr>{["ปี", "เงินออมรวม", "เงินฝากสะสม", "ดอกเบี้ยสะสม", "หลังปรับเงินเฟ้อ"].map(text => <th key={text}>{text}</th>)}</tr></thead><tbody>{result.rows.slice(1).map(row => <tr key={row.year}><td>{row.year}</td>{[row.balance, row.contributed, row.interest, row.real].map((value, index) => <td key={index}>{money(value)}</td>)}</tr>)}</tbody></table></div><p className="ci-note">หน่วย: บาท</p></section>
          <p className="ci-note">ผลลัพธ์เป็นการประมาณการโดยใช้อัตราดอกเบี้ยและเงินเฟ้อคงที่ ไม่รวมภาษีและค่าธรรมเนียม</p>
        </>}
      </main>
      <Navbar />
    </div>
  );
}
