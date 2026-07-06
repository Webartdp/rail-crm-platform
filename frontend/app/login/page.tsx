export default function LoginPage() {
  return (
    <main className="page-shell auth-page">
      <section className="panel auth-card">
        <p className="eyebrow">Rail CRM Platform</p>
        <h1>Login</h1>
        <p className="hero-text">Prototype login screen for administrators, coordinators and employees.</p>
        <label>Email<input placeholder="name@example.com" /></label>
        <label>Password<input placeholder="Password" type="password" /></label>
        <button className="action-button primary" type="button">Sign in</button>
      </section>
    </main>
  );
}
