import liff from '@line/liff';

let initialization;

export function initializeLineLiff() {

  const liffId = import.meta.env.VITE_LINE_LIFF_ID;//เอาidมาจาก.env

  if (!liffId) {
    return Promise.reject(new Error('ยังไม่ได้ตั้งค่า VITE_LINE_LIFF_ID'));
  }

  if (!initialization) {
    initialization = liff.init({ liffId });
  }

  return initialization;
}

export async function readLineIdentity() {

  const profile = await liff.getProfile();
  const idToken = liff.getIDToken();  

  if (!idToken) {
    throw new Error('LINE ไม่ได้ส่งข้อมูลยืนยันตัวตน กรุณาลองเข้าสู่ระบบใหม่');
  }

  return { profile, idToken };
}

export { liff };
