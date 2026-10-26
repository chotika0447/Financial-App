import CustomHeader from '../components/CustomHeader';
import Navbar from '../components/Navbar';
import AddDebt from "../components/AddDebt";
import PayDebt from "../components/PayDebt";
import DebtCard from "../components/DebtCard";
import DebtPayHistory from "./DebtPayHistory";

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Search,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Plus,
} from "lucide-react";

function Debts() {
  const [activeTab, setActiveTab] = useState("borrow");//แท็บหลักรวมรายการทั้งหมดที่ผู้ใช้เลือกดูอยู่ (ยืม/ให้ยืม)
  const [currentDebtType, setCurrentDebtType] = useState("borrow");//แท็บย่อยที่ผู้ใช้เลือกดูอยู่ (ยืม/ให้ยืม) หลังกดปุ่มเพิ่มรายการหนี้สิน
  const [showAddDebt, setShowAddDebt] = useState(false);//แสดง/ซ่อน ป็อปอัพ เพิ่มรายการหนี้สิน
  const [showDebtPay, setShowDebtPay] = useState(false);//แสดง/ซ่อน ป็อปอัพ หน้าชำระหนี้
  const [selectedDebt, setSelectedDebt] = useState(null);//สถานะของหนี้สินที่ผู้ใช้เลือก (สำหรับการชำระหนี้หรือดูประวัติการชำระ)
  const [showDebtHistory, setShowDebtHistory] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);//สถานะแก้ไขรายการหนี้สินที่เลือก

  const isPopupOpen = showAddDebt || showDebtPay || editingDebt;//สถานะการเปิดป็อปอัพทั้งหมด เพื่อซ่อน Navbar ไม่ให้บัง

  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // คำค้นหาและรูปแบบการเรียงรายการหนี้
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [sortDirection, setSortDirection] = useState("desc");
  // แสดง/ซ่อนเมนูเรียงลำดับ
  const [showSortMenu, setShowSortMenu] = useState(false);

  // รายชื่อเพื่อนจาก Backend
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();
  const [openingLinkedDebt, setOpeningLinkedDebt] = useState(false);

  const [activeStatus, setActiveStatus] = useState("ongoing");

  const [sendingReminderId, setSendingReminderId] = useState(null);
  //useEffect สำหรับดึงข้อมูลหนี้สิน
  useEffect(() => {
    const fetchDebts = async () => {
      const accessToken = sessionStorage.getItem("accessToken");

      if (!accessToken) {
        setError("ไม่พบข้อมูลการเข้าสู่ระบบ");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/debts/", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "ไม่สามารถโหลดข้อมูลหนี้สินได้"
          );
        }

        setDebts(data);
      } catch (error) {
        console.error("Fetch debts error:", error);
        setError(error.message || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      } finally {
        setLoading(false);
      }
    };

    fetchDebts();
  }, []);

  //useEffect สำหรับเปิดรายการหนี้สินจาก LINE
  useEffect(() => {
    const debtId = searchParams.get("debtId");

    if (!debtId || loading) return;

    // ตรวจสอบว่า ID เป็นจำนวนเต็มบวก
    if (!/^[1-9]\d*$/.test(debtId)) {
      setError("ลิงก์รายการหนี้ไม่ถูกต้อง");
      setSearchParams({}, { replace: true });
      return;
    }

    const targetDebt = debts.find(
      (debt) => String(debt.id) === debtId
    );

    if (!targetDebt) {
      setError("ไม่พบรายการหนี้นี้ในบัญชีของคุณ");
      setSearchParams({}, { replace: true });
      return;
    }

    // เลือกหนี้ที่ตรงกับ ID จาก LINE
    setSelectedDebt(targetDebt);

    // เลือกแท็บให้ตรงกับประเภทหนี้
    setActiveTab(
      targetDebt.type === "borrowed" ? "borrow" : "lend"
    );

    // เปิด Modal สำหรับบันทึกการชำระหนี้
    setShowDebtHistory(false);
    setShowDebtPay(true);

    // ลบ query string ออกจาก URL หลังเลือกหนี้แล้ว
    setSearchParams({}, { replace: true });
  }, [debts, loading, searchParams, setSearchParams]);


  //useEffect สำหรับดึงรายชื่อเพื่อน
  useEffect(() => {
    const fetchFriends = async () => {
      const accessToken = sessionStorage.getItem("accessToken");

      if (!accessToken) {
        setFriendsError("ไม่พบข้อมูลการเข้าสู่ระบบ");
        setFriendsLoading(false);
        return;
      }

      try {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
        };

        // ดึงข้อมูลผู้ใช้ปัจจุบันและรายชื่อเพื่อน
        const [userResponse, friendsResponse] = await Promise.all([
          fetch("/users/me/", { headers }),
          fetch("/friends/list/", { headers }),
        ]);

        const userData = await userResponse.json();
        const friendsData = await friendsResponse.json();

        if (!userResponse.ok) {
          throw new Error(
            userData.detail || "ไม่สามารถโหลดข้อมูลผู้ใช้ได้"
          );
        }

        if (!friendsResponse.ok) {
          throw new Error(
            friendsData.detail || "ไม่สามารถโหลดรายชื่อเพื่อนได้"
          );
        }

        if (!Array.isArray(friendsData)) {
          console.error("Unexpected friends response:", friendsData);
          throw new Error("รูปแบบข้อมูลรายชื่อเพื่อนไม่ถูกต้อง");
        }

        const myUid = userData.uid;

        // แปลงข้อมูลความสัมพันธ์ให้เป็นข้อมูลเพื่อน
        const normalizedFriends = friendsData.map((friend) => {
          const isSender =
            String(friend.sender) === String(myUid);

          return {
            uid: isSender ? friend.receiver : friend.sender,
            username: isSender
              ? friend.receiver_name
              : friend.sender_name,
          };
        });

        setFriends(normalizedFriends);
        setFriendsError("");

        console.log("Loaded friends:", normalizedFriends);
      } catch (error) {
        console.error("Fetch friends error:", error);
        setFriendsError(
          error.message || "ไม่สามารถโหลดรายชื่อเพื่อนได้"
        );
        setFriends([]);
      } finally {
        setFriendsLoading(false);
      }
    };

    fetchFriends();
  }, []);


  //ฟังก์ชันรีเฟรชข้อมูลหนี้สิน
  const refreshDebts = async () => {
    const accessToken = sessionStorage.getItem("accessToken");

    if (!accessToken) {
      throw new Error("ไม่พบข้อมูลการเข้าสู่ระบบ");
    }

    const response = await fetch("/debts/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "ไม่สามารถโหลดข้อมูลหนี้สินล่าสุดได้"
      );
    }

    // API ต้องส่งรายการหนี้กลับมาเป็น Array
    if (!Array.isArray(data)) {
      console.error("Unexpected debts response:", data);
      throw new Error("รูปแบบข้อมูลหนี้สินจาก API ไม่ถูกต้อง");
    }

    console.log("Refreshed debts:", data);

    setDebts(data);

    // อัปเดตหนี้ที่กำลังเลือกด้วย ป้องกันข้อมูลเก่าค้างอยู่
    setSelectedDebt((previous) => {
      if (!previous) return previous;

      return data.find((debt) => debt.id === previous.id) || previous;
    });

    return data;
  };


  //จัดการปุ่มเพิ่มรายการหนี้สินและแก้ไขรายการ
  const handleSaveDebt = async (debtData) => {
    const accessToken = sessionStorage.getItem("accessToken");

    if (!accessToken) {
      throw new Error("ไม่พบข้อมูลการเข้าสู่ระบบ");
    }

    const isEditing = Boolean(editingDebt);

    const url = isEditing
      ? `/debts/${editingDebt.id}/`
      : "/debts/";

    const response = await fetch(url, {
      method: isEditing ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: debtData,
    });

    const data = await response.json();
    console.log("Saved debt data:", data);

    if (!response.ok) {
      console.error("Save debt error:", data);

      const validationMessages = Object.values(data)
        .flat()
        .filter((message) => typeof message === "string");

      throw new Error(
        data.detail
        || validationMessages.join("\n")
        || "ไม่สามารถบันทึกข้อมูลหนี้สินได้"
      );
    }

    if (isEditing) {
      // แทนข้อมูลเดิมด้วยข้อมูลที่แก้ไขแล้ว
      setDebts((prevDebts) =>
        prevDebts.map((debt) =>
          debt.id === data.id ? data : debt
        )
      );
    } else {
      // เพิ่มรายการใหม่
      setDebts((prevDebts) => [
        ...prevDebts,
        data,
      ]);
    }

    // ล้างโหมดแก้ไข
    setEditingDebt(null);
  };


  // ลบรายการหนี้และรายการที่เชื่อมกับเพื่อน
  const handleDeleteDebt = async (debt) => {
    const confirmed = window.confirm(
      `ต้องการลบรายการ "${debt.name}" ใช่หรือไม่?\n\n` +
      "หากรายการนี้เชื่อมกับบัญชีเพื่อน รายการของเพื่อนและประวัติการชำระที่เกี่ยวข้องจะถูกลบด้วย\n\n" +
      "การลบนี้ไม่สามารถย้อนกลับได้"
    );

    if (!confirmed) return;

    const accessToken = sessionStorage.getItem("accessToken");

    if (!accessToken) {
      alert("ไม่พบข้อมูลการเข้าสู่ระบบ");
      return;
    }

    try {
      const response = await fetch(`/debts/${debt.id}/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "ไม่สามารถลบรายการหนี้ได้"
        );
      }

      const deletedIds = new Set(
        data.deleted_debt_ids || [debt.id]
      );

      // นำรายการที่ลบออกจากหน้าจอทันที
      setDebts((previous) =>
        previous.filter((item) => !deletedIds.has(item.id))
      );

      // ปิดหน้ารายละเอียด หากกำลังเปิดรายการที่ถูกลบอยู่
      setSelectedDebt((previous) =>
        previous && deletedIds.has(previous.id)
          ? null
          : previous
      );

      setShowDebtPay(false);
      setShowDebtHistory(false);

      // โหลดข้อมูลล่าสุดเพื่อให้ยอดรวมตรงกับฐานข้อมูล
      await refreshDebts();
    } catch (error) {
      console.error("Delete debt error:", error);
      alert(error.message || "เกิดข้อผิดพลาดในการลบรายการหนี้");
    }
  };


  const handleSendDebtReminder = async (debt) => {
    const confirmed = window.confirm(
      `ต้องการส่งแจ้งเตือนชำระหนี้ "${debt.name}" ` +
      `ไปยัง LINE ของ ${debt.counterparty_name} ทันทีหรือไม่?`
    );

    if (!confirmed) return;

    const accessToken = sessionStorage.getItem("accessToken");

    if (!accessToken) {
      alert("ไม่พบข้อมูลการเข้าสู่ระบบ");
      return;
    }

    setSendingReminderId(debt.id);

    try {
      const response = await fetch(
        `/debts/${debt.id}/send-reminder/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "ไม่สามารถส่งแจ้งเตือน LINE ได้"
        );
      }

      alert(data.detail || "ส่งแจ้งเตือน LINE สำเร็จ");
    } catch (error) {
      console.error("Send debt reminder error:", error);
      alert(error.message || "เกิดข้อผิดพลาดในการส่งแจ้งเตือน");
    } finally {
      setSendingReminderId(null);
    }
  };


  const statusFilteredDebts = debts.filter(
    (debt) => debt.status === activeStatus
  );

  const borrowDebts = statusFilteredDebts.filter(
    (debt) => debt.type === "borrowed"
  );

  const lendDebts = statusFilteredDebts.filter(
    (debt) => debt.type === "lent"
  );

  const currentDebtsList =
    activeTab === "borrow" ? borrowDebts : lendDebts;

  // ค้นหาด้วยชื่อรายการ และเรียงตามเงื่อนไขที่เลือก
  const filteredDebtsList = [...currentDebtsList]
    .filter((debt) =>
      String(debt.name ?? "")
        .toLocaleLowerCase("th")
        .includes(searchTerm.trim().toLocaleLowerCase("th"))
    )

    .sort((a, b) => {
      // วันที่ครบกำหนดที่ไม่มีค่า หรือไม่ใช่วันที่ที่ถูกต้อง
      // จะถูกจัดไว้ท้ายรายการเสมอ
      if (sortBy === "dueDate") {
        const getDueDate = (debt) => {
          if (!debt.due_date) return null;

          const timestamp = new Date(debt.due_date).getTime();
          return Number.isNaN(timestamp) ? null : timestamp;
        };

        const dateA = getDueDate(a);
        const dateB = getDueDate(b);

        if (dateA === null && dateB === null) return 0;
        if (dateA === null) return 1;
        if (dateB === null) return -1;

        // ใกล้ไปไกล = น้อยไปมาก
        const comparison = dateA - dateB;

        return sortDirection === "asc"
          ? comparison
          : -comparison;
      }

      let comparison = 0;

      switch (sortBy) {
        case "newest": {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();

          comparison =
            dateA !== dateB
              ? dateB - dateA
              : Number(b.id) - Number(a.id);
          break;
        }

        case "amount":
          comparison =
            Number(b.total_amount || 0) -
            Number(a.total_amount || 0);
          break;

        case "remaining":
          comparison =
            Number(b.remaining_amount || 0) -
            Number(a.remaining_amount || 0);
          break;

        default:
          comparison = 0;
      }

      return sortDirection === "desc"
        ? comparison
        : -comparison;
    });


  const totalBorrow = borrowDebts.reduce(
    (sum, debt) => sum + Number(debt.remaining_amount),
    0
  );

  const totalLend = lendDebts.reduce(
    (sum, debt) => sum + Number(debt.remaining_amount),
    0
  );

  //เช็คข้อมูลหนี้สินที่ผู้ใช้เลือกว่ามีอยู่จริงหรือไม่ 
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">
          กำลังโหลดข้อมูลหนี้สิน...
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <p className="text-red-500 text-sm text-center">
          {error}
        </p>
      </div>
    );
  }
  if (showDebtHistory && selectedDebt) {
    return (
      <>
        <DebtPayHistory
          debt={selectedDebt}
          onBack={async () => {
            try {
              await refreshDebts();
            } catch (error) {
              console.error("Refresh debts error:", error);
            }

            setShowDebtHistory(false);
          }}
          onDebtUpdated={refreshDebts}
        />
        <Navbar />
      </>
    );
  }

  return (
    <div className="debts-page pb-20">

      <CustomHeader title="หนี้สินและการให้ยืม" color="var(--color-debts)" />

      <AddDebt
        open={showAddDebt || editingDebt !== null}
        onClose={() => {
          setShowAddDebt(false);
          setEditingDebt(null);
        }}
        currentDebtType={currentDebtType}
        setCurrentDebtType={setCurrentDebtType}
        editingDebt={editingDebt}
        onSubmit={handleSaveDebt}
        friends={friends}
      />

      <PayDebt
        open={showDebtPay}
        debt={selectedDebt}
        onSaved={async () => {
          try {
            await refreshDebts();
          } catch (error) {
            console.error("Refresh debts error:", error);
          }
        }}
        onClose={() => {
          setShowDebtPay(false);
          setSelectedDebt(null);
        }}
      />
      <main className="content">
        {/* ส่วนหัว */}
        <div className="grid grid-cols-2 gap-2 px-5 py-5">

          {/* ต้องจ่ายคืน */}
          <div className="bg-white rounded-lg shadow-md px-4 py-4">
            <p className="text-center text-[13px] text-red-500 mb-3">
              ที่ต้องจ่ายคืน
            </p>

            <div className="flex items-center justify-between">
              <span className="text-red-500 text-[22px] font-bold">
                ฿
              </span>

              <span className="text-[22px] text-gray-700">
                {totalBorrow.toLocaleString()}
              </span>
            </div>
          </div>

          {/* ต้องได้รับคืน */}
          <div className="bg-white rounded-lg shadow-md px-4 py-4">
            <p className="text-center text-[13px] text-green-600 mb-3">
              ที่ต้องได้รับคืน
            </p>

            <div className="flex items-center justify-between">
              <span className="text-red-500 text-[22px] font-bold">
                ฿
              </span>

              <span className="text-[22px] text-gray-700">
                {totalLend.toLocaleString()}
              </span>
            </div>
          </div>

        </div>


        {/*เลือกสถานะหนี้และประเภทรายการ */}
        <div className="mx-5 mb-4 rounded-xl border border-gray-200 bg-white p-3">

          {/* สถานะหนี้: แถบสลับซ้าย-ขวา */}
          <div className="mb-3">
            <p className="mb-2 text-[11px] font-medium text-gray-500">
              สถานะหนี้
            </p>

            <div className="flex w-full rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setActiveStatus("ongoing")}
                className={`flex-1 rounded-md px-2 py-2 text-[11px] font-medium transition-all ${activeStatus === "ongoing"
                  ? "bg-white text-green-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                ยังดำเนินการอยู่
              </button>

              <button
                type="button"
                onClick={() => setActiveStatus("paid")}
                className={`flex-1 rounded-md px-2 py-2 text-[11px] font-medium transition-all ${activeStatus === "paid"
                  ? "bg-white text-green-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                ชำระครบแล้ว
              </button>
            </div>
          </div>

          {/* เส้นแบ่ง */}
          <div className="mb-3 border-t border-gray-100" />

          {/* แท็บเลือกประเภทรายการ */}
          <div>
            <p className="mb-2 text-[11px] font-medium text-gray-500">
              ประเภทรายการ
            </p>

            <div className="flex w-full">
              <button
                type="button"
                onClick={() => setActiveTab("borrow")}
                className={`flex-1 h-[32px] rounded-l-md border text-[12px] transition ${activeTab === "borrow"
                  ? "border-green-500 bg-green-50 text-green-700 font-medium"
                  : "border-gray-300 bg-white text-gray-500"
                  }`}
              >
                ยืมคนอื่น ({borrowDebts.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("lend")}
                className={`flex-1 h-[32px] rounded-r-md border border-l-0 text-[12px] transition ${activeTab === "lend"
                  ? "border-green-500 bg-green-50 text-green-700 font-medium"
                  : "border-gray-300 bg-white text-gray-500"
                  }`}
              >
                ให้คนอื่นยืม ({lendDebts.length})
              </button>
            </div>
          </div>

        </div>


        {/* แถบค้นหาและตัวกรองเรียงรายการ */}
        <div className="bg-white px-5 py-3">
          <div className="flex items-center gap-2">
            {/* ช่องค้นหา */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-700"
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อรายการหนี้..."
                aria-label="ค้นหาชื่อรายการหนี้"
                className="w-full h-9 rounded-full border border-gray-300 pl-8 pr-3 text-sm outline-none focus:border-gray-500 "
              />
            </div>

            {/* ปุ่มเปิดเมนูเรียงลำดับ */}
            <button
              type="button"
              onClick={() => setShowSortMenu((prev) => !prev)}
              aria-label="เลือกวิธีเรียงรายการหนี้"
              aria-expanded={showSortMenu}
              className=" h-9 px-3 rounded-md border border-gray-300 flex items-center justify-center gap-1 bg-white hover:bg-gray-100 "
            >
              <ArrowUpDown size={16} />
              <span className="text-xs">เรียง</span>
            </button>
          </div>

          {/* เมนูตัวเลือกการเรียง */}
          {showSortMenu && (
            <div className="mt-2 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              {[
                { value: "newest", label: "วันที่สร้าง" },
                { value: "amount", label: "ยอดหนี้ทั้งหมด" },
                { value: "remaining", label: "ยอดหนี้คงเหลือ" },
                { value: "dueDate", label: "วันครบกำหนด" },
              ].map((option) => {
                const isSelected = sortBy === option.value;

                const directionLabel =
                  option.value === "newest"
                    ? sortDirection === "desc"
                      ? "ใหม่ไปเก่า"
                      : "เก่าไปใหม่"
                    : option.value === "dueDate"
                      ? sortDirection === "asc"
                        ? "ใกล้ไปไกล"
                        : "ไกลไปใกล้"
                      : sortDirection === "desc"
                        ? "มากไปน้อย"
                        : "น้อยไปมาก";
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSortDirection((prev) =>
                          prev === "desc" ? "asc" : "desc"
                        );
                      } else {
                        setSortBy(option.value);
                        setSortDirection(
                          option.value === "dueDate" ? "asc" : "desc"
                        );
                      }
                    }}
                    className={`w-full px-4 py-3 text-sm flex items-center justify-between gap-3 hover:bg-gray-100 transition ${isSelected
                      ? "bg-gray-100 font-semibold text-gray-900"
                      : "text-gray-700"
                      }`}
                  >
                    <span>{option.label}</span>

                    {isSelected && (
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-xs">{directionLabel}</span>
                        {sortDirection === "desc" ? (
                          <ArrowDown size={16} />
                        ) : (
                          <ArrowUp size={16} />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}


          {/* แสดงวิธีเรียงปัจจุบัน */}
          {(() => {
            const sortLabel = {
              newest: "วันที่สร้าง",
              amount: "ยอดหนี้ทั้งหมด",
              remaining: "ยอดหนี้คงเหลือ",
              dueDate: "วันครบกำหนด",
            }[sortBy];

            const directionLabel =
              sortBy === "newest"
                ? sortDirection === "desc"
                  ? "ใหม่ - เก่า"
                  : "เก่า - ใหม่"
                : sortBy === "dueDate"
                  ? sortDirection === "asc"
                    ? "ใกล้ - ไกล"
                    : "ไกล - ใกล้"
                  : sortDirection === "desc"
                    ? "มาก - น้อย"
                    : "น้อย - มาก";

            return (
              <p className="mt-2 text-xs text-gray-500">
                เรียงตาม: {sortLabel} {directionLabel}
              </p>
            );
          })()}
        </div>

        {/* พื้นที่แสดงรายการ */}
        <div className="px-5 pt-1">
          {filteredDebtsList.length > 0 ? (
            filteredDebtsList.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onDelete={handleDeleteDebt}
                onSendReminder={handleSendDebtReminder}
                sendingReminderId={sendingReminderId}
                onPayment={() => {
                  setSelectedDebt(debt);
                  setShowDebtPay(true);
                }}
                onViewHistory={() => {
                  setSelectedDebt(debt);
                  setShowDebtHistory(true);
                }}
                onCheckPayment={() => {
                  setSelectedDebt(debt);
                  setShowDebtHistory(true);
                }}
                onEdit={(debt) => {
                  setEditingDebt(debt);
                  setCurrentDebtType(
                    debt.type === "borrowed" ? "borrow" : "lend"
                  );
                }}
              />
            ))
          ) : (
            <div className="py-10 text-center text-sm text-gray-500">
              {searchTerm.trim()
                ? `ไม่พบรายการหนี้ที่ตรงกับ "${searchTerm.trim()}"`
                : "ยังไม่มีรายการหนี้ในหมวดนี้"}
            </div>
          )}
        </div>


        {/* ปุ่มเพิ่มรายการ */}
        
        <div className="fixed right-[30px] bottom-[85px] z-[99] flex items-center gap-[10px]">
          <span className="whitespace-nowrap text-sm font-bold text-[#e66f6f]">
            เพิ่มรายการ
          </span>

          <button
            onClick={() => {
              setEditingDebt(null);
              setShowAddDebt(true);
              setCurrentDebtType(activeTab); //เซ็ตประเภทหนี้สินเริ่มต้นตามแท็บที่ผู้ใช้เลือกอยู่
            }}
            
            className="flex h-12 w-12 items-center justify-center rounded-full
                      border border-[#ff9292] bg-[#ffbd3d] text-white
                      shadow-md transition-all duration-200
                      hover:scale-105 hover:bg-[#f57f8b]
                      active:scale-95"
          >
            <Plus size={27} strokeWidth={2.5} />
          </button>
        </div>

      </main >

      {!isPopupOpen && <Navbar />}
    </div >
  );
}

export default Debts;