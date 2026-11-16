import{ Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function CompoundInterestChart({ presentValue, rate, numberOfPeriods, frequency }) {
    const present = Number(presentValue);
    const interestRate = Number(rate);
    const periods = Number(numberOfPeriods);
    const compoundingFrequency = Number(frequency);

    if (!present || !interestRate || !periods || !compoundingFrequency) { 
        return null; 
    } 

    const labels = []; 
    const moneyData = []; 

    for (let year = 1; year <= periods; year++) { 
 
    labels.push(`ปีที่ ${year}`); 
 
    const money = present * Math.pow(1 + ((interestRate / 100) / compoundingFrequency), compoundingFrequency * year); 
    moneyData.push(money);
    } 
 
    const data = { 
        labels: labels, 
    
        datasets: [ 
        { 
            label: 'เงินในอนาคต', 
            data: moneyData, 
            tension: 0.3,
            backgroundColor: 'rgb(255, 157, 216)',
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
    
    return ( 
        <div className="compound-interest-chart"> 
    
        <h3>คำนวณดอกเบี้ยทบต้น</h3> 
    
        <Line 
            data={data} 
            options={options} 
        /> 
    
        </div> 
    );
}
export default CompoundInterestChart;