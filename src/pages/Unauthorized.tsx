// src/pages/Unauthorized.tsx
import React from 'react';
import { useHistory } from 'react-router-dom';
import { Button } from 'devextreme-react/button';

const Unauthorized: React.FC = () => {
  const history = useHistory();

  return (
    <div className="unauthorized-page">
      <h1>Acceso No Autorizado</h1>
      <p>No tienes permisos para acceder a esta página.</p>
      <Button
        text="Volver al Inicio"
        type="default"
        onClick={() => history.push('/')}
        icon="home"
      />
    </div>
  );
};

export default Unauthorized;