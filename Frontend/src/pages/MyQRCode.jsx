import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import './MyQRCode.css';

function MyQRCode() {

  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {

    const accessToken =
      sessionStorage.getItem('accessToken');

    if (!accessToken) {
      setError('กรุณาเข้าสู่ระบบก่อน');
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
            data.detail || 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้'
          );
        }

        setUser(data);

      })
      .catch(error => {
        setError(
          error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'
        );
      });

  }, []);


  if (error) {
    return (
      <div className="my-qr-page">
        <p>{error}</p>
      </div>
    );
  }


  if (!user) {
    return (
      <div className="my-qr-page">
        <p>กำลังโหลด...</p>
      </div>
    );
  }


  return (
    <div className="my-qr-page">

      {/* HEADER */}

      <header className="my-qr-header">

        <button
          className="my-qr-back"
          onClick={() => navigate(-1)}
        >
          ‹
        </button>

        <h1>QR ของฉัน</h1>

      </header>


      {/* QR CONTENT */}

      <main className="my-qr-content">

        <h2>
          {user.username || 'ผู้ใช้งาน'}
        </h2>

        <p className="my-qr-description">
          ให้เพื่อนสแกน QR Code นี้
          เพื่อเพิ่มคุณเป็นเพื่อน
        </p>


        <div className="my-qr-box">

          <QRCodeSVG
            value={String(user.uid)}
            size={240}
            level="M"
          />

        </div>


        <p className="my-qr-uid">
          UID: {user.uid}
        </p>

      </main>

    </div>
  );
}

export default MyQRCode;