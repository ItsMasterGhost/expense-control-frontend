import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Button, TextBox, Validator } from 'devextreme-react';
import { RequiredRule } from 'devextreme-react/validator';
import { login } from '../../services/auth';
import { useHistory } from 'react-router-dom';
import LoadIndicator from 'devextreme-react/load-indicator';
import '../../styles/auth/login.css';

const LoginSchema = Yup.object().shape({
  username: Yup.string().required('Usuario es requerido'),
  password: Yup.string().required('Contraseña es requerida'),
});

const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const history = useHistory();

  const formik = useFormik({
    initialValues: {
      username: '',
      password: '',
    },
    validationSchema: LoginSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError('');
      try {
        await login(values.username, values.password);
        history.push('/dashboard');
      } catch (err) {
        setError('Credenciales inválidas');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Control de Gastos</h2>
        <form onSubmit={formik.handleSubmit}>
          <div className="dx-field">
            <TextBox
              name="username"
              value={formik.values.username}
              onValueChanged={(e) => formik.setFieldValue('username', e.value)}
              placeholder="Usuario"
              stylingMode="outlined"
              label="Usuario"
              labelMode="floating"
            >
              <Validator>
                <RequiredRule message="Usuario es requerido" />
              </Validator>
            </TextBox>
            {formik.errors.username && formik.touched.username && (
              <span className="dx-field-item-label-text-error">
                {formik.errors.username}
              </span>
            )}
          </div>

          <div className="dx-field">
            <TextBox
              name="password"
              mode="password"
              value={formik.values.password}
              onValueChanged={(e) => formik.setFieldValue('password', e.value)}
              placeholder="Contraseña"
              stylingMode="outlined"
              label="Contraseña"
              labelMode="floating"
            >
              <Validator>
                <RequiredRule message="Contraseña es requerida" />
              </Validator>
            </TextBox>
            {formik.errors.password && formik.touched.password && (
              <span className="dx-field-item-label-text-error">
                {formik.errors.password}
              </span>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <Button
            text="Iniciar Sesión"
            type="default"
            useSubmitBehavior={true}
            width={'100%'}
            stylingMode="contained"
          >
            {loading && <LoadIndicator visible={true} />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;