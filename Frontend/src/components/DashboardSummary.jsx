
import { useState, useEffect, useMemo } from 'react';
import './DashboardSummary.css';

const API_ENDPOINTS = [
    '/transactions/',
    '/savings/',
    '/debts/',
];

const toNumber = (value) => {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
};

const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results))
        return data.results;
    return [];
};

const getCurrentMonth = () => {
    const data = new Date();
    return `${data.getFullYear()}-${String(data.getMonth()+1).padStart(2,'0')}`;
};

const formatMoney = (value) =>
    new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 2,
    }).format(toNumber(value));

async function fetchAPI(url, token) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });    
    if (response.status === 401) {
        throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
    }

    if (!response.ok) {
        throw new Error(`โหลดข้อมูลไม่สำเร็จ (${response.status})`);
    }

    return response.json();
}

export default function DashboardSummary({compact=false, onClick}) {
    const [activeTab, setActiveTab] = useState("รายรับ");
    const [selectedMonth] = useState(getCurrentMonth);

    const [transactions, setTransactions] = useState([]);
    const [savings, setSavings] = useState([]);
    const [debts, setDebts] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);


//โหลดข้อมูลจากBackend
useEffect(() => {
        let cancelled = false;

        async function loadData() {
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
                    API_ENDPOINTS.map((endpoint) =>
                        fetchAPI(endpoint, token)
                    )
                );

                if (cancelled) return;

                setTransactions(normalizeArray(responses[0]));
                setSavings(normalizeArray(responses[1]));
                setDebts(normalizeArray(responses[2]));
            } catch (err) {
                if (cancelled) return;

                setError(
                    err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล"
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadData();

        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    // กรองธุรกรรมตามเดือนปัจจุบัน
    const monthlyTransactions = useMemo(
        () =>
            transactions.filter((item) =>
                String(item.transaction_date ?? "").startsWith(
                    selectedMonth
                )
            ),
        [transactions, selectedMonth]
    );

    // คำนวณรายรับและรายจ่าย
    const income = monthlyTransactions
        .filter((item) => item.transaction_type === "income")
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

    const expense = monthlyTransactions
        .filter((item) => item.transaction_type === "expense")
        .reduce((sum, item) => sum + toNumber(item.amount), 0);

    // คำนวณเงินออม
    const activeSavings = savings.filter((item) => item.status === 'active')
    const totalSavings = savings.reduce(
        (sum, item) => sum + toNumber(item.balance),
        0
    );

    // คำนวณหนี้ที่ยังดำเนินการ
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

//เตรียมข้อมูลทำกราฟ
const summaryData = useMemo(() => {
        const daysInMonth = new Date(
            Number(selectedMonth.slice(0, 4)),
            Number(selectedMonth.slice(5, 7)),
            0
        ).getDate();

        const incomeByDay = Array(daysInMonth).fill(0);
        const expenseByDay = Array(daysInMonth).fill(0);

        monthlyTransactions.forEach((item) => {
            const day = Number(
                String(item.transaction_date ?? "").slice(8, 10)
            );

            if (day < 1 || day > daysInMonth) return;

            if (item.transaction_type === "income") {
                incomeByDay[day - 1] += toNumber(item.amount);
            } else if (item.transaction_type === "expense") {
                expenseByDay[day - 1] += toNumber(item.amount);
            }
        });

        return {
            รายรับ: {
                total: income,
                color: "#69c9a6",
                labels: incomeByDay.map((_, index) => `${index + 1}`),
                values: incomeByDay,
            },
            รายจ่าย: {
                total: expense,
                color: "#fe9898",
                labels: expenseByDay.map((_, index) => `${index + 1}`),
                values: expenseByDay,
            },
            การออม: {
                total: totalSavings,
                color: "#b3e0f0",
                labels: activeSavings.map(
                    (item, index) =>
                        item.saving_name || item.name || `กระเป๋า ${index + 1}`
                ),
                values: activeSavings.map((item) =>
                    toNumber(item.balance)
                ),
            },
            หนี้สิน: {
                total: totalBorrowed + totalLent,
                color: ['#ffb936','#ec5e5e'],
                labels: ['ยืมจากคนอื่น', '.ให้คนอื่นยืม'],
                values: [totalBorrowed, totalLent]
            },
        };
    }, [
        selectedMonth,
        monthlyTransactions,
        savings,
        activeDebts,
        income,
        expense,
        totalSavings,
        totalBorrowed,
        totalLent,
    ]);

    const data = summaryData[activeTab];
    const maxValue = Math.max(...data.values, 0);

    return (
        <section
            className={`home-dashboard-summary ${
                compact ? "home-dashboard-compact" : ""
            } ${onClick ? 'clickable-dashboard' : ''}`}
            onClick={onClick}
        >
            <h3>แดชบอร์ด</h3>

            <div className="home-dashboard-tabs">
                {Object.keys(summaryData).map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        className={activeTab === tab ? "active" : ""}
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab(tab);
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="home-dashboard-chart-card">
                <p className="home-dashboard-chart-label">
                    สรุป{activeTab}
                </p>

                {loading ? (
                    <p className="home-dashboard-message">
                        กำลังโหลดข้อมูล...
                    </p>
                ) : error ? (
                    <div className="home-dashboard-message">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={() =>
                                setReloadKey((key) => key + 1)
                            }
                        >
                            ลองใหม่
                        </button>
                    </div>
                ) : (
                    <>
                        <strong className="home-dashboard-total">
                            {formatMoney(data.total)}
                        </strong>

                        {data.values.length === 0 ||
                        maxValue === 0 ? (
                            <p className="home-dashboard-message">
                                ยังไม่มีข้อมูล{activeTab}
                            </p>
                        ) : (
                            <div className="home-dashboard-chart">
                                {data.values.map((value, index) => (
                                    <div
                                        className="home-dashboard-bar-item"
                                        key={`${activeTab}-${index}`}
                                    >
                                        <div className="home-dashboard-bar-area">
                                            <div
                                                className="home-dashboard-bar"
                                                style={{
                                                    height: `${
                                                        (value / maxValue) *
                                                        100
                                                    }%`,
                                                    backgroundColor: data.color,
                                                }}
                                                title={`${data.labels[index]}: ${formatMoney(value)}`}
                                            />
                                        </div>

                                        <span title={data.labels[index]}>
                                            {data.labels[index]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="home-dashboard-note">
                            {activeTab === "รายรับ" ||
                            activeTab === "รายจ่าย"
                                ? "ยอดแยกตามวันของเดือนปัจจุบัน"
                                : "ข้อมูลจากรายการที่บันทึกไว้"}
                        </p>
                    </>
                )}
            </div>
        </section>
    );
}