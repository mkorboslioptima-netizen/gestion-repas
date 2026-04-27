import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUsers, getAuditLog, createUser, updateUser, resetPassword,
  type AppUser, type AuditLog,
} from '../../api/users';
import { getSites } from '../../api/sites';
import { Table, Button, Modal, Form, Input, Select, Switch, Tag, Tabs, message, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const ROLES = [
  { label: 'Admin SEBN', value: 'AdminSEBN' },
  { label: 'Gestionnaire', value: 'ResponsableCantine' },
  { label: 'Prestataire', value: 'Prestataire' },
];


export default function GestionComptesPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers });
  const { data: logs = [] } = useQuery({ queryKey: ['audit-log'], queryFn: getAuditLog });
  const { data: sites = [] } = useQuery({ queryKey: ['sites'], queryFn: getSites });

  const siteOptions = [
    { value: '', label: 'Tous les sites' },
    ...sites.filter(s => s.actif).map(s => ({ value: s.siteId, label: s.nom })),
  ];

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['audit-log'] });
      setCreateOpen(false);
      form.resetFields();
      message.success('Compte créé avec succès');
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Erreur lors de la création'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role?: string; isActive?: boolean; siteId?: string } }) =>
      updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['audit-log'] });
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Erreur'),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      resetPassword(id, newPassword),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit-log'] });
      setResetOpen(null);
      resetForm.resetFields();
      message.success('Mot de passe réinitialisé');
    },
    onError: (err: any) => message.error(err.response?.data?.message ?? 'Erreur'),
  });

  const userColumns: ColumnsType<AppUser> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Nom',
      dataIndex: 'nom',
      key: 'nom',
    },
    {
      title: 'Rôle',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record) => (
        <Select
          size="small"
          value={role}
          options={ROLES}
          style={{ minWidth: 160 }}
          onChange={val => updateMut.mutate({ id: record.id, data: { role: val } })}
        />
      ),
    },
    {
      title: 'Site',
      dataIndex: 'siteId',
      key: 'siteId',
      render: (_: string | null, record) => (
        <Select
          size="small"
          value={record.siteId ?? ''}
          options={siteOptions}
          style={{ minWidth: 150 }}
          onChange={val => updateMut.mutate({ id: record.id, data: { siteId: val } })}
        />
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean, record) => (
        <Popconfirm
          title={active ? 'Désactiver ce compte ?' : 'Réactiver ce compte ?'}
          onConfirm={() => updateMut.mutate({ id: record.id, data: { isActive: !active } })}
          okText="Confirmer"
          cancelText="Annuler"
        >
          <Switch checked={active} size="small" />
        </Popconfirm>
      ),
    },
    {
      title: 'Dernière connexion',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (v: string | null) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—',
    },
    {
      title: 'Créé le',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Créé par',
      dataIndex: 'createdBy',
      key: 'createdBy',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record) => (
        <Button size="small" onClick={() => setResetOpen(record.id)}>
          Réinitialiser MDP
        </Button>
      ),
    },
  ];

  const logColumns: ColumnsType<AuditLog> = [
    {
      title: 'Acteur',
      dataIndex: 'actorEmail',
      key: 'actorEmail',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => {
        const colors: Record<string, string> = {
          Created: 'green', RoleChanged: 'blue', Deactivated: 'red',
          Reactivated: 'cyan', PasswordReset: 'orange',
        };
        return <Tag color={colors[action] ?? 'default'}>{action}</Tag>;
      },
    },
    {
      title: 'Cible',
      dataIndex: 'targetEmail',
      key: 'targetEmail',
    },
    {
      title: 'Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div className="admin-hdr" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Gestion des comptes</h2>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          + Nouveau compte
        </Button>
      </div>

      <Tabs
        items={[
          {
            key: 'comptes',
            label: 'Comptes',
            children: (
              <Table
                rowKey="id"
                columns={userColumns}
                dataSource={users}
                loading={isLoading}
                pagination={false}
                size="middle"
              />
            ),
          },
          {
            key: 'historique',
            label: 'Historique',
            children: (
              <Table
                rowKey="id"
                columns={logColumns}
                dataSource={logs}
                pagination={false}
                size="middle"
              />
            ),
          },
        ]}
      />

      {/* Modal création */}
      <Modal
        title="Créer un compte"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Créer"
        confirmLoading={createMut.isPending}
      >
        <Form form={form} layout="vertical" onFinish={createMut.mutate}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="nom" label="Nom complet" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Mot de passe" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Rôle" rules={[{ required: true }]}>
            <Select options={ROLES} />
          </Form.Item>
          <Form.Item name="siteId" label="Site">
            <Select options={siteOptions} allowClear placeholder="Tous les sites" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal reset MDP */}
      <Modal
        title="Réinitialiser le mot de passe"
        open={resetOpen !== null}
        onCancel={() => { setResetOpen(null); resetForm.resetFields(); }}
        onOk={() => resetForm.submit()}
        okText="Réinitialiser"
        confirmLoading={resetMut.isPending}
      >
        <Form
          form={resetForm}
          layout="vertical"
          onFinish={({ newPassword }) => {
            if (resetOpen !== null) resetMut.mutate({ id: resetOpen, newPassword });
          }}
        >
          <Form.Item name="newPassword" label="Nouveau mot de passe" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
