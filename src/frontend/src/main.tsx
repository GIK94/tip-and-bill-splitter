import { App as AntApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { AuthModalProvider } from './auth/AuthModal';
import './styles.css';

const theme = {
  token: {
    colorPrimary: '#0f766e',
    colorLink: '#0f766e',
    borderRadius: 10,
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    controlHeightLG: 46,
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={theme} locale={enUS}>
      <AntApp>
        <BrowserRouter>
          <AuthProvider>
            <AuthModalProvider>
              <App />
            </AuthModalProvider>
          </AuthProvider>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
