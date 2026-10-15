import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QrCode, ScanLine } from 'lucide-react';
import './AddFriend.css';

function AddFriend() {

  const navigate = useNavigate();
  const location = useLocation();

  const [uid, setUid] = useState('');
  const [friend, setFriend] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  useEffect(() => {

    if (location.state?.friend) {

      setFriend(location.state.friend);

      // ล้าง state เพื่อไม่ให้กด back แล้วข้อมูลเดิมติดมาอีก
      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }

  }, [location, navigate]);

  const handleSearch = async (event) => {

    event.preventDefault();

    if (!uid.trim()) {
      setError('กรุณากรอก UID');
      setFriend(null);
      return;
    }

    setLoading(true);
    setError('');
    setFriend(null);

    try {

      const accessToken =
        sessionStorage.getItem('accessToken');

      /*
       * เปลี่ยน URL ตรงนี้ให้ตรงกับ API
       * ของ Backend ที่ใช้ค้นหาผู้ใช้ด้วย UID
       */

      const response = await fetch(
        `/users/search/?uid=${encodeURIComponent(uid.trim())}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || 'ไม่พบผู้ใช้'
        );
      }

      setFriend(data);

    } catch (searchError) {

      setError(
        searchError.message || 'ไม่พบผู้ใช้'
      );

    } finally {
      setLoading(false);
    }
  };



  const handleAddFriend = async () => {
    if (!friend) return;

    const accessToken = sessionStorage.getItem('accessToken');

    if (!accessToken) {
      setError('กรุณาเข้าสู่ระบบก่อนเพิ่มเพื่อน');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/friends/request/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiver: String(friend.uid),
        }),
      });


      const responseText = await response.text();

      let data = {};

      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            `เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON (HTTP ${response.status}): ${responseText.slice(0, 200)
            }`
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
          data.error ||
          `ส่งคำขอเป็นเพื่อนไม่สำเร็จ (HTTP ${response.status})`
        );
      }

      if (!responseText.trim()) {
        throw new Error(
          `เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลกลับมา (HTTP ${response.status})`
        );
      }


      alert('ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว');
      navigate('/profile');

    } catch (error) {
      setError(error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="add-friend-page">

      {/* ================= HEADER ================= */}

      <header className="add-friend-header">

        {/* ปุ่มกลับด้านซ้าย และเนื้อหาด้านขวา */}
        <button
          className="add-friend-back"
          onClick={() => navigate(-1)}
          aria-label="ย้อนกลับ"
        >
          ‹
        </button>

        <div className="add-friend-header-content">

          {/* แถวบน: ชื่อหน้า */}
          <div className="add-friend-topbar">
            <h1>ค้นหาเพื่อน</h1>
          </div>

          {/* แถวล่าง: ช่องค้นหา + QR */}
          <div className="add-friend-search-row">

            <form
              className="friend-search"
              onSubmit={handleSearch}
            >
              <span className="search-icon">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16" y1="16" x2="21" y2="21" />
                </svg>
              </span>

              <input
                type="text"
                placeholder="ค้นหาด้วย UID"
                value={uid}
                onChange={(event) => setUid(event.target.value)}
              />
            </form>

            {/* ปุ่ม QR ทางขวาของช่องค้นหา */}
            <div className="add-friend-qr-actions">

              <button
                type="button"
                className="add-friend-qr-option"
                onClick={() => navigate('/friends/scan-qr')}
              >
                <ScanLine size={22} />
                <span>สแกน QR</span>
              </button>

              <button
                type="button"
                className="add-friend-qr-option"
                onClick={() => navigate('/friends/my-qr')}
              >
                <QrCode size={22} />
                <span>QR ของฉัน</span>
              </button>

            </div>

          </div>

          <p className="friend-search-help">
            กรุณากรอก UID ของผู้ใช้ที่ต้องการเพิ่มเพื่อน
          </p>

        </div>

      </header>

      {/* ================= RESULT ================= */}

      <main className="add-friend-content">

        {loading && (
          <p className="friend-status">
            กำลังค้นหา...
          </p>
        )}


        {error && !loading && (
          <p className="friend-error">
            {error}
          </p>
        )}


        {friend && !loading && (

          <div className="friend-result">

            {friend.profile_img ? (

              <img
                src={friend.profile_img}
                alt="รูปโปรไฟล์"
                className="friend-result-avatar"
              />

            ) : (

              <div className="friend-result-avatar default">
                <span>👤</span>
              </div>

            )}


            <h2>
              {friend.username}
            </h2>

            <p>
              UID: {friend.uid}
            </p>


            <button
              className="confirm-add-friend"
              onClick={handleAddFriend}
              disabled={loading}
            >
              {loading ? 'กำลังส่งคำขอ...' : 'เพิ่มเพื่อน'}
            </button>

          </div>

        )}

      </main>

    </div>
  );
}

export default AddFriend;