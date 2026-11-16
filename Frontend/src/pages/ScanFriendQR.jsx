import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import liff from '@line/liff';
import { ArrowLeft, ScanLine, Camera, RotateCcw } from 'lucide-react';
import { initializeLineLiff } from '../lineAuth';
import { authenticatedFetch as fetch } from '../utils/auth';
import './ScanFriendQR.css';

const READER_ID = 'friend-qr-reader';

function extractUID(text) {
  const value = String(text ?? '').trim();
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && parsed.uid != null) {
      return String(parsed.uid).trim() || null;
    }
  } catch { /* Not JSON */ }
  try {
    const url = new URL(value);
    const uid = url.searchParams.get('uid');
    if (uid) return uid.trim();
  } catch { /* Not URL */ }
  return /^\d{10}$/.test(value) ? value : null;
}

function ScanFriendQR() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(false);
  const generationRef = useRef(0);
  const liffInitializedRef = useRef(false);
  const [friend, setFriend] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraDiagnostics, setCameraDiagnostics] = useState('');
  const [scannerMode, setScannerMode] = useState('browser');
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [scanActive, setScanActive] = useState(false);

  const logScannerDiagnostic = useCallback(async (event, extra = {}) => {
    let cameraPermission = 'unsupported';
    try {
      if (navigator.permissions?.query) {
        const permission = await navigator.permissions.query({ name: 'camera' });
        cameraPermission = permission.state;
      }
    } catch (err) {
      cameraPermission = `${err?.name || 'Error'}: ${err?.message || String(err)}`;
    }

    let videoInputCount = 'unavailable';
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoInputCount = devices.filter((device) => device.kind === 'videoinput').length;
      }
    } catch (err) {
      videoInputCount = `${err?.name || 'Error'}: ${err?.message || String(err)}`;
    }

    let liffInClient = null;
    let liffScanCodeAvailable = null;
    let liffCheckError = null;
    if (liffInitializedRef.current) {
      try {
        liffInClient = liff.isInClient();
        liffScanCodeAvailable = liffInClient && liff.isApiAvailable('scanCodeV2');
      } catch (err) {
        liffCheckError = `${err?.name || 'Error'}: ${err?.message || String(err)}`;
      }
    }

    const diagnostics = {
      event,
      timestamp: new Date().toISOString(),
      page: `${window.location.origin}${window.location.pathname}`,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isLineBrowser: /Line\//i.test(navigator.userAgent),
      isSecureContext: window.isSecureContext,
      mediaDevicesAvailable: Boolean(navigator.mediaDevices),
      getUserMediaAvailable: Boolean(navigator.mediaDevices?.getUserMedia),
      cameraPermission,
      videoInputCount,
      liffInitialized: liffInitializedRef.current,
      liffInClient,
      liffScanCodeAvailable,
      liffCheckError,
      ...extra,
    };

    console.info('[QR_SCAN_DIAGNOSTIC]', diagnostics);
    return diagnostics;
  }, []);

  const stopBrowserScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if ([2, 3].includes(scanner.getState())) await scanner.stop();
    } catch (err) {
      console.warn('หยุดกล้องไม่สำเร็จ:', err);
    }
    try { scanner.clear(); } catch { /* Already cleared */ }
  }, []);

  const findFriend = useCallback(async (uid) => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setError('กรุณาเข้าสู่ระบบก่อนสแกน QR');
      return;
    }
    setLoading(true);
    setError('');
    setFriend(null);
    try {
      const response = await fetch(`/users/search/?uid=${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || 'ไม่พบผู้ใช้ UID นี้');
      const myUID = sessionStorage.getItem('uid');
      if (myUID && String(data.uid) === String(myUID)) {
        throw new Error('นี่คือ QR Code ของคุณเอง ไม่สามารถเพิ่มตัวเองเป็นเพื่อนได้');
      }
      if (mountedRef.current) setFriend(data);
    } catch (err) {
      if (mountedRef.current) setError(err.message || 'ไม่สามารถค้นหาผู้ใช้ได้');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const handleDecoded = useCallback(async (text, generation) => {
    if (!mountedRef.current || generation !== generationRef.current || processingRef.current) return;
    processingRef.current = true;
    void logScannerDiagnostic('qr-decoded');
    setCameraReady(false);
    setScanActive(false);
    await stopBrowserScanner();
    if (!mountedRef.current || generation !== generationRef.current) return;
    const uid = extractUID(text);
    if (!uid) {
      setError('QR Code นี้ไม่มี UID ที่รองรับ กรุณาสแกน QR ของผู้ใช้ในแอป');
      return;
    }
    await findFriend(uid);
  }, [findFriend, logScannerDiagnostic, stopBrowserScanner]);

  const startScan = useCallback(async () => {
    const generation = ++generationRef.current;
    processingRef.current = false;
    setFriend(null);
    setError('');
    setCameraError('');
    setCameraDiagnostics('');
    setCameraReady(false);
    setScanActive(true);

    if (!mountedRef.current || generation !== generationRef.current) return;

    const inLiff = liffInitializedRef.current && Boolean(liff.isInClient());
    const canUseLiffScan = inLiff && Boolean(liff.isApiAvailable('scanCodeV2'));
    void logScannerDiagnostic(canUseLiffScan ? 'using-liff-scanner' : 'using-browser-camera');
    if (canUseLiffScan) {
      setScannerMode('liff');
      try {
        const result = await liff.scanCodeV2();
        if (!mountedRef.current || generation !== generationRef.current) return;
        if (result?.value) await handleDecoded(result.value, generation);
        else {
          setScanActive(false);
          setError('ยังไม่ได้สแกน QR Code กรุณาลองอีกครั้ง');
        }
      } catch (err) {
        if (!mountedRef.current || generation !== generationRef.current) return;
        setScanActive(false);
        const diagnostics = await logScannerDiagnostic('liff-scan-failed', {
          errorName: err?.name || 'Error',
          errorMessage: err?.message || String(err),
        });
        if (mountedRef.current && generation === generationRef.current) {
          setCameraDiagnostics(JSON.stringify(diagnostics, null, 2));
        }
        // A native scanner failure should not automatically start another
        // camera session in the same WebView.
        setCameraError(`ไม่สามารถสแกนผ่าน LINE ได้: ${err?.message || 'กรุณาลองอีกครั้งหรือเปิดผ่านเบราว์เซอร์ภายนอก'}`);
      }
      return;
    }

    setScannerMode('browser');
    // LINE's ordinary in-app browser may block camera access even on HTTPS.
    // Still try the browser camera, but show a helpful fallback on failure.
    try {
      if (scannerRef.current) await stopBrowserScanner();
      if (!mountedRef.current || generation !== generationRef.current) return;
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 },
        (decodedText) => { void handleDecoded(decodedText, generation); },
        () => {}
      );
      if (!mountedRef.current || generation !== generationRef.current) {
        await stopBrowserScanner();
        return;
      }
      void logScannerDiagnostic('browser-camera-started');
      setScanActive(false);
      setCameraReady(true);
    } catch (err) {
      await stopBrowserScanner();
      if (mountedRef.current && generation === generationRef.current) {
        const diagnostics = await logScannerDiagnostic('browser-camera-start-failed', {
          errorName: err?.name || 'Error',
          errorMessage: err?.message || String(err),
        });
        console.error('[QR_SCAN_DIAGNOSTIC] Browser camera failed', err, diagnostics);
        if (mountedRef.current && generation === generationRef.current) {
          setCameraDiagnostics(JSON.stringify(diagnostics, null, 2));
        }
        setScanActive(false);
        setCameraError('ไม่สามารถเปิดกล้องได้ในเบราว์เซอร์นี้ กรุณาตรวจสอบสิทธิ์กล้อง หรือเปิดหน้าเว็บผ่าน Chrome/Safari');
      }
    }
  }, [handleDecoded, logScannerDiagnostic, stopBrowserScanner]);

  useEffect(() => {
    mountedRef.current = true;
    void logScannerDiagnostic('scanner-page-ready');
    initializeLineLiff()
      .then(() => {
        liffInitializedRef.current = true;
        void logScannerDiagnostic('liff-initialized');
      })
      .catch((err) => {
        console.warn('เริ่มต้น LIFF ไม่สำเร็จ ใช้กล้องของเบราว์เซอร์แทน:', err);
        void logScannerDiagnostic('liff-initialization-failed', {
          errorName: err?.name || 'Error',
          errorMessage: err?.message || String(err),
        });
      })
      .finally(() => {
        if (mountedRef.current) setScannerInitialized(true);
      });
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      void stopBrowserScanner();
    };
  }, [logScannerDiagnostic, stopBrowserScanner]);

  const restartScanner = () => { void startScan(); };

  const handleAddFriend = async () => {
    if (!friend || loading) return;
    const token = sessionStorage.getItem('accessToken');
    if (!token) { setError('กรุณาเข้าสู่ระบบก่อนเพิ่มเพื่อน'); return; }
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/friends/request/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiver: String(friend.uid) }),
      });
      const raw = await response.text();
      let data = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* Non-JSON response */ }
      if (!response.ok) throw new Error(data.detail || data.error || `ส่งคำขอเป็นเพื่อนไม่สำเร็จ (HTTP ${response.status})`);
      alert('ส่งคำขอเป็นเพื่อนเรียบร้อยแล้ว');
      navigate('/profile');
    } catch (err) {
      setError(err.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <div className="scan-friend-page">
      <header className="scan-friend-header">
        <button type="button" className="scan-friend-back" onClick={() => navigate(-1)} aria-label="ย้อนกลับ">
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
              <div id={READER_ID} />
            </div>
            {cameraReady && (
              <p className="scan-friend-hint"><Camera size={16} />กำลังเปิดกล้องเพื่อค้นหา QR Code</p>
            )}
            {scanActive && scannerMode === 'liff' && (
              <p className="scan-friend-hint">ใช้เครื่องสแกน QR ของ LINE</p>
            )}
            {scanActive && scannerMode === 'browser' && (
              <p className="scan-friend-hint">กำลังขอสิทธิ์และเปิดกล้อง...</p>
            )}
            {!cameraReady && !scanActive && !cameraError && !error && !loading && (
              <button
                type="button"
                className="scan-friend-start-button"
                onClick={restartScanner}
                disabled={!scannerInitialized}
              >
                <ScanLine size={18} />
                {scannerInitialized ? 'เริ่มสแกน QR' : 'กำลังเตรียมเครื่องสแกน...'}
              </button>
            )}
            {cameraError && (
              <div className="scan-friend-error">
                <p>{cameraError}</p>
                <button type="button" onClick={restartScanner}><RotateCcw size={16} />ลองเปิดกล้องอีกครั้ง</button>
                <p>หากเปิดจาก Rich Menu แล้วกล้องไม่ทำงาน ให้เปิดแอปผ่าน LIFF URL หรือเปิดใน Chrome/Safari</p>
                {cameraDiagnostics && (
                  <details className="scan-friend-diagnostics">
                    <summary>รายละเอียดสำหรับตรวจสอบ</summary>
                    <pre>{cameraDiagnostics}</pre>
                  </details>
                )}
              </div>
            )}
            {loading && <p className="scan-friend-status">กำลังค้นหาข้อมูลโปรไฟล์...</p>}
            {error && !loading && (
              <div className="scan-friend-error">
                <p>{error}</p>
                <button type="button" onClick={restartScanner}><RotateCcw size={16} />สแกนอีกครั้ง</button>
              </div>
            )}
          </section>
        )}

        {friend && (
          <section className="scan-friend-profile">
            {friend.profile_img ? (
              <img src={friend.profile_img} alt="รูปโปรไฟล์" className="scan-friend-avatar" />
            ) : (
              <div className="scan-friend-avatar scan-friend-avatar-default">👤</div>
            )}
            <h2>{friend.username || 'ผู้ใช้'}</h2>
            <p className="scan-friend-uid">UID: {friend.uid}</p>
            <div className="scan-friend-profile-info">
              <div><span>ชื่อผู้ใช้</span><strong>{friend.username || '-'}</strong></div>
              <div><span>UID</span><strong>{friend.uid}</strong></div>
            </div>
            {error && <p className="scan-friend-error-text">{error}</p>}
            <button type="button" className="scan-friend-add-button" onClick={handleAddFriend} disabled={loading}>
              {loading ? 'กำลังส่งคำขอ...' : 'เพิ่มเพื่อน'}
            </button>
            <button type="button" className="scan-friend-rescan-button" onClick={restartScanner} disabled={loading}>
              <RotateCcw size={17} />สแกนคนอื่น
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

export default ScanFriendQR;
