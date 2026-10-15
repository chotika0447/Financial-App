import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState('');

  const [form, setForm] = useState({
    email: '',
    age: '',
    occupation: '',
    monthly_income: '',
  });

  const accessToken = sessionStorage.getItem('accessToken');

  //โหลดข้อมูล Profile
  useEffect(() => {
    if (!accessToken) {
      return;
    }

    fetch('/users/me/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
      .then(async response => {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || 'โหลดข้อมูลโปรไฟล์ไม่สำเร็จ'
          );
        }

        setUser(data);

        setForm({
          email: data.email ?? '',
          age: data.age ?? '',
          occupation: data.occupation ?? '',
          monthly_income: data.monthly_income ?? '',
        });
      })
      .catch(fetchError => {
        setError(fetchError.message);
      });
  }, [accessToken]);

  //ดึงข้อมูลเพื่อนจาก Backend
  useEffect(() => {
    if (!accessToken) {
      setFriendsLoading(false);
      return;
    }

    const fetchFriends = async () => {
      setFriendsLoading(true);
      setFriendsError('');

      try {
        const response = await fetch('/friends/list/', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || 'โหลดรายชื่อเพื่อนไม่สำเร็จ'
          );
        }

        setFriends(Array.isArray(data) ? data : []);
      } catch (error) {
        setFriendsError(error.message || 'ไม่สามารถโหลดรายชื่อเพื่อนได้');
      } finally {
        setFriendsLoading(false);
      }
    };

    fetchFriends();
  }, [accessToken]);


  const handleSave = async event => {
    event.preventDefault();

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/users/me/', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email.trim(),
          age: form.age ? Number(form.age) : null,
          occupation: form.occupation.trim(),
          monthly_income: form.monthly_income,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.age?.[0] ||
          data.occupation?.[0] ||
          data.monthly_income?.[0] ||
          data.detail ||
          'บันทึกข้อมูลไม่สำเร็จ'
        );
      }

      setUser(data);

      setForm({
        email: data.email ?? '',
        age: data.age ?? '',
        occupation: data.occupation ?? '',
        monthly_income: data.monthly_income ?? '',
      });

      setEditing(false);

    } catch (saveError) {
      setError(
        saveError.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      email: user.email ?? '',
      age: user.age ?? '',
      occupation: user.occupation ?? '',
      monthly_income: user.monthly_income ?? '',
    });

    setError('');
    setEditing(false);
  };

  if (!user) {
    return (
      <div className="profile-loading">
        {error ||
          (accessToken
            ? 'กำลังโหลดโปรไฟล์...'
            : 'กรุณาเข้าสู่ระบบก่อนดูโปรไฟล์')}
      </div>
    );
  }

  const handleDeleteFriend = async (friend) => {
    const confirmed = window.confirm(
      `ต้องการลบ ${friend.name} ออกจากเพื่อนหรือไม่?`
    );

    if (!confirmed) return;

    setFriendsError('');

    try {
      const response = await fetch(`/friends/${friend.id}/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || 'ลบเพื่อนไม่สำเร็จ'
        );
      }

      setFriends((currentFriends) =>
        currentFriends.filter((item) => item.id !== friend.id)
      );
    } catch (error) {
      setFriendsError(error.message || 'ไม่สามารถลบเพื่อนได้');
    }
  };

  return (
    <div className="profile-page">

      {/* ================= HEADER ================= */}
      <header className="profile-header">

        <button
          className="profile-back"
          onClick={() => navigate(-1)}
        >
          ‹
        </button>

        <h1>โปรไฟล์ของฉัน</h1>

        <button
          className="profile-setting"
          onClick={() => navigate('/settings')}
          aria-label="ตั้งค่า"
        >
          ⚙
        </button>

      </header>


      {/* ================= PROFILE AREA ================= */}
      <main className="profile-content">

        {/* Profile Image */}
        <div className="profile-image-wrapper">

          {user.profile_img ? (
            <img
              className="profile-avatar"
              src={user.profile_img}
              alt="รูปโปรไฟล์"
            />
          ) : (
            <div className="profile-avatar profile-avatar-default">
              <span>👤</span>
            </div>
          )}

        </div>


        {/* Name */}
        <h2 className="profile-name">
          {user.username || 'ผู้ใช้งาน'}
        </h2>

        <div className="profile-uid">
          UID: {user.uid}
        </div>


        {error && (
          <p className="profile-error">
            {error}
          </p>
        )}


        {/* ================= EDIT MODE ================= */}
        {editing ? (

          <form
            className="profile-form"
            onSubmit={handleSave}
          >

            <div className="form-group">
              <label htmlFor="profile-email">
                อีเมล
              </label>

              <input
                id="profile-email"
                type="email"
                value={form.email}
                onChange={event =>
                  setForm({
                    ...form,
                    email: event.target.value,
                  })
                }
              />
            </div>


            <div className="form-group">
              <label htmlFor="profile-age">
                อายุ (ปี)
              </label>

              <input
                id="profile-age"
                type="number"
                min="1"
                step="1"
                value={form.age}
                onChange={event =>
                  setForm({
                    ...form,
                    age: event.target.value,
                  })
                }
                required
              />
            </div>


            <div className="form-group">
              <label htmlFor="profile-occupation">
                อาชีพ
              </label>

              <input
                id="profile-occupation"
                type="text"
                maxLength="100"
                value={form.occupation}
                onChange={event =>
                  setForm({
                    ...form,
                    occupation: event.target.value,
                  })
                }
                required
              />
            </div>


            <div className="form-group">
              <label htmlFor="profile-income">
                รายได้ต่อเดือน (บาท)
              </label>

              <input
                id="profile-income"
                type="number"
                min="0"
                step="0.01"
                value={form.monthly_income}
                onChange={event =>
                  setForm({
                    ...form,
                    monthly_income: event.target.value,
                  })
                }
                required
              />
            </div>


            <div className="profile-actions">

              <button
                className="btn-save"
                type="submit"
                disabled={saving}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>

              <button
                className="btn-cancel"
                type="button"
                onClick={handleCancel}
                disabled={saving}
              >
                ยกเลิก
              </button>

            </div>

          </form>

        ) : (

          <>
            {/* ================= USER INFO ================= */}
            <div className="profile-info-card">

              <div className="info-row">
                <span>อายุ :</span>
                <strong>
                  {user.age ?? '-'}
                </strong>
              </div>

              <div className="info-row">
                <span>อาชีพ :</span>
                <strong>
                  {user.occupation || '-'}
                </strong>
              </div>

              <div className="info-row">
                <span>เงินเดือน :</span>
                <strong>
                  {user.monthly_income
                    ? `${Number(user.monthly_income).toLocaleString()} บาท`
                    : '-'}
                </strong>
              </div>

              <div className="info-row">
                <span>อีเมล :</span>
                <strong>
                  {user.email || '-'}
                </strong>
              </div>

            </div>


            {/* ================= EDIT BUTTON ================= */}
            <button
              className="edit-profile-button"
              onClick={() => setEditing(true)}
            >
              แก้ไขข้อมูลส่วนตัว
            </button>


            {/* ================= FRIENDS ================= */}
            <section className="friends-section">
              <h3>เพื่อนของฉัน</h3>

              <div className="friends-card">
                {friendsLoading ? (
                  <p>กำลังโหลดรายชื่อเพื่อน...</p>
                ) : friendsError ? (
                  <p className="profile-error">{friendsError}</p>
                ) : friends.length === 0 ? (
                  <p>ยังไม่มีเพื่อนในระบบ</p>
                ) : (
                  friends.map((friend) => {
                    const isSender =
                      String(friend.sender) === String(user.uid);

                    const friendName = isSender
                      ? friend.receiver_name
                      : friend.sender_name;

                    return (
                      <div className="friend-item" key={friend.id}>
                        <div className="friend-avatar">
                          👤
                        </div>

                        <span>{friendName || 'ผู้ใช้งาน'}</span>

                        <button
                          className="delete-friend-button"
                          onClick={() =>
                            handleDeleteFriend({
                              id: friend.id,
                              name: friendName || 'ผู้ใช้งาน',
                            })
                          }
                          aria-label={`ลบ ${friendName || 'เพื่อน'}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <button
                className="add-friend-button"
                onClick={() => navigate('/friends/add')}
              >
                + เพิ่มเพื่อน
              </button>
            </section>

          </>

        )}

      </main>

    </div>
  );
}

export default Profile;