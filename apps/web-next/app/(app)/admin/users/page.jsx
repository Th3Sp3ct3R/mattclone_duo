'use client';

import { useEffect, useMemo, useState } from 'react';
import { getIn, useFormik } from 'formik';

import { api } from '@julio/api-client';
import { formatDate } from '@julio/shared';
import {
  createValidationT,
  flattenValidationErrors,
  userCreateSchema,
  userUpdateSchema
} from '@julio/validation';
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Field,
  FormErrorSummary,
  Input,
  NestedTabNavigator,
  RoleMatrix,
  Spinner
} from '@julio/ui';
import { notifications } from '@/src/notifications/client.js';

const ROLES = ['su', 'admin', 'contributor', 'user'];

const roleLabels = {
  su: 'Super User',
  admin: 'Admin',
  contributor: 'Contributor',
  user: 'User'
};

const roleOptions = ROLES.map((role) => ({ value: role, label: roleLabels[role] }));

const permissions = [
  {
    key: 'users',
    label: 'Manage users',
    description: 'Create, edit, and remove users',
    allowedRoles: ['su']
  },
  {
    key: 'rbac',
    label: 'Update roles',
    description: 'Manage role assignments and access',
    allowedRoles: ['su']
  },
  {
    key: 'seo',
    label: 'Manage SEO',
    description: 'Edit global SEO settings and overrides',
    allowedRoles: ['admin', 'su']
  },
  {
    key: 'blog',
    label: 'Manage blog',
    description: 'Create, publish, and manage posts',
    allowedRoles: ['contributor', 'admin', 'su']
  },
  {
    key: 'analytics',
    label: 'View analytics',
    description: 'Access analytics dashboards and exports',
    allowedRoles: ['admin', 'su']
  }
];

const emptyForm = { name: '', email: '', password: '', role: 'user' };

export default function UsersAdminPage() {
  const t = useMemo(() => createValidationT('en'), []);
  const [users, setUsers] = useState([]);
  const [pageStatus, setPageStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteUser, setPendingDeleteUser] = useState(null);

  async function loadUsers() {
    setPageStatus(null);
    setLoading(true);
    try {
      const data = await api.users.getUsers();
      setUsers(data.users || []);
    } catch (err) {
      const message = err?.message || 'Failed to load users';
      setPageStatus(message);
      notifications.notify({ title: 'User load failed', message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers().catch(() => {});
  }, []);

  const formik = useFormik({
    initialValues: emptyForm,
    validationSchema: editingId ? userUpdateSchema : userCreateSchema,
    onSubmit: async (values, helpers) => {
      setSaving(true);
      helpers.setStatus(null);
      try {
        if (editingId) {
          const payload = {
            name: values.name,
            email: values.email,
            role: values.role
          };
          if (values.password) {
            payload.password = values.password;
          }
          await api.users.updateUser(editingId, payload);
          notifications.notify({ title: 'User updated', message: 'User changes saved.' });
        } else {
          await api.users.createUser(values);
          notifications.notify({ title: 'User created', message: 'New user added.' });
        }
        resetForm();
        await loadUsers();
      } catch (err) {
        const message = err?.message || 'Failed to save user';
        helpers.setStatus(message);
        notifications.notify({ title: 'Save failed', message });
      } finally {
        setSaving(false);
      }
    }
  });

  const showErrors = formik.submitCount > 0;
  const summaryMessages = showErrors ? flattenValidationErrors(formik.errors).map(t) : [];
  const fieldError = (name) => {
    const error = getIn(formik.errors, name);
    const touched = getIn(formik.touched, name);
    if (!error) return null;
    if (!touched && formik.submitCount === 0) return null;
    return t(error);
  };

  function startEdit(user) {
    setEditingId(user._id || user.id);
    formik.resetForm({
      values: {
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role || 'user'
      }
    });
    setActiveTab('manage');
  }

  function resetForm() {
    setEditingId(null);
    formik.resetForm({ values: emptyForm });
    setActiveTab('list');
  }

  async function removeUser(userId) {
    setPageStatus(null);
    try {
      await api.users.deleteUser(userId);
      await loadUsers();
      notifications.notify({ title: 'User deleted', message: 'The user was removed.' });
    } catch (err) {
      const message = err?.message || 'Failed to delete user';
      setPageStatus(message);
      notifications.notify({ title: 'Delete failed', message });
    }
  }

  const columns = useMemo(
    () => [
      {
        header: 'User',
        accessorKey: 'name',
        cell: ({ row }) => (
          <div>
            <strong>{row.original.name || row.original.email}</strong>
            <div className="Kicker">
              {row.original.email} · {row.original.role}
            </div>
          </div>
        )
      },
      {
        header: 'Created',
        accessorKey: 'createdAt',
        cell: ({ row }) =>
          row.original.createdAt ? formatDate(row.original.createdAt) : '—'
      },
      {
        header: 'Actions',
        id: 'actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="layout-inline-gap-8">
            <Button variant="secondary" onClick={() => startEdit(row.original)}>
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setPendingDeleteUser(row.original);
                setConfirmOpen(true);
              }}
            >
              Delete
            </Button>
          </div>
        )
      }
    ],
    []
  );

  return (
    <div className="page-section-stack" aria-busy={loading}>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete user"
        description="This action cannot be undone."
        confirmLabel="Delete user"
        onConfirm={() => {
          const userId = pendingDeleteUser?._id || pendingDeleteUser?.id;
          if (userId) removeUser(userId);
          setPendingDeleteUser(null);
        }}
      />
      <div className="page-section-header">
        <h1>Users</h1>
        <p className="Kicker">Manage users, roles, and access policies.</p>
      </div>

      {pageStatus ? <div className="Error">{String(pageStatus)}</div> : null}

      <NestedTabNavigator
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={[
          {
            value: 'list',
            label: 'All users',
            content: (
              loading ? (
                <Card className="layout-stack-gap-12">
                  <div className="layout-inline-gap-8 layout-inline-center text-muted">
                    <Spinner size="sm" label="Loading users" />
                    <span>Loading users…</span>
                  </div>
                </Card>
              ) : (
                <DataTable columns={columns} data={users} emptyMessage="No users yet." />
              )
            )
          },
          {
            value: 'manage',
            label: editingId ? 'Edit user' : 'Create user',
            content: (
              <Card>
                <h3>{editingId ? 'Edit user' : 'Create user'}</h3>
                <form onSubmit={formik.handleSubmit} className="layout-stack-gap-12">
                  <FormErrorSummary
                    messages={summaryMessages}
                    status={formik.status ? String(formik.status) : null}
                  />
                  <div className="grid">
                    <Field.Root>
                      <Field.Label htmlFor="userName">Name</Field.Label>
                      <Field.Control>
                        <Input
                          id="userName"
                          name="name"
                          value={formik.values.name}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder="Full name"
                          invalid={Boolean(fieldError('name'))}
                        />
                      </Field.Control>
                      {fieldError('name') ? <Field.Error>{fieldError('name')}</Field.Error> : null}
                    </Field.Root>
                    <Field.Root>
                      <Field.Label htmlFor="userEmail">Email</Field.Label>
                      <Field.Control>
                        <Input
                          id="userEmail"
                          name="email"
                          type="email"
                          value={formik.values.email}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          invalid={Boolean(fieldError('email'))}
                        />
                      </Field.Control>
                      {fieldError('email') ? <Field.Error>{fieldError('email')}</Field.Error> : null}
                    </Field.Root>
                    <div className="layout-stack-gap-6">
                      <label htmlFor="userRole">Role</label>
                      <select
                        id="userRole"
                        name="role"
                        value={formik.values.role}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        className="form-select"
                      >
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {fieldError('role') ? <div className="Error">{fieldError('role')}</div> : null}
                    </div>
                    <Field.Root>
                      <Field.Label htmlFor="userPassword">Password</Field.Label>
                      <Field.Control>
                        <Input
                          id="userPassword"
                          name="password"
                          type="password"
                          value={formik.values.password}
                          onChange={formik.handleChange}
                          onBlur={formik.handleBlur}
                          placeholder={editingId ? 'Leave blank to keep current' : 'Set a password'}
                          invalid={Boolean(fieldError('password'))}
                        />
                      </Field.Control>
                      {fieldError('password') ? (
                        <Field.Error>{fieldError('password')}</Field.Error>
                      ) : null}
                    </Field.Root>
                  </div>
                  <div className="layout-inline-gap-8">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <span className="layout-inline-gap-8 layout-inline-center">
                          <Spinner size="sm" label="Saving user" />
                          <span>Saving…</span>
                        </span>
                      ) : editingId ? (
                        'Update user'
                      ) : (
                        'Create user'
                      )}
                    </Button>
                    {editingId ? (
                      <Button variant="secondary" type="button" onClick={resetForm}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </form>
              </Card>
            )
          },
          {
            value: 'rbac',
            label: 'RBAC matrix',
            content: (
              <Card>
                <h3>RBAC matrix</h3>
                <RoleMatrix roles={roleOptions} permissions={permissions} />
              </Card>
            )
          }
        ]}
      />
    </div>
  );
}
