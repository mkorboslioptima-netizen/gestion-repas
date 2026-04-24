import { useState } from 'react';
import {
  Button, Card, Form, Modal, Switch, Table, Tag, TimePicker, Typography, message,
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getShifts, updateShift, type ShiftDto, type UpdateShiftDto } from '../../api/shifts';

const { Title, Text } = Typography;

function shiftTag(shift: ShiftDto) {
  if (shift.enCours) return <Tag color="green">En cours</Tag>;
  if (shift.actif)   return <Tag color="blue">Actif</Tag>;
  return <Tag color="default">Inactif</Tag>;
}

export default function ShiftsPage() {
  const queryClient = useQueryClient();
  const [editShift, setEditShift] = useState<ShiftDto | null>(null);
  const [form] = Form.useForm();

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: getShifts,
    refetchInterval: 60_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateShiftDto }) => updateShift(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift-current'] });
      message.success('Shift mis à jour');
      setEditShift(null);
    },
    onError: () => message.error('Erreur lors de la mise à jour'),
  });

  function openEdit(shift: ShiftDto) {
    setEditShift(shift);
    form.setFieldsValue({
      heureDebut: dayjs(shift.heureDebut, 'HH:mm:ss'),
      heureFin:   dayjs(shift.heureFin,   'HH:mm:ss'),
      actif:      shift.actif,
    });
  }

  function handleSubmit() {
    form.validateFields().then(values => {
      if (!editShift) return;
      mutation.mutate({
        id: editShift.id,
        dto: {
          heureDebut: values.heureDebut.format('HH:mm:ss'),
          heureFin:   values.heureFin.format('HH:mm:ss'),
          actif:      values.actif,
        },
      });
    });
  }

  const columns = [
    { title: 'Nom',        dataIndex: 'nom',        key: 'nom', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Début',      dataIndex: 'heureDebut', key: 'debut',    render: (v: string) => v.slice(0, 5) },
    { title: 'Fin',        dataIndex: 'heureFin',   key: 'fin',      render: (v: string) => v.slice(0, 5) },
    { title: 'Statut',     key: 'statut',           render: (_: unknown, s: ShiftDto) => shiftTag(s) },
    {
      title: 'Actions', key: 'actions',
      render: (_: unknown, s: ShiftDto) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(s)}>
          Modifier
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 18 }}>
      <Title level={4} style={{ marginBottom: 16 }}>Créneaux horaires (Shifts)</Title>
      <Card>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Les shifts définissent les plages horaires pendant lesquelles les repas sont autorisés.
          Un pointage hors créneau actif est automatiquement refusé.
        </Text>
        <Table
          dataSource={shifts}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="middle"
        />
      </Card>

      <Modal
        title={`Modifier — ${editShift?.nom}`}
        open={!!editShift}
        onCancel={() => setEditShift(null)}
        onOk={handleSubmit}
        confirmLoading={mutation.isPending}
        okText="Enregistrer"
        cancelText="Annuler"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Heure de début" name="heureDebut" rules={[{ required: true }]}>
            <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Heure de fin" name="heureFin" rules={[{ required: true }]}>
            <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Actif" name="actif" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
