// src/components/auth/PrivateRoute.tsx
import React from 'react';
import { Redirect, Route, RouteProps, useLocation } from 'react-router-dom';
import { isAuthenticated, hasRole } from '../../services/auth';

interface PrivateRouteProps extends RouteProps {
  roles?: string[];
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  roles = [], 
  ...rest 
}) => {
  const location = useLocation();
  
  return (
    <Route
      {...rest}
      render={() => {
        if (!isAuthenticated()) {
          return (
            <Redirect
              to={{
                pathname: '/login',
                state: { from: location }
              }}
            />
          );
        }
        
        if (roles.length > 0 && !roles.some(role => hasRole(role))) {
          return <Redirect to={{ pathname: '/unauthorized' }} />;
        }
        
        return children;
      }}
    />
  );
};

export default PrivateRoute;