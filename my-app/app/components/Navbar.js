'use client'
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import '../styles/Navbar.css'
import SearchBar from './SearchBar';
import CategoryMenu from './CategoryMenu'


/*
İletişim
Teklif Al


*/
const Navbar = () => {
  //const [cartCount, setCartCount] = useState(0);
  //const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const { cartCount } = useCart();
  const { isLoggedIn, logout, checkLoginStatus } = useUser();
  const [openCategories,setOpenCategories] = useState(false)
  const [isInCategories, setIsInCategories] = useState(false)
  const [categories, setCategories] = useState([])
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Check login status when component mounts and when token changes
  useEffect(() => {
    console.log('Navbar mounted, checking login status');
    const token = Cookies.get('token');
    console.log('Token in Navbar:', token);
    checkLoginStatus();

    // Listen for token changes
    const interval = setInterval(() => {
      const currentToken = Cookies.get('token');
      if (currentToken !== token) {
        console.log('Token changed, updating login status');
        checkLoginStatus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [checkLoginStatus]);

  useEffect(() => {
    console.log('isLoggedIn in Navbar changed:', isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => { 
    console.log("isLoggedIn in Navbar",isLoggedIn)
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/web-categories',
        {credentials: 'include',});
        if (!res.ok) {
          throw new Error(`Error fetching web categories: ${res.status}`);
        }
        const data = await res.json();
        console.log("Web Categories Data:", data);
        setCategories(data);
      } catch (err) {
        console.error('Failed to fetch web categories:', err);
      }
    };
    fetchCategories();
  }, []);



  
  const handleLogout =  async () => {
    console.log('Logging out...');
    await logout()
    /*try {
      const response = await fetch('/api/auth/logout', {
        method: 'GET',
      });

      if (response.ok) {
        setIsLoggedIn(false); // Update state after successful logout
        //setCartCount(0); // Optionally clear cart or leave it as is
        router.push('/'); // Redirect to home page
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  */
  
 };

  /*const handleCartData = async () => {
    const cart = JSON.parse(Cookies.get("cart"))
    setCartCount(cart.length)
  };*/

  const handleTokenData = async () => {
    try{
      /*const response = await fetch('/api/auth/login', {
        method: 'GET',
      });
      if(response.ok) {
        const data = await response.json();
        const token = data.token
        if (token) {
          setIsLoggedIn(true);
        }
      }else {
        console.log("Error Getting Token Response is Not OK");
      }*/
      if(Cookies.get('token')){
        const token = JSON.parse(Cookies.get('token'))
        console.log("Token")
      }
      


    }catch(error){
      console.error("Error Getting Token",error)
    }
  }

  const goHome = () => {
    router.push('/')
  }

  const handleProfileClick = (path) => {
    router.push(path);
    setShowProfileMenu(false);
  };

  return (
    <nav >
      <div id='upper-navbar'>
        <Link href="/" id='toptanteklifal-link' className='upper-div-link'>Toptan Teklif Al</Link>
        <Link href="/" id='destek-link' className='upper-div-link'>Destek</Link>
        <Link href="/" id='destek-link' className='upper-div-link'>Hakkımızda</Link>
        <Link href="/" id='destek-link' className='upper-div-link'>İletişim</Link>
      </div>
      <div id='navbar'>
      <div id='logo' onClick={goHome}>
        <svg id='logo-img' viewBox="0 0 779.32 207" xmlns="http://www.w3.org/2000/svg" aria-label="Logo">
          <path fill="currentColor" d="M359.44,0c-67.8,0-118.2,51.6-118.2,116.1,0,54.9,44.1,90.9,101.4,90.9,67.8,0,118.2-51.9,118.2-116.7,0-54.3-44.1-90.3-101.4-90.3ZM345.64,161.4c-29.7,0-50.7-19.5-50.7-48.6,0-36.9,26.4-67.2,61.5-67.2,29.7,0,50.7,19.5,50.7,48.6,0,36.9-26.4,67.2-61.5,67.2Z"/>
          <path fill="currentColor" d="M584.65,0l-59.1,78.52-17.94-48.49c-4.61-14.03,7.39-28.74,23.39-30.03h-88.26l49.5,124.12-11.27,51.36c-4.98,20.52-17.98,28.7-28.98,31.52h74.15l17.7-82.88,60.45-70.76-.3.64s.33-.52.97-1.44l20.48-23.97C643,7,642,5,665.33,0"/>
          <path fill="currentColor" d="M679.95,0l-101.66,174.09c-10.29,16.91-24.29,27.75-42.18,32.91h82.94l17.1-33.48h82.8l3.9,33.48h53.4l-25.63-165.97C748,10,779.32,0,779.32,0M659.25,130.02l45.9-82.8,9.9,82.8h-55.8Z"/>
          <path fill="currentColor" d="M195.45,0l-26.7,125.22L114.45,0h-53.1L28.52,154.15c-7.52,29.85-9.52,44.85-28.52,52.85h68.85l27.9-130.38,56.7,130.38h49.8l37.64-173.96C248,8,255,2,273.89,0"/>
        </svg>
      </div>
      
      <SearchBar/>
      <Link href="/" id='tasarla-text' className='tasarla-link'>
      <img src="/draw.svg" alt="Draw Icon" id='draw-icon' />
      <span id='tasarla-text'>Sulama Sistemi Tasarla</span>
      </Link>  
      {!isLoggedIn ? (
        <Link href="/login" id='giris-text'>Giriş</Link>
      ) : (
        <div 
          className="profile-menu-container" 
          onMouseEnter={() => setShowProfileMenu(true)}
          onMouseLeave={() => setShowProfileMenu(false)}
        >
          <div className="profile-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"/>
            </svg>
            <span className="profile-icon-text">Hesabım</span>
          </div>
          {showProfileMenu && (
            <div className="profile-dropdown">
              <div onClick={() => handleProfileClick('/profile')}>Hesabım</div>
              <div onClick={() => handleProfileClick('/orders')}>Siparişlerim</div>
              <div onClick={() => handleProfileClick('/reviews')}>Değerlendirmelerim</div>
              <div onClick={handleLogout}>Çıkış</div>
            </div>
          )}
        </div>
      )}
      
       <Link href="/cart" id='cart-link' /*style={{ color: '#000000', textDecoration: 'none' }}*/ >
        <div id='cart-container'>
        <img 
          src="/garden-cart.svg" 
          alt="Garden Cart" 
          id='garden-cart-icon' 
        />
        <span id='cart-count'>{cartCount}</span>
        
        </div>
        <span id='cart-text'>Sepetim</span>
        </Link>
        </div>
        <div className="categories-navbar">
        <div className='categories-div'>
        <button className="categories-button" 
        onMouseEnter={()=>setOpenCategories(true)}
        onMouseLeave={()=>setOpenCategories(false)}
        >
          <img 
            src="/category.svg" 
            alt="Categories icon" 
            className="categories-icon" 
          />
          <span className="categories-text">Tüm Kategoriler</span>
        </button>
        {(isInCategories||openCategories) && <CategoryMenu  setMouse={setIsInCategories} categories={categories}/>}
        </div>
        <nav className="popular-category-bar">
        <ul className="popular-category-list">
        <li className="popular-category-item">
        <Link href="/" className="popular-category-link">
        <span className="popular-category-text">İlkbahar</span>
        </Link>
        </li>
        <li className="popular-category-item">
        <Link href="/" className="popular-category-link">
        <span className="popular-category-text">Bitkiler</span>
        </Link>
        </li>
        <li className="popular-category-item">
        <Link href="/" className="popular-category-link">
        <span className="popular-category-text">Sulama</span>
        </Link>
        </li>
        <li className="popular-category-item">
        <Link href="/" className="popular-category-link">
        <span className="popular-category-text">Peyzaj</span>
        </Link>   
        </li>
        <li className="popular-category-item">
        <Link href="/" className="popular-category-link">
        <span className="popular-category-text">Aletler</span>
        </Link>
        </li>
        <li className="popular-category-item">
        <Link href="/" className="popular-category-link">
        <span className="popular-category-text">Aksesuarlar</span>
        </Link>
        </li>
        <li className="popular-category-item">
        <Link href="/" className="popular-category-link">
        <span className="popular-category-text">Yeni Ürünler</span>
        </Link>
        </li>
        <li className="popular-category-item">
        <Link href="/" className="popular-category-link">
        <span className="popular-category-text">İndirimdekiler</span>
        </Link>
        </li>
        </ul>
        </nav>
        </div>
    </nav>
  );
};

export default Navbar;

