'use client'
import { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { useRouter } from 'next/navigation';
import '../../styles/Profile.css';
import Cookies from 'js-cookie';

const ProfilePage = () => {
  const { isLoggedIn } = useUser();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle authentication and navigation
  useEffect(() => {
    const token = Cookies.get('token');
    if (!token || !isLoggedIn) {
      router.push('/login');
      return;
    }
  }, [isLoggedIn, router]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = Cookies.get('token');
        if (!token) {
          setLoading(false);
          setError('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
          router.push('/login');
          return;
        }

        const response = await fetch('/api/user/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
            router.push('/login');
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.user) {
          throw new Error('Invalid response format');
        }

        setUserData(data.user);
        setAddresses(data.addresses || []);
        setError(null);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError('Profil bilgileri yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [isLoggedIn, router]);

  if (loading) {
    return <div className="profile-container loading">Yükleniyor...</div>;
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  if (!userData) {
    return <div className="profile-container">Profil bilgileri bulunamadı.</div>;
  }

  return (
    <div className="profile-container">
      <h1>Hesabım</h1>
      
      {userData && (
        <div className="user-info">
          <h2>Kişisel Bilgiler</h2>
          <div className="info-group">
            <p><strong>Ad:</strong> {userData.first_name}</p>
            <p><strong>Soyad:</strong> {userData.last_name}</p>
            <p><strong>E-posta:</strong> {userData.email}</p>
            <p><strong>Telefon:</strong> {userData.phone_number || 'Belirtilmemiş'}</p>
          </div>
        </div>
      )}

      <div className="addresses">
        <h2>Adreslerim</h2>
        {addresses.length > 0 ? (
          <div className="address-list">
            {addresses.map((address) => (
              <div key={address.id} className="address-card">
                <div className="address-header">
                  {address.is_primary && <span className="primary-badge">Varsayılan</span>}
                </div>
                <p>{address.address}</p>
                <p>{address.postal_code} {address.city}/{address.state}</p>
                <p>{address.country}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>Henüz kayıtlı adresiniz bulunmamaktadır.</p>
        )}
      </div>
    </div>
  );
};

export default ProfilePage; 