import { useEffect } from 'react';
import { Form, Input, Modal, Select, Switch } from 'antd';
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
          ? { nom: initialValues.nom, adresseIP: initialValues.adresseIP, actif: initialValues.actif }
          : { nom: '', adresseIP: '', actif: true, siteId: sites.length === 1 ? sites[0].siteId : undefined }
      );
    }
  }, [open, initialValues, form, sites]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit(values);
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
          label="Adresse IP"
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
      </Form>
    </Modal>
  );
}
