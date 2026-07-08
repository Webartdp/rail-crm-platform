'use client';

import { useEffect, useState } from 'react';
import { me, logout, type AuthUser } from '../../lib/auth';

type NavItem = {
  href: string;
  label: string;
  roles?: string[];
};

const navItems: NavItem[] = [
  { href: '/', label: 'Home' },
  { href: '/login', label: 'Login' },
  { href: '/manager-dashboard', label: 'Manager Dashboard', roles: ['manager', 'admin'] },
  { href: '/admin', label: 'Admin', roles: ['admin'] },
  { href: '/employees', label: 'Employees', roles: ['admin'] },
  { href: '/clients', label: 'Clients', roles: ['manager', 'admin'] },
  { href: '/objects', label: 'Objects', roles: ['manager', 'admin'] },
  { href: '/assignments', label: 'Assignments', roles: ['manager', 'admin'] },
  { href: '/approvals', label: 'Approvals', roles: ['manager', 'admin'] },
  { href: '/documents', label: 'Documents', roles: ['manager', 'admin'] },
  { href: '/billing', label: 'Billing', roles: ['manager', 'admin'] },
  { href: '/employee', label: 'Employee' },
  { href: '/demo', label: 'Demo' },
  { href: '/work-events', label: 'Work Events', roles: ['manager', 'admin'] },
];

export default function MainNav() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    me().then((response) => setUser(response.data)).catch(() => setUser(null));
  }, []);

  async function signOut() {
    await logout();
    setUser(null);
    window.location.href = '/login';
  }

  const visibleItems = navItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <nav className="main-nav">
      <strong>Rail CRM</strong>
      <div>
        {visibleItems.map((item) => (
          <a href={item.href} key={item.href}>{item.label}</a>
        ))}
        {user ? <button className="nav-button" onClick={signOut} type="button">Logout {user.role}</button> : null}
      </div>
    </nav>
  );
}
