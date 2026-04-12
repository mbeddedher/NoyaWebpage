// app/login/page.js
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../context/UserContext';
import '../../styles/login.css'

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [name, SetName] = useState('');
  const [surname, SetSurname] = useState('');
  const [regmessage, setRegMessage] = useState('');
  const [activeTab, setActiveTab] = useState('login'); // Default tab is 'login'

  const showTab = (tabName) => {
    setActiveTab(tabName);
  };
  
  const router = useRouter();
  const { isLoggedIn, login } = useUser();

useEffect(() => {
  if(isLoggedIn){
    //router.push('/');
  }
},[])


  const handleLogin = async (e) => {
   const res = await login(e,email,password)
   /* console.log(email,password)
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const data = await res.json();
      //localStorage.setItem('token', data.token); // Store token in localStorage
      setMessage('Login successful!');
      router.push('/'); // Redirect to homepage
    } else {
      const data = await res.json();
      setMessage(data.error || 'Login failed');
    }
  */
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email:regEmail, password:regPassword, name:name, surname:surname }),
    });

    if (res.ok) {
      setMessage('Registration successful! Redirecting to login...');
      setTimeout(() => router.push('/login'), 2000);
    } else {
      const data = await res.json();
      setMessage(data.error || 'Registration failed');
    }
  };






  return (
    <div className='main-div'>
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => showTab('login')}
        >
          Login
        </button>
        <button
          className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => showTab('register')}
        >
          Register
        </button>
      </div>

    <div className="tab-content-wrapper">
    <div 
          id="login"
          className={`tab-content ${activeTab === 'login' ? 'active' : ''}`}
          >
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <input type="text" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
      {message && <p>{message}</p>}
    </div>



    <div  id="register"
          className={`tab-content ${activeTab === 'register' ? 'active' : ''}`}>
      <h1>Register</h1>

      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="Email"
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          required
        />
        <br/>
        <input
          type="password"
          placeholder="Password"
          value={regPassword}
          onChange={(e) => setRegPassword(e.target.value)}
          required
        /><br/>
        <input
          type="name"
          placeholder="Ad"
          value={name}
          onChange={(e) => SetName(e.target.value)}
          required
        /><br/>
        <input
          type="surname"
          placeholder="Soyadı"
          value={surname}
          onChange={(e) => SetSurname(e.target.value)}
          required
        /><br/>
        <button type="submit">Register</button>
      </form>
      {message && <p>{message}</p>}
    </div>
    </div>
    </div>
  );
}
