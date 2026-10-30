
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    X,
    Trash2,
    ImagePlus,
} from "lucide-react";

function DebtPaymentHistory({ debt, onBack, onDebtUpdated }) {
    const isBorrow = debt.type === "borrowed";
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);//
    const [error, setError] = useState("");//
    const [editingId, setEditingId] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [savingId, setSavingId] = useState(null); //state ป้องกันการกดบันทึกซ้ำ

    const [newReceived, setNewReceived] = useState({
        paid_amount: "",
        paid_date: "",
        note: "",
        proof_image: null,
    });

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

                // เอารายการทั้งหมดมาเรียงตามวันที่ชำระจากใหม่ไปเก่า
                const sortedPayments = [...data].sort(
                    (a, b) => new Date(b.paid_date) - new Date(a.paid_date)
                );

                setPayments(sortedPayments);

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

    const formatDate = (date) => {
        if (!date) return "วว/ดด/ปปปป";

        return new Date(date + "T00:00:00").toLocaleDateString("th-TH", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    //สถานะการชำระหนี้ตามเวลา
    const getPaymentTimingStatus = (payment) => {
        if (!payment.paid_date || !payment.due_date) {
            return null;
        }

        // เปรียบเทียบวันที่ในรูปแบบ YYYY-MM-DD
        // วันที่ชำระตรงกับวันครบกำหนดถือว่าชำระภายในกำหนด
        const paidDate = payment.paid_date.slice(0, 10);
        const dueDate = payment.due_date.slice(0, 10);

        if (paidDate <= dueDate) {
            return {
                label: "ชำระภายในกำหนด",
                className: "border-green-500 text-green-600",
            };
        }

        return {
            label: "ชำระเกินกำหนด",
            className: "border-red-500 text-red-600",
        };
    };


    const statusText = {
        pending: "กำลังรอการอนุมัติ",
        approved: "อนุมัติแล้ว",
    };

    const statusClass = {
        pending: "bg-yellow-100 text-black",
        approved: "bg-green-500 text-white",
    };

    const handleEvidence = (id, file) => {
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("กรุณาเลือกไฟล์รูปภาพ");
            return;
        }

        // ยกเลิก URL ตัวอย่างเดิม หากมี
        const payment = payments.find((p) => p.id === id);

        if (payment?.evidencePreview) {
            URL.revokeObjectURL(payment.evidencePreview);
        }

        const previewUrl = URL.createObjectURL(file);

        updatePayment(id, {
            evidencePreview: previewUrl,
            evidenceFile: file,
            removeProofImage: false,
        });
    };

    //ฟังก์ชันบันทึกการชำระหนี้
    const savePayment = async (payment) => {
        const accessToken = sessionStorage.getItem("accessToken");

        if (!accessToken) {
            alert("ไม่พบข้อมูลการเข้าสู่ระบบ");
            return;
        }

        setSavingId(payment.id);

        try {
            const formData = new FormData();

            formData.append("paid_amount", String(payment.paid_amount ?? 0));
            formData.append("note", payment.note ?? "");

            if (payment.paid_date) {
                formData.append("paid_date", payment.paid_date);
            }

            // ถ้าเลือกรูปใหม่ ส่งไฟล์จริงไปให้ backend
            if (payment.evidenceFile) {
                formData.append("proof_image", payment.evidenceFile);
            } else if (payment.removeProofImage) {
                // ถ้าลบรูป ให้ backend เคลียร์ URL เดิมในฐานข้อมูล
                formData.append("remove_proof_image", "true");
            }

            const response = await fetch(
                `/debts/payments/${payment.id}/`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();
            console.log("ผลการบันทึก Payment:", data);
            if (!response.ok) {
                const message =
                    data.detail ||
                    Object.values(data).flat().join(" ") ||
                    "ไม่สามารถบันทึกประวัติการชำระได้";

                throw new Error(message);
            }

            // ใช้ข้อมูลล่าสุดที่ backend บันทึกกลับมา
            updatePayment(payment.id, {
                ...data,
                evidencePreview: null,
                evidenceFile: null,
                removeProofImage: false,
            });

            setEditingId(null);

            // โหลดหนี้ใหม่ เพื่อให้ยอดบน DebtCard ตรงกับฐานข้อมูล
            if (onDebtUpdated) {
                await onDebtUpdated();
            }
        } catch (error) {
            console.error("Save payment error:", error);
            alert(error.message || "ไม่สามารถบันทึกประวัติการชำระได้");
        } finally {
            setSavingId(null);
        }
    };
    const updatePayment = (id, changes) => {
        setPayments((previous) =>
            previous.map((payment) =>
                payment.id === id ? { ...payment, ...changes } : payment
            )
        );
    };


    const updateApprovementStatus = async (payment, action) => {
        const accessToken = sessionStorage.getItem("accessToken");

        if (!accessToken) {
            alert("ไม่พบข้อมูลการเข้าสู่ระบบ");
            return;
        }

        setSavingId(payment.id);

        try {
            const response = await fetch(
                `/debts/payments/${payment.id}/`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ action }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail ||
                    Object.values(data).flat().join(" ") ||
                    "ไม่สามารถเปลี่ยนสถานะได้"
                );
            }

            setPayments((previous) =>
                previous.map((item) =>
                    item.id === payment.id
                        ? { ...item, ...data }
                        : item
                )
            );

            if (onDebtUpdated) {
                await onDebtUpdated();
            }

        } catch (error) {
            console.error("Update approvement error:", error);
            alert(error.message || "ไม่สามารถเปลี่ยนสถานะการอนุมัติได้");
        } finally {
            setSavingId(null);
        }
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
                    {isBorrow ? "ประวัติการชำระหนี้" : "ประวัติการได้เงินคืน"}
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
                            {/* ชื่อและสถานะการชำระตามเวลา */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-[#252525] text-white text-xs px-2 py-2 -ml-[14px]">
                                    งวดที่ {payments.length - index}
                                </div>

                                {/* สถานะการชำระ*/}
                                {(() => {
                                    const timingStatus = getPaymentTimingStatus(payment);

                                    if (!timingStatus) return null;

                                    return (
                                        <span
                                            className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-medium ${timingStatus.className}`}
                                        >
                                            {timingStatus.label}
                                        </span>
                                    );
                                })()}

                            </div>

                            {/* ข้อมูลและหลักฐาน */}
                            <div className="grid grid-cols-[1fr_120px] gap-3">
                                <div className="min-w-0">

                                    {/* ถ้ามีการผูกบัญชีเพื่อนจะแสดงสถานะการอนุมัติชำระ */}
                                    {isBorrow && debt.counterparty && (
                                        <div className="mb-2">
                                            <p className="text-[10px] mb-1">
                                                สถานะการอนุมัติจากเจ้าหนี้ :
                                            </p>

                                            <span
                                                className={`inline-block rounded-full px-3 py-1 text-[10px] ${statusClass[payment.approvement_status] || "bg-gray-200 text-gray-700"
                                                    }`}
                                            >
                                                {statusText[payment.approvement_status] || "ไม่ระบุสถานะ"}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                                        <label className="flex items-center gap-1 border border-gray-400 rounded-full px-2 py-1 text-[10px] text-gray-500">
                                            {isEditing ? (
                                                <input
                                                    type="date"
                                                    value={payment.paid_date || ""}
                                                    onChange={(e) =>
                                                        updatePayment(payment.id, {
                                                            paid_date: e.target.value,
                                                        })
                                                    }
                                                    className="w-[120px] outline-none bg-transparent"
                                                />
                                            ) : (
                                                <span>วันที่ชำระ : {formatDate(payment.paid_date)}</span>
                                            )}
                                        </label>

                                        <span className="flex items-center gap-1 border border-gray-400 rounded-full px-2 py-1 text-[10px] text-gray-500">
                                            วันที่ครบกำหนด: {payment.due_date
                                                ? formatDate(payment.due_date)
                                                : "-"}
                                        </span>
                                    </div>

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
                                        {(payment.note || "").length}/250
                                    </p>


                                    {/* ปุ่มแก้ไขรายการชำระหนี้/คืนเงิน */}
                                    {(isBorrow || (!isBorrow && !debt.counterparty)) && (
                                        <button
                                            onClick={() => {
                                                //console.log("กดปุ่มแล้ว:", { paymentId: payment.id, isEditing});
                                                if (isEditing) {
                                                    //console.log("กำลังเรียก savePayment");
                                                    savePayment(payment);
                                                } else {
                                                    //console.log("เข้าสู่โหมดแก้ไข");
                                                    setEditingId(payment.id);
                                                }
                                            }}
                                            className={`mt-2 w-[72px] h-[24px] rounded-md text-[10px] 
                                                ${isEditing
                                                    ? "bg-green-500 text-white"
                                                    : isBorrow && payment.approvement_status !== "pending"
                                                        ? "bg-gray-300 text-gray-500"
                                                        : "bg-[#252525] text-white"
                                                }`}
                                            disabled={
                                                savingId === payment.id || (isBorrow && !isEditing && payment.approvement_status !== "pending")
                                            }
                                        >
                                            {isEditing
                                                ? savingId === payment.id
                                                    ? "กำลังบันทึก..."
                                                    : "บันทึก"
                                                : "แก้ไข"}
                                        </button>

                                    )}

                                    {/* ถ้าเป็นการยืมและมีการเชื่อมบัญชีเพื่อน จะมีปุ่มให้อนุมัติการชำระหนี้*/}
                                    {!isBorrow && debt.counterparty && String(payment.debt) === String(debt.paired_debt) && (
                                        <div className="mt-2">
                                            <button
                                                type="button"
                                                disabled={savingId === payment.id}
                                                onClick={() =>
                                                    updateApprovementStatus(
                                                        payment,
                                                        payment.approvement_status === "approved"
                                                            ? "cancel"
                                                            : "confirm"
                                                    )
                                                }
                                                className={`w-full rounded-md text-[10px] py-2 text-white disabled:opacity-50 ${payment.approvement_status === "approved"
                                                    ? "bg-[#252525]"
                                                    : "bg-green-500"
                                                    }`}
                                            >
                                                {savingId === payment.id
                                                    ? "กำลังบันทึก..."
                                                    : payment.approvement_status === "approved"
                                                        ? "ยกเลิก"
                                                        : "อนุมัติการชำระหนี้"}
                                            </button>
                                        </div>
                                    )}

                                </div>


                                {/* รูปหลักฐาน */}
                                <div className="min-w-0">
                                    <div className="relative w-full h-[160px] rounded-lg overflow-hidden bg-[#d9d9d9]">

                                        {/* เลือกรูปหลักฐาน */}
                                        {isEditing && (
                                            <>
                                                <input
                                                    id={`evidence-${payment.id}`}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        handleEvidence(payment.id, e.target.files?.[0]);
                                                        e.target.value = "";
                                                    }}
                                                />

                                                {/* ปุ่มลบรูป มุมขวาบน */}
                                                {(payment.evidencePreview ||
                                                    (payment.proof_image && !payment.removeProofImage)) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (payment.evidencePreview) {
                                                                    URL.revokeObjectURL(payment.evidencePreview);
                                                                }

                                                                updatePayment(payment.id, {
                                                                    evidencePreview: null,
                                                                    evidenceFile: null,
                                                                    proof_image: null,
                                                                    removeProofImage: true,
                                                                });
                                                            }}
                                                            className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                                                            aria-label="ลบรูปหลักฐาน"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                            </>
                                        )}

                                        {/* รูปที่แสดง*/}
                                        {(payment.evidencePreview ||
                                            (payment.proof_image && !payment.removeProofImage)) ? (
                                            <button
                                                type="button"
                                                className="h-full w-full"
                                                onClick={() => {
                                                    setPreviewImage(
                                                        payment.evidencePreview || payment.proof_image
                                                    );
                                                }}
                                                aria-label="ดูรูปหลักฐานขนาดใหญ่"
                                            >
                                                <img
                                                    src={payment.evidencePreview || payment.proof_image}
                                                    alt="หลักฐานการชำระหนี้"
                                                    className="h-full w-full object-cover"
                                                />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={!isEditing}
                                                onClick={() =>
                                                    document.getElementById(`evidence-${payment.id}`)?.click()
                                                }
                                                className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-500 disabled:cursor-default"
                                            >
                                                <ImagePlus size={28} />
                                                <span className="text-[10px]">
                                                    {isEditing ? "กดเพื่ออัปโหลดรูป" : "ไม่มีรูปหลักฐาน"}
                                                </span>
                                            </button>
                                        )}
                                    </div>
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