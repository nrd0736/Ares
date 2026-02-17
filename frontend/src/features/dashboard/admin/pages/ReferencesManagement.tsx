/**
 * Страница управления справочниками (администратор)
 * 
 * Функциональность:
 * - Управление федеральными округами
 * - Управление регионами
 * - Управление видами спорта
 * - Управление весовыми категориями
 * - Управление спортивными разрядами
 * 
 * CRUD операции для всех справочников
 */

import { useState, useEffect } from 'react';
import { Tabs, Table, Button, Space, Tag, Modal, Form, Input, Select, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';

interface FederalDistrict {
  id: string;
  name: string;
  code: string;
  description?: string;
}

interface Region {
  id: string;
  name: string;
  code: string;
  federalDistrictId: string;
  federalDistrict?: {
    name: string;
  };
}

interface Sport {
  id: string;
  name: string;
  description?: string;
  rules?: string;
}

interface WeightCategory {
  id: string;
  name: string;
  sportId: string;
  minWeight?: number;
  maxWeight?: number;
  sport?: {
    name: string;
  };
}

interface SportsRank {
  id: string;
  name: string;
  description?: string;
  order: number;
}

export const ReferencesManagement = () => {
  const [activeTab, setActiveTab] = useState('sports');
  const [federalDistricts, setFederalDistricts] = useState<FederalDistrict[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [weightCategories, setWeightCategories] = useState<WeightCategory[]>([]);
  const [sportsRanks, setSportsRanks] = useState<SportsRank[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'federal-district' | 'region' | 'sport' | 'weight-category' | 'sports-rank'>('sport');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'federal-districts') {
        const response = await apiClient.get('/references/federal-districts');
        setFederalDistricts(response.data.data);
      } else if (activeTab === 'regions') {
        const response = await apiClient.get('/references/regions');
        setRegions(response.data.data);
      } else if (activeTab === 'sports') {
        const response = await apiClient.get('/references/sports');
        setSports(response.data.data);
      } else if (activeTab === 'weight-categories') {
        // Загружаем все весовые категории через виды спорта
        const sportsResponse = await apiClient.get('/references/sports');
        const allCategories: WeightCategory[] = [];
        for (const sport of sportsResponse.data.data) {
          if (sport.weightCategories) {
            allCategories.push(...sport.weightCategories.map((cat: any) => ({
              ...cat,
              sport: { name: sport.name },
            })));
          }
        }
        setWeightCategories(allCategories);
      } else if (activeTab === 'sports-ranks') {
        const response = await apiClient.get('/references/sports-ranks');
        setSportsRanks(response.data.data);
      }
    } catch (error: any) {
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (type: typeof modalType) => {
    setModalType(type);
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    try {
      let endpoint = '';
      let data = values;

      if (modalType === 'federal-district') {
        endpoint = '/references/federal-districts';
      } else if (modalType === 'region') {
        endpoint = '/references/regions';
      } else if (modalType === 'sport') {
        endpoint = '/references/sports';
      } else if (modalType === 'weight-category') {
        endpoint = '/references/weight-categories';
      } else if (modalType === 'sports-rank') {
        endpoint = '/references/sports-ranks';
      }

      if (editingItem) {
        // Обновление
        await apiClient.put(`${endpoint}/${editingItem.id}`, data);
        message.success('Запись успешно обновлена');
      } else {
        // Создание
        await apiClient.post(endpoint, data);
        message.success('Запись успешно создана');
      }
      setModalVisible(false);
      setEditingItem(null);
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (item: any, type: typeof modalType) => {
    setModalType(type);
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalVisible(true);
  };

  const handleDelete = async (id: string, type: typeof modalType) => {
    try {
      let endpoint = '';
      if (type === 'federal-district') {
        endpoint = '/references/federal-districts';
      } else if (type === 'region') {
        endpoint = '/references/regions';
      } else if (type === 'sport') {
        endpoint = '/references/sports';
      } else if (type === 'weight-category') {
        endpoint = '/references/weight-categories';
      } else if (type === 'sports-rank') {
        endpoint = '/references/sports-ranks';
      }

      await apiClient.delete(`${endpoint}/${id}`);
      message.success('Запись успешно удалена');
      loadData();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Ошибка при удалении');
    }
  };

  const federalDistrictsColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: FederalDistrict) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record, 'federal-district')}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить федеральный округ?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id, 'federal-district')}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const regionsColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: 'Федеральный округ',
      key: 'federalDistrict',
      render: (_: any, record: Region) => record.federalDistrict?.name || '-',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Region) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record, 'region')}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить регион?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id, 'region')}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const sportsColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Sport) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record, 'sport')}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить вид спорта?"
            description="Это действие нельзя отменить. Будут также удалены все весовые категории этого вида спорта."
            onConfirm={() => handleDelete(record.id, 'sport')}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const weightCategoriesColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Вид спорта',
      key: 'sport',
      render: (_: any, record: WeightCategory) => record.sport?.name || '-',
    },
    {
      title: 'Вес',
      key: 'weight',
      render: (_: any, record: WeightCategory) => {
        if (record.minWeight && record.maxWeight) {
          return `${record.minWeight} - ${record.maxWeight} кг`;
        }
        return '-';
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: WeightCategory) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record, 'weight-category')}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить весовую категорию?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id, 'weight-category')}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const sportsRanksColumns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Порядок',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: SportsRank) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record, 'sports-rank')}
          >
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить спортивный разряд?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id, 'sports-rank')}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'sports',
      label: 'Виды спорта',
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <h3>Виды спорта</h3>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreate('sport')}>
              Добавить вид спорта
            </Button>
          </div>
          <Table
            columns={sportsColumns}
            dataSource={sports}
            loading={loading}
            rowKey="id"
          />
        </div>
      ),
    },
    {
      key: 'weight-categories',
      label: 'Весовые категории',
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <h3>Весовые категории</h3>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreate('weight-category')}>
              Добавить весовую категорию
            </Button>
          </div>
          <Table
            columns={weightCategoriesColumns}
            dataSource={weightCategories}
            loading={loading}
            rowKey="id"
          />
        </div>
      ),
    },
    {
      key: 'federal-districts',
      label: 'Федеральные округа',
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <h3>Федеральные округа</h3>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreate('federal-district')}>
              Добавить федеральный округ
            </Button>
          </div>
          <Table
            columns={federalDistrictsColumns}
            dataSource={federalDistricts}
            loading={loading}
            rowKey="id"
          />
        </div>
      ),
    },
    {
      key: 'regions',
      label: 'Регионы',
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <h3>Регионы</h3>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreate('region')}>
              Добавить регион
            </Button>
          </div>
          <Table
            columns={regionsColumns}
            dataSource={regions}
            loading={loading}
            rowKey="id"
          />
        </div>
      ),
    },
    {
      key: 'sports-ranks',
      label: 'Спортивные разряды',
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <h3>Спортивные разряды</h3>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreate('sports-rank')}>
              Добавить спортивный разряд
            </Button>
          </div>
          <Table
            columns={sportsRanksColumns}
            dataSource={sportsRanks}
            loading={loading}
            rowKey="id"
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, marginBottom: 24, color: '#262626' }}>Управление справочниками</h1>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <Modal
        title={
          editingItem
            ? modalType === 'sport' ? 'Редактировать вид спорта' :
              modalType === 'weight-category' ? 'Редактировать весовую категорию' :
              modalType === 'federal-district' ? 'Редактировать федеральный округ' :
              modalType === 'sports-rank' ? 'Редактировать спортивный разряд' :
              'Редактировать регион'
            : modalType === 'sport' ? 'Создать вид спорта' :
              modalType === 'weight-category' ? 'Создать весовую категорию' :
              modalType === 'federal-district' ? 'Создать федеральный округ' :
              modalType === 'sports-rank' ? 'Создать спортивный разряд' :
              'Создать регион'
        }
        open={modalVisible}
        onCancel={handleModalClose}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {modalType === 'sport' && (
            <>
              <Form.Item name="name" label="Название" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="description" label="Описание">
                <Input.TextArea rows={4} />
              </Form.Item>
              <Form.Item name="rules" label="Правила">
                <Input.TextArea rows={6} />
              </Form.Item>
            </>
          )}

          {modalType === 'weight-category' && (
            <>
              <Form.Item name="sportId" label="Вид спорта" rules={[{ required: true }]}>
                <Select placeholder="Выберите вид спорта">
                  {sports.map((sport) => (
                    <Select.Option key={sport.id} value={sport.id}>
                      {sport.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="name" label="Название" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="minWeight" label="Минимальный вес (кг)" rules={[{ type: 'number', min: 0 }]}>
                <Input type="number" step="0.1" />
              </Form.Item>
              <Form.Item name="maxWeight" label="Максимальный вес (кг)" rules={[{ type: 'number', min: 0 }]}>
                <Input type="number" step="0.1" />
              </Form.Item>
            </>
          )}

          {modalType === 'federal-district' && (
            <>
              <Form.Item name="name" label="Название" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="code" label="Код" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="description" label="Описание">
                <Input.TextArea rows={4} />
              </Form.Item>
            </>
          )}

          {modalType === 'region' && (
            <>
              <Form.Item name="federalDistrictId" label="Федеральный округ" rules={[{ required: true }]}>
                <Select placeholder="Выберите федеральный округ">
                  {federalDistricts.map((district) => (
                    <Select.Option key={district.id} value={district.id}>
                      {district.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="name" label="Название" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="code" label="Код" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </>
          )}

          {modalType === 'sports-rank' && (
            <>
              <Form.Item name="name" label="Название" rules={[{ required: true }]}>
                <Input placeholder="Например: III разряд, II разряд, I разряд, КМС, МС, МСМК" />
              </Form.Item>
              <Form.Item name="description" label="Описание">
                <Input.TextArea rows={4} placeholder="Описание спортивного разряда" />
              </Form.Item>
              <Form.Item name="order" label="Порядок сортировки" rules={[{ type: 'number', min: 0 }]}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="Чем меньше число, тем выше разряд в списке" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
};

