// App.tsx
import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import PrivateRoute from './components/auth/PrivateRoute'; 
import MainLayout from './components/layout/MainLayout';   
import LoginForm from './components/auth/LoginForm';       
import Dashboard from './pages/Dashboard';
import TiposGasto from './pages/Configuracion/TiposGasto';
import Usuarios from './pages/Configuracion/Usuarios';
import Fondos from './pages/Configuracion/Fondos';
import PresupuestosPage from './pages/Movimientos/Presupuestos';
import Depositos from './pages/Movimientos/Depositos';
import RegistroGastos from './pages/Movimientos/RegistroGastos';
import ListadoMovimientosPage from './pages/Reportes/Listado';
import ListadoAdmin from './pages/Reportes/ListadoAdmin';
import GraficosComparativos from './pages/Reportes/GraficosComparativos';


const Unauthorized = () => <div style={{ padding: '20px', textAlign: 'center' }}><h2>Acceso Denegado</h2><p>No tienes permisos para acceder a esta página.</p></div>;

const App: React.FC = () => {
  return (
    <Router>
      <Switch>
        <Route path="/login" component={LoginForm} />
        <Route path="/unauthorized" component={Unauthorized} />
        
        <Route path="/"> 
          <MainLayout>
            <Switch> 
              <PrivateRoute exact path="/">
                <Dashboard />
              </PrivateRoute>
              
              {/* Mantenimientos */}
              <PrivateRoute path="/configuracion/tipos-gasto" roles={['Admin']}>
                <TiposGasto />
              </PrivateRoute>
              <PrivateRoute path="/configuracion/usuarios" roles={['Admin']}>
                <Usuarios />
              </PrivateRoute>
              <PrivateRoute path="/configuracion/fondos">
                <Fondos />
              </PrivateRoute>

              {/* Movimientos */}
              <PrivateRoute path="/movimientos/presupuestos"> 
                <PresupuestosPage />
              </PrivateRoute>
              <PrivateRoute path="/movimientos/depositos">
                <Depositos />
              </PrivateRoute>
              <PrivateRoute path="/movimientos/registro-gastos">
                <RegistroGastos />
              </PrivateRoute>
              
              {/* Reportes */}
              <PrivateRoute path="/reportes/listado-movimientos">
                <ListadoMovimientosPage />
              </PrivateRoute>
              <PrivateRoute path="/reportes/consulta-general-admin" roles={['Admin']}> 
                <ListadoAdmin />
              </PrivateRoute>
              <PrivateRoute path="/reportes/graficos-comparativos">
                <GraficosComparativos />
              </PrivateRoute>
            </Switch>
          </MainLayout>
        </Route>
      </Switch>
    </Router>
  );
};

export default App;