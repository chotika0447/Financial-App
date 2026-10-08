import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AddFriend.css';

function AddFriend() {

  const navigate = useNavigate();

  const [uid, setUid] = useState('');
  const [friend, setFriend] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


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

    if (!friend) {
      return;
    }

    /*
     * TODO:
     * เรียก API เพิ่มเพื่อน
     */

    console.log('Add friend:', friend);

    alert('เพิ่มเพื่อนสำเร็จ');

    navigate('/profile');
  };


  return (
    <div className="add-friend-page">

      {/* ================= HEADER ================= */}

      <header className="add-friend-header">

        <button
          className="add-friend-back"
          onClick={() => navigate(-1)}
        >
          ‹
        </button>

        <h1>ค้นหาเพื่อน</h1>

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
              <line
                x1="16"
                y1="16"
                x2="21"
                y2="21"
              />
            </svg>
          </span>

          <input
            type="text"
            placeholder=""
            value={uid}
            onChange={(event) =>
              setUid(event.target.value)
            }
          />

        </form>

        <p className="friend-search-help">
          กรุณากรอก UID ของผู้ใช้ที่ต้องการเพิ่มเพื่อน
        </p>

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
            >
              เพิ่มเพื่อน
            </button>

          </div>

        )}

      </main>

    </div>
  );
}

export default AddFriend;