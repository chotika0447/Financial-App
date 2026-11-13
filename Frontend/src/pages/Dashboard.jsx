
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {Chart as ChartJS,CategoryScale,LinearScale,BarElement,Tooltip,Legend} from "chart.js";
import {Wallet,ArrowDownCircle,ArrowUpCircle,CalendarDays,RefreshCw,PiggyBank} from "lucide-react";

import Navbar from "../components/Navbar";
import "./Dashboard.css";

ChartJS.register(CategoryScale,LinearScale,BarElement,Tooltip,Legend);

const API_ENDPOINTS = [
    "/transactions/",
    "/savings/",
    "/debts/",
];

const getCurrentMonth = () => {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${date.getFullYear()}-${month}`;
};

const getMonthDays = (monthValue) => {
    const [year, month] = monthValue.split("-").map(Number);
    return new Date(year, month, 0).getDate();
};

const toNumber = (value) => Number(value ?? 0);

const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
};

const formatMoney = (value) =>
    new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 2,
    }).format(toNumber(value));

const formatShortMoney = (value) => {
    if (Math.abs(value) >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }

    if (Math.abs(value) >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
    }

    return new Intl.NumberFormat("th-TH", {
        maximumFractionDigits: 0,
    }).format(value);
};

async function fetchAPI(url, token) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (response.status === 401) {
        throw new Error(
            "Session หมดอายุหรือ Token ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่"
        );
    }

    if (!response.ok) {
        throw new Error(`โหลดข้อมูลไม่สำเร็จ (${response.status})`);
    }

    return response.json();
}

function SummaryCard({ icon: Icon, title, value, detail, color }) {
    return (
        <div className={`dashboard-card ${color}`}>
            <div className="dashboard-card-icon">
                <Icon size={26} />
            </div>

            <div className="dashboard-card-content">
                <h3 className="dashboard-card-title">{title}</h3>

                <div className="dashboard-card-value">
                    {formatMoney(value)}
                </div>

                <div className="dashboard-card-detail">{detail}</div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
    const [transactions, setTransactions] = useState([]);
    const [savings, setSavings] = useState([]);
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    // โหลดข้อมูลจาก Django API
    useEffect(() => {
        let cancelled = false;

        async function loadDashboard() {
            setLoading(true);
            setError("");

            const token = sessionStorage.getItem("accessToken");

            if (!token) {
                setError("ไม่พบ Token กรุณาเข้าสู่ระบบใหม่");
                setLoading(false);
                return;
            }

            try {
                const responses = await Promise.all(
                    API_ENDPOINTS.map((endpoint) => fetchAPI(endpoint, token))
                );

                if (cancelled) return;

                const [transactionData, savingsData, debtData] = responses;

                setTransactions(normalizeArray(transactionData));
                setSavings(normalizeArray(savingsData));
                setDebts(normalizeArray(debtData));
            } catch (err) {
                if (cancelled) return;

                setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadDashboard();

        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    // กรองรายการตามเดือนที่เลือก
    const monthlyTransactions = useMemo(() => {
        return transactions.filter((transaction) =>
            String(transaction.transaction_date ?? "").startsWith(
                selectedMonth
            )
        );
    }, [transactions, selectedMonth]);

    // รวมรายรับและรายจ่าย
    const income = monthlyTransactions
        .filter((item) => item.transaction_type === "income")
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

    const expense = monthlyTransactions
        .filter((item) => item.transaction_type === "expense")
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

    const balance = income - expense;

    // รวมยอดเงินออมและเป้าหมายที่ยังดำเนินการ
    const totalSavings = savings.reduce(
        (sum, item) => sum + toNumber(item.balance),
        0
    );

    const activeSavings = savings.filter(
        (item) => item.status === "active"
    );

    const totalTargets = activeSavings.reduce(
        (sum, item) => sum + toNumber(item.target),
        0
    );

    const savingProgress =
        totalTargets > 0
            ? Math.min((totalSavings / totalTargets) * 100, 100)
            : 0;

    // รวมยอดหนี้ที่ยังดำเนินการ
    const activeDebts = debts.filter(
        (item) => item.status === "ongoing"
    );

    const totalBorrowed = activeDebts
        .filter((item) => item.type === "borrowed")
        .reduce(
            (sum, item) => sum + toNumber(item.remaining_amount),
            0
        );

    const totalLent = activeDebts
        .filter((item) => item.type === "lent")
        .reduce(
            (sum, item) => sum + toNumber(item.remaining_amount),
            0
        );

    // เตรียมข้อมูลกราฟรายวัน
    const chartData = useMemo(() => {
        const days = getMonthDays(selectedMonth);
        const labels = Array.from(
            { length: days },
            (_, index) => index + 1
        );

        const incomeByDay = Array(days).fill(0);
        const expenseByDay = Array(days).fill(0);

        monthlyTransactions.forEach((transaction) => {
            const day = Number(
                String(transaction.transaction_date).slice(8, 10)
            );

            if (day < 1 || day > days) return;

            const index = day - 1;
            const amount = toNumber(transaction.amount);

            if (transaction.transaction_type === "income") {
                incomeByDay[index] += amount;
            } else if (transaction.transaction_type === "expense") {
                expenseByDay[index] += amount;
            }
        });

        return {
            labels,
            datasets: [
                {
                    label: "รายรับ",
                    data: incomeByDay,
                    backgroundColor: "#69c9a6",
                    borderRadius: 4,
                },
                {
                    label: "รายจ่าย",
                    data: expenseByDay,
                    backgroundColor: "#ff9292",
                    borderRadius: 4,
                },
            ],
        };
    }, [monthlyTransactions, selectedMonth]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
            mode: "index",
            intersect: false,
        },

        plugins: {
            legend: {
                position: "top",
                align: "end",
                labels: {
                    usePointStyle: true,
                    pointStyle: "circle",
                    boxWidth: 8,
                    padding: 16,
                },
            },

            tooltip: {
                callbacks: {
                    label: (context) =>
                        `${context.dataset.label}: ${formatMoney(context.raw)}`,
                },
            },
        },

        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    autoSkip: true,
                    maxTicksLimit: 10,
                },
                border: {
                    display: false,
                },
            },

            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatShortMoney(value),
                },
                grid: {
                    color: "#eeeeee",
                },
                border: {
                    display: false,
                },
            },
        },
    };

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div>
                    <p className="dashboard-header-title">แดชบอร์ด</p>
                    <h1>Dashboard</h1>
                    <p className="dashboard-header-subtitle">
                        สรุปภาพรวมการเงินของคุณ
                    </p>
                </div>

                <div className="dashboard-header-icon">
                    <Wallet size={26} />
                </div>
            </header>

            <section className="dashboard-filter">
                <div className="dashboard-filter-label">
                    <CalendarDays size={20} />
                    <span>ข้อมูลประจำเดือน</span>
                </div>

                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    aria-label="เลือกเดือน"
                />
            </section>

            {error && (
                <div className="dashboard-error">
                    <p role="alert">{error}</p>
                    <button
                        type="button"
                        onClick={() => setReloadKey((key) => key + 1)}
                    >
                        <RefreshCw size={18} />
                        ลองใหม่
                    </button>
                </div>
            )}

            {loading ? (
                <div className="dashboard-loading">
                    <div className="spinner" />
                    <p>กำลังโหลดข้อมูล...</p>
                </div>
            ) : !error ? (
                <>
                    <section className="dashboard-section">
                        <div className="dashboard-section-header">
                            <h2>สรุปภาพรวม</h2>
                            <span className="dashboard-count">
                                {monthlyTransactions.length} รายการ
                            </span>
                        </div>

                        <div className="dashboard-summary-grid">
                            <SummaryCard
                                icon={ArrowDownCircle}
                                title="รายรับ"
                                value={income}
                                detail="ยอดรวมรายรับในเดือนที่เลือก"
                                color="income-card"
                            />

                            <SummaryCard
                                icon={ArrowUpCircle}
                                title="รายจ่าย"
                                value={expense}
                                detail="ยอดรวมรายจ่ายในเดือนที่เลือก"
                                color="expense-card"
                            />
                        </div>

                        <div className="dashboard-net-card">
                            <div className="dashboard-net-icon">
                                <Wallet size={28} />
                            </div>

                            <div className="dashboard-net-info">
                                <span>รายรับสุทธิ</span>
                                <strong className={balance >= 0 ? "positive" : "negative"}>
                                    {formatMoney(balance)}
                                </strong>
                            </div>
                        </div>
                    </section>

                    <section className="dashboard-chart-card">
                        <div className="dashboard-section-header">
                            <h2>กราฟรายรับ–รายจ่าย</h2>
                            <p>ยอดเงินในแต่ละวันของเดือนที่เลือก</p>
                        </div>

                        {monthlyTransactions.length === 0 ? (
                            <div className="dashboard-empty">
                                <p>ไม่มีข้อมูลธุรกรรมในเดือนนี้</p>
                                <small>
                                    เพิ่มรายการรายรับหรือรายจ่ายเพื่อดูกราฟ
                                </small>
                            </div>
                        ) : (
                            <div className="dashboard-chart-scroll">
                                <div
                                    className="dashboard-chart-inner"
                                    style={{
                                        width: `${Math.max(chartData.labels.length * 35, 320)}px`,
                                    }}
                                >
                                    <Bar data={chartData} options={chartOptions} />
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="dashboard-section">
                        <div className="dashboard-section-header">
                            <h2>สรุปยอดเงินออม</h2>
                            <PiggyBank size={22} />
                        </div>

                        <div className="dashboard-saving-card">
                            <div className="dashboard-saving-top">
                                <p>ยอดเงินออมทั้งหมด</p>
                                <strong>{formatMoney(totalSavings)}</strong>
                            </div>

                            <div className="dashboard-progress-header">
                                <span>ความคืบหน้าในการออมเงิน</span>
                                <strong>{savingProgress.toFixed(1)}%</strong>
                            </div>

                            <div
                                className="dashboard-progress-track"
                                role="progressbar"
                                aria-valuenow={Math.round(savingProgress)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="ความคืบหน้าในการออมเงิน"
                            >
                                <div
                                    className="dashboard-progress-fill"
                                    style={{ width: `${savingProgress}%` }}
                                />
                            </div>

                            <div className="dashboard-saving-bottom">
                                <span>เป้าหมายเงินออมที่ยังดำเนินการ</span>
                                <strong>{formatMoney(totalTargets)}</strong>
                            </div>

                            {savings.length === 0 && (
                                <p className="dashboard-saving-empty">
                                    ไม่มีข้อมูลกระเป๋าเงินออม
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="dashboard-section">
                        <div className="dashboard-section-header">
                            <h2>สรุปยอดหนี้สิน</h2>
                        </div>

                        <div className="dashboard-debt-grid">
                            <div className="dashboard-debt-card borrowed">
                                <div className="dashboard-debt-icon">
                                    <ArrowDownCircle size={28} />
                                </div>
                                <p>ยอดหนี้ที่เรายืม</p>
                                <strong>{formatMoney(totalBorrowed)}</strong>
                                <small>ยอดที่เรายังต้องชำระ</small>
                            </div>

                            <div className="dashboard-debt-card lent">
                                <div className="dashboard-debt-icon">
                                    <ArrowUpCircle size={28} />
                                </div>
                                <p>ยอดเงินที่เราให้ยืม</p>
                                <strong>{formatMoney(totalLent)}</strong>
                                <small>ยอดที่เรารอรับคืน</small>
                            </div>
                        </div>

                        <p className="dashboard-hint">
                            ยอดหนี้แสดงจากรายการที่มีสถานะกำลังดำเนินการ
                        </p>
                    </section>
                </>
            ) : null}

            <Navbar />
        </div>
    );
}