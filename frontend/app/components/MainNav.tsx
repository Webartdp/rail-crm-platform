const navItems = [
  ['/', 'Home'],
  ['/admin', 'Admin'],
  ['/employees', 'Employees'],
  ['/clients', 'Clients'],
  ['/objects', 'Objects'],
  ['/assignments', 'Assignments'],
  ['/approvals', 'Approvals'],
  ['/employee', 'Employee'],
  ['/demo', 'Demo'],
];

export default function MainNav() {
  return (
    <nav className="main-nav">
      <strong>Rail CRM</strong>
      <div>
        {navItems.map(([href, label]) => (
          <a href={href} key={href}>{label}</a>
        ))}
      </div>
    </nav>
  );
}
