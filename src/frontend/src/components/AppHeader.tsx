import { DownOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons';
import { App, Button, Drawer, Dropdown, Grid, Menu, Space } from 'antd';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useAuthModal } from '../auth/AuthModal';

function useSelectedKey(): string {
  const { pathname, hash } = useLocation();
  if (pathname === '/history') return 'history';
  if (pathname === '/' && hash === '#about') return 'about';
  if (pathname === '/' && hash === '#contact') return 'contact';
  return pathname === '/' ? 'home' : '';
}

export function AppHeader() {
  const { user, logout } = useAuth();
  const { openAuth } = useAuthModal();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const selectedKey = useSelectedKey();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { key: 'home', label: <Link to="/">Home</Link> },
    { key: 'about', label: <Link to="/#about">About</Link> },
    { key: 'contact', label: <Link to="/#contact">Contact Us</Link> },
    ...(user ? [{ key: 'history', label: <Link to="/history">History</Link> }] : []),
  ];

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout();
    message.success('You have been logged out.');
    navigate('/');
  };

  const authArea = user ? (
    <Dropdown
      trigger={['click']}
      menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: handleLogout }] }}
    >
      <Button type="text" className="user-button" aria-label={`Account menu for ${user.name}`}>
        <Space>
          <UserOutlined />
          <span className="user-button__name">{user.name}</span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      </Button>
    </Dropdown>
  ) : (
    <Space>
      <Button onClick={() => openAuth('login')}>Login</Button>
      <Button type="primary" onClick={() => openAuth('signup')}>
        Sign Up
      </Button>
    </Space>
  );

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="brand" aria-label="Tip & Bill Splitter home">
          <img src="/favicon.svg" alt="" width={32} height={32} />
          <span>Tip &amp; Bill Splitter</span>
        </Link>

        {isMobile ? (
          <>
            <Button type="text" icon={<MenuOutlined />} aria-label="Open menu" onClick={() => setDrawerOpen(true)} />
            <Drawer title="Menu" placement="right" width={280} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              <Menu mode="vertical" selectedKeys={[selectedKey]} items={navItems} onClick={() => setDrawerOpen(false)} style={{ border: 0 }} />
              <div className="drawer-auth">
                {user ? (
                  <>
                    <div className="drawer-auth__name">
                      <UserOutlined /> {user.name}
                    </div>
                    <Button block icon={<LogoutOutlined />} onClick={handleLogout}>
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button block onClick={() => { setDrawerOpen(false); openAuth('login'); }}>
                      Login
                    </Button>
                    <Button block type="primary" onClick={() => { setDrawerOpen(false); openAuth('signup'); }}>
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </Drawer>
          </>
        ) : (
          <>
            <Menu mode="horizontal" selectedKeys={[selectedKey]} items={navItems} className="app-nav" disabledOverflow />
            {authArea}
          </>
        )}
      </div>
    </header>
  );
}
