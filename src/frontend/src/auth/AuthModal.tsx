import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, App, Button, Form, Input, Modal, Typography } from 'antd';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from './AuthContext';

export type AuthMode = 'login' | 'signup';

interface OpenAuthOptions {
  /** Where to go after a successful login/sign-up (e.g. the protected page the user asked for). */
  redirectTo?: string;
}

interface AuthModalState {
  openAuth(mode: AuthMode, options?: OpenAuthOptions): void;
}

// Default is a no-op so components can render without the provider (e.g. in isolated tests).
export const AuthModalContext = createContext<AuthModalState>({ openAuth: () => undefined });

export const useAuthModal = () => useContext(AuthModalContext);

/**
 * Login and Sign Up open in a modal on top of whatever is on screen, so an open calculator
 * (and its result) stays put while the user logs in.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | undefined>();
  const navigate = useNavigate();

  const openAuth = useCallback((next: AuthMode, options?: OpenAuthOptions) => {
    setMode(next);
    setRedirectTo(options?.redirectTo);
  }, []);

  const close = () => setMode(null);

  const onSuccess = () => {
    close();
    if (redirectTo) navigate(redirectTo);
  };

  const value = useMemo(() => ({ openAuth }), [openAuth]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <Modal
        open={mode !== null}
        onCancel={close}
        footer={null}
        width={440}
        destroyOnHidden
        title={mode === 'signup' ? 'Sign up' : 'Log in'}
      >
        {mode === 'login' && <LoginForm onSuccess={onSuccess} onSwitch={() => setMode('signup')} />}
        {mode === 'signup' && <SignupForm onSuccess={onSuccess} onSwitch={() => setMode('login')} />}
      </Modal>
    </AuthModalContext.Provider>
  );
}

/** Old /login and /signup links (and protected-page redirects) open the modal over Home. */
export function AuthRedirect({ mode }: { mode: AuthMode }) {
  const { openAuth } = useAuthModal();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const state = useLocation().state as { from?: string } | null;
  const from = state?.from?.startsWith('/') ? state.from : undefined;

  useEffect(() => {
    if (loading) return; // wait for the session check, or logged-in users would see the form
    if (user) {
      navigate(from ?? '/', { replace: true });
    } else {
      openAuth(mode, { redirectTo: from });
      navigate('/', { replace: true });
    }
  }, [loading]); // act once, when the session is known

  return null;
}

function errorMessages(err: unknown): string[] {
  return err instanceof ApiError ? err.messages : ['Something went wrong. Please try again.'];
}

function ErrorList({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <Alert
      type="error"
      showIcon
      style={{ marginBottom: 16 }}
      message={errors.length === 1 ? errors[0] : 'Please fix the following:'}
      description={
        errors.length > 1 ? (
          <ul className="plain-list">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        ) : undefined
      }
    />
  );
}

interface FormProps {
  onSuccess: () => void;
  onSwitch: () => void;
}

function LoginForm({ onSuccess, onSwitch }: FormProps) {
  const { login } = useAuth();
  const { message } = App.useApp();
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setSubmitting(true);
    setErrors([]);
    try {
      await login(values.email, values.password);
      message.success('Welcome back!');
      onSuccess();
    } catch (err) {
      setErrors(errorMessages(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Typography.Paragraph type="secondary">Log in to save your results and see your history.</Typography.Paragraph>
      <ErrorList errors={errors} />
      <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large" name="login">
        <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Enter your email.' }, { type: 'email', message: 'Enter a valid email address.' }]}>
          <Input prefix={<MailOutlined />} autoComplete="email" inputMode="email" autoFocus />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Enter your password.' }]}>
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={submitting}>
          Log in
        </Button>
      </Form>
      <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
        New here?{' '}
        <Button type="link" style={{ padding: 0 }} onClick={onSwitch}>
          Create an account
        </Button>
      </Typography.Paragraph>
    </>
  );
}

function SignupForm({ onSuccess, onSwitch }: FormProps) {
  const { signup } = useAuth();
  const { message } = App.useApp();
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: { name: string; email: string; password: string }) => {
    setSubmitting(true);
    setErrors([]);
    try {
      await signup(values.name.trim(), values.email, values.password);
      message.success('Your account is ready.');
      onSuccess();
    } catch (err) {
      setErrors(errorMessages(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Typography.Paragraph type="secondary">Create a free account to save your results.</Typography.Paragraph>
      <ErrorList errors={errors} />
      <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="large" name="signup">
        <Form.Item
          label="Name"
          name="name"
          rules={[
            { required: true, whitespace: true, message: 'Enter your name.' },
            { max: 50, message: 'Name must be at most 50 characters.' },
          ]}
        >
          <Input prefix={<UserOutlined />} autoComplete="name" maxLength={50} autoFocus />
        </Form.Item>
        <Form.Item
          label="Email"
          name="email"
          rules={[
            { required: true, message: 'Enter your email.' },
            { type: 'email', message: 'Enter a valid email address.' },
            { max: 254, message: 'Email must be at most 254 characters.' },
          ]}
        >
          <Input prefix={<MailOutlined />} autoComplete="email" inputMode="email" />
        </Form.Item>
        <Form.Item
          label="Password"
          name="password"
          extra="8–72 characters, with at least one letter and one number."
          rules={[
            { required: true, message: 'Choose a password.' },
            { min: 8, max: 72, message: 'Password must be 8–72 characters.' },
            { pattern: /[A-Za-z]/, message: 'Password must contain at least one letter.' },
            { pattern: /\d/, message: 'Password must contain at least one number.' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="Confirm password"
          name="confirm"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Confirm your password.' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('Passwords do not match.')),
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={submitting}>
          Create account
        </Button>
      </Form>
      <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
        Already have an account?{' '}
        <Button type="link" style={{ padding: 0 }} onClick={onSwitch}>
          Log in
        </Button>
      </Typography.Paragraph>
    </>
  );
}
