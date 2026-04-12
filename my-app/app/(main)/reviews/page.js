'use client'
import { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import '../../styles/Reviews.css';

const ReviewsPage = () => {
  const { isLoggedIn } = useUser();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch('/api/user/reviews', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isLoggedIn) {
      fetchReviews();
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <div className="container">Please log in to view your reviews.</div>;
  }

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="reviews-container">
      <h1>Değerlendirmelerim</h1>
      
      {reviews.length > 0 ? (
        <div className="reviews-list">
          {reviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <div className="product-info">
                  <img src={review.product_image} alt={review.product_name} className="product-image" />
                  <h3>{review.product_name}</h3>
                </div>
                <div className="review-date">
                  {new Date(review.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>
              
              <div className="review-content">
                <div className="rating">
                  <span className="stars">{renderStars(review.star)}</span>
                  <span className="rating-text">{review.star}/5</span>
                </div>
                <p className="review-text">{review.content}</p>
              </div>

              {review.parent_id && (
                <div className="review-replies">
                  <h4>Yanıtlar</h4>
                  {review.replies.map((reply) => (
                    <div key={reply.id} className="reply-card">
                      <p className="reply-author">{reply.user_name}</p>
                      <p className="reply-text">{reply.content}</p>
                      <p className="reply-date">
                        {new Date(reply.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>Henüz değerlendirmeniz bulunmamaktadır.</p>
      )}
    </div>
  );
};

export default ReviewsPage; 