import React from 'react';

import PropTypes from 'prop-types';
import { Formik } from 'formik';
import { Button, Stack } from '@mui/material';

import { PasswordField } from 'src/components/password-field/password-field';
import resetPasswordSchema from 'src/schema/reset-password-schema';

export const SetPasswordForm = ({ isLoading, handleConfirm }) => {
  return (
    <Formik
      initialValues={{
        password: '',
        confirmPassword: '',
      }}
      validationSchema={resetPasswordSchema}
      onSubmit={(values) => {
        handleConfirm(values);
      }}
    >
      {({ errors, touched, handleSubmit, getFieldProps }) => (
        <form onSubmit={handleSubmit}>
          <Stack spacing={3} sx={{ my: 3 }}>
            <PasswordField
              label="Password"
              {...getFieldProps('password')}
              error={Boolean(touched.password && errors.password)}
              helperText={touched.password && errors.password}
            />

            <PasswordField
              label="Confirm Password"
              {...getFieldProps('confirmPassword')}
              error={Boolean(touched.confirmPassword && errors.confirmPassword)}
              helperText={touched.confirmPassword && errors.confirmPassword}
            />
          </Stack>

          <Button
            fullWidth
            size="large"
            type="submit"
            variant="contained"
            color="inherit"
            loading={isLoading}
            disabled={isLoading}
          >
            Login
          </Button>
        </form>
      )}
    </Formik>
  );
};

SetPasswordForm.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  handleConfirm: PropTypes.func.isRequired,
};

export default SetPasswordForm;
