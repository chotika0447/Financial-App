import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, ScanLine, Camera, RotateCcw } from 'lucide-react';
import './ScanFriendQR.css';

function ScanFriendQR() {
  const navigate = useNavigate();

  const scannerRef = useRef(null);
  const processingRef = useRef(false);


  const stopScannerSafely = async (scanner) => {
    if (!scanner) return;

    try {
      const state = scanner.getState();

      // 2 = กำลังสแกน, 3 = หยุดชั่วคราว
      if (state === 2 || state === 3) {
        await scanner.stop();
      }
    } catch (error) {
      console.warn('หยุดกล้องไม่สำเร็จ:', error);
    }
  };

  const [friend, setFriend] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // อ่าน UID จาก QR หลายรูปแบบ
  const extractUID = (text) => {
    const value = text.trim();

    // รูปแบบ JSON เช่น {"uid": "1234567890"}
    try {
      const data = JSON.parse(value);

      if (data.uid != null) {
        return String(data.uid).trim();
      }
    } catch {
      // ถ้าไม่ใช่ JSON ให้ตรวจรูปแบบอื่นต่อ
    }

    // รูปแบบ URL เช่น https://example.com/friends/scan?uid=1234567890
    try {
      const url = new URL(value);
      const uid = url.searchParams.get('uid');

      if (uid) {
        return uid.trim();
      }
    } catch {
      // ถ้าไม่ใช่ URL ให้ตรวจว่าเป็น UID โดยตรงหรือไม่
    }

    // UID ตัวเลข 10 หลัก
    if (/^\d{10}$/.test(value)) {
      return value;
    }

    return null;
  };

  // ค้นหาผู้ใช้ด้วย UID ที่อ่านได้
  const findFriend = async (uid) => {
    const accessToken = sessionStorage.getItem('accessToken');

    if (!accessToken) {
      setError('กรุณาเข้าสู่ระบบก่อนสแกน QR');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setFriend(null);

    try {
      const response = await fetch(
        `/users/search/?uid=${encodeURIComponent(uid)}`,
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
        throw new Error(data.detail || data.error || 'ไม่พบผู้ใช้ UID นี้');
      }

      // ป้องกันการเพิ่มตัวเองเป็นเพื่อน
      const myUID = sessionStorage.getItem('uid');

      if (myUID && String(data.uid) === String(myUID)) {
        throw new Error('นี่คือ QR Code ของคุณเอง ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้');
      }

      setFriend(data);
    } catch (err) {
      setError(err.message || 'ไม่สามารถค้นหาผู้ใช้ได้');
    } finally {
      setLoading(false);
    }
  };

  // เปิดกล้องและเริ่มสแกน
  useEffect(() => {
    let cancelled = false;
    let scanner = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode('friend-qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 230, height: 230 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (processingRef.current || cancelled) return;

            processingRef.current = true;

            try {
              await stopScannerSafely(scanner);
            } catch {
              // กล้องอาจหยุดไปแล้ว
            }

            if (cancelled) return;

            setCameraReady(false);

            const uid = extractUID(decodedText);

            if (!uid) {
              setError('QR Code นี้ไม่มี UID ที่รองรับ กรุณาสแกน QR ของผู้ใช้ในแอป');
              processingRef.current = false;
              return;
            }

            await findFriend(uid);
          },
          () => {
            // ไม่ต้องแสดงข้อผิดพลาดทุกครั้งที่กล้องยังอ่าน QR ไม่สำเร็จ
          }
        );

        if (!cancelled) {
          setCameraReady(true);
        } else {
          await stopScannerSafely(scanner);
        }

      } catch (err) {
        console.error('เปิดกล้องไม่สำเร็จ:', err);
        console.error('Error name:', err?.name);
        console.error('Error message:', err?.message);

        if (!cancelled) {
          setCameraError(
            `เปิดกล้องไม่ได้: ${err?.name || 'UnknownError'} - ${err?.message || 'ไม่ทราบสาเหตุ'
            }`
          );
        }
      }

    };

    startScanner();

    return () => {
      cancelled = true;

      const currentScanner = scannerRef.current;
      scannerRef.current = null;

      if (currentScanner) {
        stopScannerSafely(currentScanner).finally(() => {
          try {
            currentScanner.clear();
          } catch {
            // ตัวสแกนอาจถูกล้างไปแล้ว
          }
        });
      }
    };
  }, []);

  // เริ่มสแกนใหม่หลังอ่าน QR ที่ไม่ถูกต้อง
  const restartScanner = async () => {
    processingRef.current = false;
    setFriend(null);
    setError('');
    setCameraError('');

    const scanner = scannerRef.current;

    if (!scanner) {
      window.location.reload();
      return;
    }

    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          if (processingRef.current) return;

          processingRef.current = true;

          try {
            await stopScannerSafely(scanner);
          } catch { }

          setCameraReady(false);

          const uid = extractUID(decodedText);

          if (!uid) {
            setError('QR Code นี้ไม่มี UID ที่รองรับ');
            processingRef.current = false;
            return;
          }

          await findFriend(uid);
        },
        () => { }
      );

      setCameraReady(true);

    } catch (err) {
      console.error('เปิดกล้องใหม่ไม่สำเร็จ:', err);
      console.error('Error name:', err?.name);
      console.error('Error message:', err?.message);

      setCameraError(
        `เปิดกล้องใหม่ไม่ได้: ${err?.name || 'UnknownError'} - ${err?.message || 'ไม่ทราบสาเหตุ'
        }`
      );
    }

  };

  // ส่งคำขอเป็นเพื่อน
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || 'ส่งคำขอเป็นเพื่อนไม่สำเร็จ'
        );
      }

      alert('ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว');
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scan-friend-page">
      <header className="scan-friend-header">
        <button
          type="button"
          className="scan-friend-back"
          onClick={() => navigate(-1)}
          aria-label="ย้อนกลับ"
        >
          <ArrowLeft size={22} />
        </button>

        <div>
          <h1>สแกน QR เพิ่มเพื่อน</h1>
          <p>สแกน QR Code ของเพื่อนเพื่อดูข้อมูลโปรไฟล์</p>
        </div>
      </header>

      <main className="scan-friend-content">
        {!friend && (
          <section className="scan-friend-camera-card">
            <div className="scan-friend-instruction">
              <ScanLine size={24} />
              <span>วาง QR Code ให้อยู่ในกรอบสแกน</span>
            </div>

            <div className="scan-friend-camera-wrap">
              <div id="friend-qr-reader" />
            </div>

            {cameraReady && (
              <p className="scan-friend-hint">
                <Camera size={16} />
                กำลังเปิดกล้องเพื่อค้นหา QR Code
              </p>
            )}

            {cameraError && (
              <div className="scan-friend-error">
                <p>{cameraError}</p>
                <button type="button" onClick={restartScanner}>
                  <RotateCcw size={16} />
                  ลองเปิดกล้องอีกครั้ง
                </button>
              </div>
            )}

            {loading && (
              <p className="scan-friend-status">กำลังค้นหาข้อมูลโปรไฟล์...</p>
            )}

            {error && !loading && (
              <div className="scan-friend-error">
                <p>{error}</p>
                <button type="button" onClick={restartScanner}>
                  <RotateCcw size={16} />
                  สแกนอีกครั้ง
                </button>
              </div>
            )}
          </section>
        )}

        {friend && (
          <section className="scan-friend-profile">
            {friend.profile_img ? (
              <img
                src={friend.profile_img}
                alt="รูปโปรไฟล์"
                className="scan-friend-avatar"
              />
            ) : (
              <div className="scan-friend-avatar scan-friend-avatar-default">
                👤
              </div>
            )}

            <h2>{friend.username || 'ผู้ใช้'}</h2>
            <p className="scan-friend-uid">UID: {friend.uid}</p>

            <div className="scan-friend-profile-info">
              <div>
                <span>ชื่อผู้ใช้</span>
                <strong>{friend.username || '-'}</strong>
              </div>
              <div>
                <span>UID</span>
                <strong>{friend.uid}</strong>
              </div>
            </div>

            {error && <p className="scan-friend-error-text">{error}</p>}

            <button
              type="button"
              className="scan-friend-add-button"
              onClick={handleAddFriend}
              disabled={loading}
            >
              {loading ? 'กำลังส่งคำขอ...' : 'เพิ่มเพื่อน'}
            </button>

            <button
              type="button"
              className="scan-friend-rescan-button"
              onClick={restartScanner}
              disabled={loading}
            >
              <RotateCcw size={17} />
              สแกนคนอื่น
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default ScanFriendQR;