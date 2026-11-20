
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

function SavingPlanChart({ monthlyIncome }) {
  const income = Number(monthlyIncome);

  if (!Number.isFinite(income) || income <= 0) {
    return null;
  }

  const essentialExpenses = income * 0.5;
  const personalExpenses = income * 0.3;
  const savingAndInvestment = income * 0.2;

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
        borderColor: "white",
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 12,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            return `${context.label}: ${value.toLocaleString()} บาท`;
          }
        }
      }
    }
  };

  return (
    <div className="saving-plan-chart">
      <h3>สัดส่วนแผนการออม</h3>

      <div className="saving-plan-chart-wrapper">
        <Pie data={data} options={options} />
      </div>
    </div>
  );
}

export default SavingPlanChart;
