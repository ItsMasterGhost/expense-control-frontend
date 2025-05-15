// src/components/layout/MainLayout.tsx
import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import '../../styles/layout/MainLayout.css';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;