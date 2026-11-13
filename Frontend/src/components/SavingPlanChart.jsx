import {Chart as ChartJS, ArcElement, Tooltip, Legend} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

function SavingPlanChart({ monthlyIncome }) {
    const income = Number(monthlyIncome);
    if (!income) {
        return null;
    }
    const essentialExpenses = Number(monthlyIncome) * 0.5;
    const personalExpenses = Number(monthlyIncome) * 0.3;
    const savingAndInvestment = Number(monthlyIncome) * 0.2;
    const data = {
      labels: [
        "ค่าใช้จ่ายจำเป็น 50%",
        "ค่าใช้จ่ายส่วนตัว 30%",
        "เงินออมและลงทุน 20%"
      ],

      datasets: [
        {
          data: [
            essentialExpenses,
            personalExpenses,
            savingAndInvestment
          ],
          backgroundColor: [
            "rgb(162, 249, 255)",
            "rgb(255, 208, 208)",
            "rgb(255, 239, 198)"
          ],
          borderColor: 'white',
          borderWidth: 1
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom"
        }
      },
      tooltips: {
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            return `${value.toLocaleString()} บาท`;
          }
        }
      }
    };

    return (
      <div className="saving-plan-chart">

        <h3>สัดส่วนแผนการออม</h3>

        <Pie data={data}
        options={options}
        />

      </div>
    );
}

export default SavingPlanChart;