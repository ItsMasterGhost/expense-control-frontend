// Sidebar.tsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from 'devextreme-react/button';
import { getCurrentUser, logout, hasRole } from '../../services/auth'; 
import '../../styles/layout/Sidebar.css'; 

const Sidebar: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const user = getCurrentUser();

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const navLinkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px' 
  };

  return (
    <div className="sidebar">
      {/* ... User Panel ... */}
      <div className="user-panel">
        <div className="user-info">
          <div className="user-avatar"><i className="dx-icon-user"></i></div>
          <div className="user-details">
            <div className="user-name">{user?.FullName || user?.unique_name || 'Usuario'}</div>
          </div>
        </div>
      </div>

      <div className="menu-container">
        {/* ... Mantenimientos ... */}
        <div className={`menu-section ${activeMenu === 'mantenimientos' ? 'active' : ''}`}>
          <div className="menu-header" onClick={() => toggleMenu('mantenimientos')}>
            <i className="dx-icon-settings"></i><span>Mantenimientos</span>
            <i className={`dx-icon-chevron${activeMenu === 'mantenimientos' ? 'up' : 'down'}`}></i>
          </div>
          {activeMenu === 'mantenimientos' && (
            <div className="submenu">
              {hasRole('Admin') && (<>
                  <NavLink to="/configuracion/tipos-gasto" activeClassName="active" style={navLinkStyle}><i className="dx-icon-tags"></i> <span>Tipos de Gasto</span></NavLink>
                  <NavLink to="/configuracion/usuarios" activeClassName="active" style={navLinkStyle}><i className="dx-icon-group"></i> <span>Usuarios</span></NavLink>
              </>)}
              <NavLink to="/configuracion/fondos" activeClassName="active" style={navLinkStyle}><i className="dx-icon-money"></i> <span>Fondos Monetarios</span></NavLink>
            </div>
          )}
        </div>

        {/* ... Movimientos ... */}
        <div className={`menu-section ${activeMenu === 'movimientos' ? 'active' : ''}`}>
          <div className="menu-header" onClick={() => toggleMenu('movimientos')}>
            <i className="dx-icon-datatransfer"></i><span>Movimientos</span>
            <i className={`dx-icon-chevron${activeMenu === 'movimientos' ? 'up' : 'down'}`}></i>
          </div>
          {activeMenu === 'movimientos' && (
            <div className="submenu">
              <NavLink to="/movimientos/presupuestos" activeClassName="active" style={navLinkStyle}><i className="dx-icon-bulletlist"></i> <span>Presupuestos</span></NavLink>
              <NavLink to="/movimientos/registro-gastos" activeClassName="active" style={navLinkStyle}><i className="dx-icon-cart"></i> <span>Registro de Gastos</span></NavLink>
              <NavLink to="/movimientos/depositos" activeClassName="active" style={navLinkStyle}><i className="dx-icon-arrowup"></i> <span>Depósitos</span></NavLink>
            </div>
          )}
        </div>

        {/* Consultas y Reportes */}
        <div className={`menu-section ${activeMenu === 'reportes' ? 'active' : ''}`}>
          <div className="menu-header" onClick={() => toggleMenu('reportes')}>
            <i className="dx-icon-file"></i> 
            <span>Consultas y Reportes</span>
            <i className={`dx-icon-chevron${activeMenu === 'reportes' ? 'up' : 'down'}`}></i>
          </div>
          {activeMenu === 'reportes' && (
            <div className="submenu">
              <NavLink to="/reportes/listado-movimientos" activeClassName="active" style={navLinkStyle}>
                <i className="dx-icon-orderedlist"></i> {/* O dx-icon-doc, dx-icon-find */}
                <span>Listado de Movimientos</span>
              </NavLink>
              {hasRole('Admin') && (
                <NavLink to="/reportes/consulta-general-admin" activeClassName="active" style={navLinkStyle}>
                  <i className="dx-icon-find"></i> 
                  <span>Consulta General (Admin)</span> {/* Renombrar si es diferente */}
                </NavLink>
              )}
              <NavLink to="/reportes/graficos-comparativos" activeClassName="active" style={navLinkStyle}>
                <i className="dx-icon-chart"></i> <span>Gráficos Comparativos</span>
              </NavLink>
            </div>
          )}
        </div>
      </div>

      {/* ... Botón Cerrar Sesión ... */}
      <div className="sidebar-bottom">
        <Button text="Cerrar Sesión" stylingMode="text" type="danger" icon="runner" onClick={() => { logout(); window.location.href = '/login'; }} className="logout-btn" width="100%" />
      </div>
    </div>
  );
};

export default Sidebar;