
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, X } from "lucide-react";

function DebtPaymentHistory({ debt, onBack }) {
    const isBorrow = debt.type === "borrowed";
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

    useEffect(() => {
        const fetchPayments = async () => {
            const accessToken = sessionStorage.getItem("accessToken");

            if (!accessToken) {
                setError("ไม่พบข้อมูลการเข้าสู่ระบบ");
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `/debts/${debt.id}/payments/`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                );

                const data = await response.json();

                console.log("Payment history:", data);

                if (!response.ok) {
                    throw new Error(
                        data.detail ||
                        "ไม่สามารถโหลดประวัติการชำระได้"
                    );
                }

                setPayments(data);

            } catch (error) {
                console.error(
                    "Fetch payment history error:",
                    error
                );

                setError(
                    error.message ||
                    "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"
                );

            } finally {
                setLoading(false);
            }
        };

        if (debt?.id) {
            fetchPayments();
        }
    }, [debt]);

    const updatePayment = (id, changes) => {
        setPayments((previous) =>
            previous.map((payment) =>
                payment.id === id ? { ...payment, ...changes } : payment
            )
        );
    };

    const formatDate = (date) => {
        if (!date) return "วว/ดด/ปปปป";

        return new Date(date + "T00:00:00").toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const statusText = {
        pending: "กำลังรอยืนยัน",
        approved: "ยืนยันแล้ว",
        rejected: "ไม่อนุมัติ",
    };

    const statusClass = {
        pending: "bg-gray-100 text-gray-500",
        approved: "bg-green-500 text-white",
        rejected: "bg-red-500 text-white",
    };

    const handleEvidence = (id, file) => {
        if (!file) return;

        updatePayment(id, {
            evidence: URL.createObjectURL(file),
        });
    };

    return (
        <div className="min-h-screen bg-[#f4f4f4] pb-24">
            {/* Header */}
            <header className="bg-black text-white h-[100px] relative flex items-center justify-center">
                <button
                    onClick={onBack}
                    className="absolute left-4 top-4"
                    aria-label="กลับ"
                >
                    <ArrowLeft size={25} />
                </button>

                <h1 className="text-[28px] font-bold mt-5">
                    ประวัติการชำระหนี้
                </h1>
            </header>

            <main className="px-[18px] pt-[22px]">
                {/* ชื่อหนี้ */}
                <div className="bg-[#252525] text-white rounded-lg px-4 py-3 mb-3">
                    <span className="text-sm font-medium">
                        {isBorrow ? "ชื่อหนี้สิน" : "ชื่อการให้ยืม"} :
                    </span>{" "}
                    <span className="text-sm">{debt.name}</span>
                </div>

                {payments.map((payment, index) => {
                    const isEditing = editingId === payment.id;

                    return (
                        <section
                            key={payment.id}
                            className="bg-white border border-[#c5c5c5] rounded-lg mb-3 p-[14px] relative"
                        >
                            {/* ชื่อและวันที่ */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-[#252525] text-white text-xs px-2 py-2 -ml-[14px]">
                                    งวดที่ {index + 1}
                                </div>

                                <label className="flex items-center gap-1 border border-gray-400 rounded-full px-2 py-1 text-[10px] text-gray-500">
                                    <CalendarDays size={13} />

                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={payment.date}
                                            onChange={(e) =>
                                                updatePayment(payment.id, {
                                                    date: e.target.value,
                                                })
                                            }
                                            className="w-[120px] outline-none bg-transparent"
                                        />
                                    ) : (
                                        <span>วันที่ชำระ : {formatDate(payment.paid_date)}</span>
                                    )}
                                </label>
                            </div>

                            {/* ข้อมูลและหลักฐาน */}
                            <div className="grid grid-cols-[1fr_120px] gap-3">
                                <div className="min-w-0">
                                    {isBorrow && (
                                        <div className="mb-2">
                                            <p className="text-[10px] mb-1">
                                                สถานะการยืนยันจากเจ้าหนี้ :
                                            </p>

                                            <span
                                                className={`inline-block rounded-full px-3 py-1 text-[10px] ${statusClass[payment.confirm_status]}`}
                                            >
                                                {statusText[payment.confirm_status]}
                                            </span>
                                        </div>
                                    )}

                                    <div className="mb-2">
                                        <label className="text-[10px] block mb-1">
                                            ยอดชำระ :
                                        </label>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={payment.paid_amount}
                                                disabled={!isEditing}
                                                onChange={(e) =>
                                                    updatePayment(payment.id, {
                                                        paid_amount: e.target.value,
                                                    })
                                                }
                                                className="w-full min-w-0 rounded-full border border-gray-400 bg-gray-100 px-3 py-1 text-[11px] disabled:text-gray-500"
                                            />

                                            {!isBorrow && (
                                                <span className="text-[10px]">บาท</span>
                                            )}
                                        </div>
                                    </div>

                                    <label className="text-[10px] block mb-1">
                                        คำอธิบาย
                                    </label>

                                    <textarea
                                        value={payment.note}
                                        disabled={!isEditing}
                                        maxLength={250}
                                        onChange={(e) =>
                                            updatePayment(payment.id, {
                                                note: e.target.value,
                                            })
                                        }
                                        className="w-full h-[54px] resize-none rounded-xl border border-gray-400 bg-gray-100 p-2 text-xs disabled:text-gray-700"
                                    />

                                    <p className="text-[8px] text-gray-400 text-right">
                                        {payment.note.length}/250
                                    </p>

                                    {isEditing && (
                                        <label className="block text-[10px] mt-2">
                                            แนบรูปหลักฐาน
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) =>
                                                    handleEvidence(payment.id, e.target.files?.[0])
                                                }
                                                className="block w-full text-[9px] mt-1"
                                            />
                                        </label>
                                    )}

                                    {/* ปุ่มสำหรับหนี้ที่เรายืม */}
                                    {isBorrow && (
                                        <button
                                            onClick={() => {
                                                if (isEditing) {
                                                    setEditingId(null);
                                                } else {
                                                    setEditingId(payment.id);
                                                }
                                            }}
                                            className={`mt-2 w-[72px] h-[24px] rounded-md text-[10px] ${isEditing
                                                ? "bg-green-500 text-white"
                                                : payment.confirm_status === "pending"
                                                    ? "bg-[#252525] text-white"
                                                    : "bg-gray-300 text-gray-500"
                                                }`}
                                            disabled={
                                                !isEditing && payment.confirm_status !== "pending"
                                            }
                                        >
                                            {isEditing ? "บันทึก" : "แก้ไข"}
                                        </button>
                                    )}

                                    {/* ปุ่มตรวจสอบสำหรับหนี้ที่เราให้ยืม */}
                                    {!isBorrow && (
                                        <div className="flex gap-1 mt-2">
                                            <button
                                                disabled={payment.confirm_status !== "pending"}
                                                onClick={() =>
                                                    updatePayment(payment.id, {
                                                        status: "approved",
                                                    })
                                                }
                                                className="flex-1 rounded-md bg-green-500 text-white text-[10px] py-2 disabled:bg-gray-300"
                                            >
                                                {payment.confirm_status === "approved"
                                                    ? "ยืนยันรับทราบแล้ว"
                                                    : "ยืนยันรับทราบ"}
                                            </button>

                                            <button
                                                disabled={payment.confirm_status !== "pending"}
                                                onClick={() =>
                                                    updatePayment(payment.id, {
                                                        status: "rejected",
                                                    })
                                                }
                                                className="flex-1 rounded-md bg-red-500 text-white text-[10px] py-2 disabled:bg-gray-300"
                                            >
                                                {payment.confirm_status === "rejected"
                                                    ? "ไม่อนุมัติแล้ว"
                                                    : "ไม่อนุมัติ"}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* รูปหลักฐาน */}
                                <div className="min-w-0">{payment.proof_image ? (
                                    <img
                                        onClick={() => setPreviewImage(payment.proof_image)}
                                        src={payment.proof_image}
                                        alt="หลักฐานการชำระหนี้"
                                        className="w-full h-[160px] rounded-lg object-cover"
                                    />
                                )
                                    :
                                    (
                                        <div className="w-full h-[160px] rounded-lg bg-[#d9d9d9]" />
                                    )}

                                    <p className="text-[8px] text-gray-400 mt-1">
                                        *คลิกที่รูปเพื่อดูตัวอย่างขนาดใหญ่
                                    </p>
                                </div>
                            </div>
                        </section>
                    );
                })}
            </main>

            {/* Popup แสดงรูปหลักฐาน */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setPreviewImage(null)}
                >
                    {/* ปุ่มปิด */}
                    <button
                        type="button"
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                        aria-label="ปิดรูปภาพ"
                    >
                        <X size={28} />
                    </button>

                    {/* รูปภาพขนาดใหญ่ */}
                    <img
                        src={previewImage}
                        alt="รูปหลักฐานการชำระหนี้ขนาดใหญ่"
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-full max-h-[85vh] object-contain rounded-lg"
                    />
                </div>
            )}
        </div>
    );
}

export default DebtPaymentHistory;