import { useEffect } from 'react';
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { LecteurDto, CreateLecteurDto, UpdateLecteurDto } from '../api/lecteurs';
import { getSites } from '../api/sites';

const IP_REGEX = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: CreateLecteurDto | UpdateLecteurDto) => void;
  initialValues?: LecteurDto | null;
  loading?: boolean;
}

export default function LecteurFormModal({ open, onClose, onSubmit, initialValues, loading }: Props) {
  const [form] = Form.useForm();
  const isEdit = !!initialValues;

  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: getSites,
  });

  useEffect(() => {
    if (open) {
      form.setFieldsValue(
        initialValues
          ? {
              nom: initialValues.nom,
              adresseIP: initialValues.adresseIP,
              actif: initialValues.actif,
              nomImprimante: initialValues.nomImprimante ?? '',
              printerIP: initialValues.printerIP ?? '',
              portImprimante: initialValues.portImprimante || 9100,
            }
          : {
              nom: '',
              adresseIP: '',
              actif: true,
              siteId: sites.length === 1 ? sites[0].siteId : undefined,
              nomImprimante: '',
              printerIP: '',
              portImprimante: 9100,
            }
      );
    }
  }, [open, initialValues, form, sites]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit({
      ...values,
      nomImprimante: values.nomImprimante || null,
      printerIP: values.printerIP || null,
      portImprimante: values.portImprimante || 9100,
    });
  };

  return (
    <Modal
      title={isEdit ? 'Modifier le lecteur' : 'Ajouter un lecteur'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? 'Enregistrer' : 'Ajouter'}
      cancelText="Annuler"
      confirmLoading={loading}
      destroyOnHide
    >
      <Form form={form} layout="vertical" requiredMark>
        {!isEdit && (
          <Form.Item
            name="siteId"
            label="Site"
            rules={[{ required: true, message: 'Le site est obligatoire' }]}
          >
            <Select placeholder="Sélectionnez un site">
              {sites.map((s) => (
                <Select.Option key={s.siteId} value={s.siteId}>{s.nom}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          name="nom"
          label="Nom"
          rules={[{ required: true, message: 'Le nom est obligatoire' }]}
        >
          <Input placeholder="Ex. Entrée principale" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="adresseIP"
          label="Adresse IP pointeuse"
          rules={[
            { required: true, message: "L'adresse IP est obligatoire" },
            { pattern: IP_REGEX, message: 'Format IPv4 invalide (ex. 192.168.1.10)' },
          ]}
        >
          <Input placeholder="192.168.1.10" maxLength={45} />
        </Form.Item>

        {isEdit && (
          <Form.Item name="actif" label="Actif" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}

        {/* Section imprimante */}
        <div style={{
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: 6,
          padding: '12px 12px 0',
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted, #64748b)', marginBottom: 8 }}>
            Imprimante thermique associée
          </div>
          <Form.Item name="nomImprimante" label="Nom imprimante">
            <Input placeholder="Ex: IMP-ENTREE-A" />
          </Form.Item>
          <Form.Item name="printerIP" label="Adresse IP imprimante">
            <Input placeholder="192.168.x.x" />
          </Form.Item>
          <Form.Item name="portImprimante" label="Port TCP">
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
