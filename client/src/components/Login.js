import React, { useState } from 'react';
import { auth, signInWithEmailAndPassword } from '../firebase';

const Login = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('Attempting login with:', email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful:', userCredential.user.uid);
      setUser(userCredential.user);
      setError(null);
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to login: ' + err.message);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card p-4 w-100" style={{ maxWidth: '400px' }}>
        <h2 className="card-title text-primary mb-4">Login</h2>
        {error && (
          <div className="alert alert-danger" role="alert">{error}</div>
        )}
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-control"
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-control"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;