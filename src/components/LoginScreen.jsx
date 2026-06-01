import { useState } from 'react';
import Input from './ui/Input';

export default function LoginScreen({ onSubmit, loading, error }) {
  const [form, setForm] = useState({ loginId: '', password: '' });

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <h1>IMS Admin Login</h1>
        <p>Use your tenant login credentials.</p>

        <form onSubmit={handleSubmit} className="stack-form">
          <Input
            name="loginId"
            label="Email / Login ID"
            type="text"
            autoComplete="username"
            required
            value={form.loginId}
            onChange={onChange}
          />

          <Input
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={onChange}
          />

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}
