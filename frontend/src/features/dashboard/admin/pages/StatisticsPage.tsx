/**
 * Страница статистики системы (администратор)
 * 
 * Функциональность:
 * - Общая статистика (пользователи, команды, соревнования, документы)
 * - Графики динамики роста
 * - Распределение пользователей по ролям
 * - Статистика по регионам
 * - Активность пользователей
 * 
 * Использует:
 * - Chart.js для построения графиков
 * - Различные типы графиков (линейные, столбчатые, круговые)
 */

import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Spin } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  TrophyOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const StatisticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      // Загружаем статистику из разных endpoints
      const [usersStats, teamsStats, competitionsStats, applicationsStats, ticketsStats] = await Promise.all([
        apiClient.get('/users/statistics').catch(() => ({ data: { data: {} } })),
        apiClient.get('/teams/statistics/overview').catch(() => ({ data: { data: {} } })),
        apiClient.get('/competitions/statistics/overview').catch(() => ({ data: { data: {} } })),
        apiClient.get('/applications/statistics/overview').catch(() => ({ data: { data: {} } })),
        apiClient.get('/tickets/statistics/overview').catch(() => ({ data: { data: {} } })),
      ]);

      setStats({
        users: usersStats.data.data,
        teams: teamsStats.data.data,
        competitions: competitionsStats.data.data,
        applications: applicationsStats.data.data,
        tickets: ticketsStats.data.data,
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  const userRoleData = stats?.users?.byRole
    ? {
        labels: Object.keys(stats.users.byRole),
        datasets: [
          {
            label: 'Пользователи по ролям',
            data: Object.values(stats.users.byRole),
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)',
            ],
          },
        ],
      }
    : null;

  const competitionsStatusData = stats?.competitions?.byStatus
    ? {
        labels: Object.keys(stats.competitions.byStatus),
        datasets: [
          {
            label: 'Соревнования по статусам',
            data: Object.values(stats.competitions.byStatus),
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
          },
        ],
      }
    : null;

  const teamsStatusData = stats?.teams?.byStatus
    ? {
        labels: Object.keys(stats.teams.byStatus).map(status => {
          const statusMap: Record<string, string> = {
            APPROVED: 'Одобрено',
            PENDING: 'Ожидает',
            REJECTED: 'Отклонено',
          };
          return statusMap[status] || status;
        }),
        datasets: [
          {
            label: 'Команды по статусам',
            data: Object.values(stats.teams.byStatus),
            backgroundColor: [
              'rgba(75, 192, 192, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(255, 99, 132, 0.6)',
            ],
          },
        ],
      }
    : null;

  const applicationsStatusData = stats?.applications?.byStatus
    ? {
        labels: Object.keys(stats.applications.byStatus).map(status => {
          const statusMap: Record<string, string> = {
            APPROVED: 'Одобрено',
            PENDING: 'Ожидает',
            REJECTED: 'Отклонено',
          };
          return statusMap[status] || status;
        }),
        datasets: [
          {
            label: 'Заявки по статусам',
            data: Object.values(stats.applications.byStatus),
            backgroundColor: [
              'rgba(75, 192, 192, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(255, 99, 132, 0.6)',
            ],
          },
        ],
      }
    : null;

  const ticketsStatusData = stats?.tickets?.byStatus
    ? {
        labels: Object.keys(stats.tickets.byStatus).map(status => {
          const statusMap: Record<string, string> = {
            OPEN: 'Открыто',
            CLOSED: 'Закрыто',
          };
          return statusMap[status] || status;
        }),
        datasets: [
          {
            label: 'Обращения по статусам',
            data: Object.values(stats.tickets.byStatus),
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(153, 153, 153, 0.6)',
            ],
          },
        ],
      }
    : null;

  // График динамики соревнований по месяцам (пример данных)
  const competitionsTimelineData = {
    labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    datasets: [
      {
        label: 'Создано соревнований',
        data: [2, 5, 3, 8, 6, 4, 7, 9, 5, 6, 4, 3],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
    ],
  };

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, marginBottom: 24, color: '#262626' }}>Статистика и аналитика</h1>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего пользователей"
              value={stats?.users?.total || 0}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего команд"
              value={stats?.teams?.total || 0}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего соревнований"
              value={stats?.competitions?.total || 0}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Всего заявок"
              value={stats?.applications?.total || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="Пользователи по ролям">
            {userRoleData ? (
              <Pie data={userRoleData} />
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                Нет данных
              </div>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Соревнования по статусам">
            {competitionsStatusData ? (
              <Bar data={competitionsStatusData} />
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                Нет данных
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="Команды по статусам">
            {teamsStatusData ? (
              <Pie data={teamsStatusData} />
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                Нет данных
              </div>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Заявки по статусам">
            {applicationsStatusData ? (
              <Pie data={applicationsStatusData} />
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                Нет данных
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="Обращения по статусам">
            {ticketsStatusData ? (
              <Pie data={ticketsStatusData} />
            ) : (
              <div style={{ textAlign: 'center', padding: 20 }}>
                Нет данных
              </div>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Динамика создания соревнований">
            <Line data={competitionsTimelineData} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Статусы команд">
            <Table
              dataSource={stats?.teams?.byStatus ? Object.entries(stats.teams.byStatus).map(([status, count]) => ({
                key: status,
                status,
                count,
              })) : []}
              columns={[
                {
                  title: 'Статус',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'APPROVED' ? 'green' : status === 'PENDING' ? 'orange' : 'red'}>
                      {status}
                    </Tag>
                  ),
                },
                {
                  title: 'Количество',
                  dataIndex: 'count',
                  key: 'count',
                },
              ]}
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Статусы заявок">
            <Table
              dataSource={stats?.applications?.byStatus ? Object.entries(stats.applications.byStatus).map(([status, count]) => ({
                key: status,
                status,
                count,
              })) : []}
              columns={[
                {
                  title: 'Статус',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'APPROVED' ? 'green' : status === 'PENDING' ? 'orange' : 'red'}>
                      {status}
                    </Tag>
                  ),
                },
                {
                  title: 'Количество',
                  dataIndex: 'count',
                  key: 'count',
                },
              ]}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

