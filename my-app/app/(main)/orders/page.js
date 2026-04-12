'use client'
import { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import '../../styles/Orders.css';

const OrdersPage = () => {
  const { isLoggedIn } = useUser();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/user/orders', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchOrders();
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <div className="container">Please log in to view your orders.</div>;
  }

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Beklemede',
      'processing': 'İşleniyor',
      'shipped': 'Kargoya Verildi',
      'delivered': 'Teslim Edildi',
      'canceled': 'İptal Edildi',
      'returned': 'İade Edildi'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    return `status-badge ${status}`;
  };

  return (
    <div className="orders-container">
      <h1>Siparişlerim</h1>
      
      {orders.length > 0 ? (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Sipariş #{order.id}</h3>
                  <p className="order-date">{new Date(order.created_at).toLocaleDateString('tr-TR')}</p>
                </div>
                <span className={getStatusClass(order.status)}>
                  {getStatusText(order.status)}
                </span>
              </div>
              <div className="order-items">
                {order.items.map((item) => (
                  <div key={item.id} className="order-item">
                    <img src={item.image_url} alt={item.name} className="item-image" />
                    <div className="item-details">
                      <h4>{item.name}</h4>
                      <p className="item-quantity">Adet: {item.quantity}</p>
                      <p className="item-price">{item.price} TL</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="order-footer">
                <p className="total-price">Toplam: {order.total_price} TL</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>Henüz siparişiniz bulunmamaktadır.</p>
      )}
    </div>
  );
};

export default OrdersPage; 