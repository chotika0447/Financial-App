import{ Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function RetirementChart({ monthlyExpenses, yearsInRetirement }) {
    const years = Number(yearsInRetirement);
    const monthly = Number(monthlyExpenses);

    const labels = []; 
    const moneyData = []; 

    for (let year = 1; year <= years; year++) { 
 
    labels.push(`ปีที่ ${year}`); 
 
    const money = monthly * 12 * year; 
 
    moneyData.push(money); 
  } 
 
  const data = { 
    labels: labels, 
 
    datasets: [ 
      { 
        label: 'เงินที่ต้องใช้สะสม', 
        data: moneyData, 
        tension: 0.3,
        backgroundColor: 'rgb(183, 241, 241)',
      } 
    ] 
  }; 
 
  const options = { 
    responsive: true, 
 
    plugins: { 
      legend: { 
        display: true 
      }, 
 
      tooltip: { 
        callbacks: { 
          label: function(context) { 
            return `${context.parsed.y.toLocaleString()} บาท`; 
          } 
        } 
      } 
    }, 
 
    scales: { 
      y: { 
        ticks: { 
          callback: function(value) { 
            return value.toLocaleString() + ' บาท'; 
          } 
        } 
      } 
    } 
  }; 
 
  if (!monthly || !years) { 
    return null; 
  } 
 
  return ( 
    <div className="retirement-chart"> 
 
      <h3>ประมาณการเงินที่ต้องใช้หลังเกษียณ</h3> 
 
      <Line 
        data={data} 
        options={options} 
      /> 
 
    </div> 
  ); 
}
export default RetirementChart;