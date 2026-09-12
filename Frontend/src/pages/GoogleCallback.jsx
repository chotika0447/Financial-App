import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function GoogleCallback() {

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {

    // const params = new URLSearchParams(
    //   window.location.search
    // );

    console.log('Path:', location.pathname);
    console.log('Search:', location.search);

    const params = new URLSearchParams(location.search);

    const access = params.get('access');
    const refresh = params.get('refresh');

    console.log(
      'Access Token:',
      access ? 'ได้รับแล้ว' : 'ไม่มี'
    );

    console.log(
      'Refresh Token:',
      refresh ? 'ได้รับแล้ว' : 'ไม่มี'
    );
    
    if (access && refresh) {

      sessionStorage.setItem(
        'accessToken',
        access
      );

      sessionStorage.setItem(
        'refreshToken',
        refresh
      );

      navigate('/profile/');
    }

  }, [navigate]);

  return (
    <div>
      <h1>กำลังเข้าสู่ระบบ...</h1>
    </div>
  );
}

export default GoogleCallback;