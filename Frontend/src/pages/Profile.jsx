import { useEffect, useState } from 'react';

function Profile() {

  const [user, setUser] = useState(null);

  useEffect(() => {

    const accessToken =
      sessionStorage.getItem('accessToken');

    fetch('http://127.0.0.1:8000/api/users/me/', {
      method: 'GET',

      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
      .then(response => response.json())
      .then(data => {
        console.log('User:', data);
        setUser(data);
      });

  }, []);

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>Profile</h1>

      <p>ID: {user.id}</p>
      <p>Username: {user.username}</p>
      <p>Email: {user.email}</p>
    </div>
  );
}

export default Profile;