/**
 * Страница генерации отчетов о соревнованиях (администратор)
 * 
 * Функциональность:
 * - Генерация Word отчетов о соревнованиях
 * - Типы отчетов: список судей, состав команд, победители, протокол, пары
 * - Скачивание отчетов в формате .docx
 */

import { useState, useEffect } from 'react';
import { Card, Select, Button, message, Space, Spin, Radio, Row, Col, Form } from 'antd';
import { FilePdfOutlined, DownloadOutlined, FileWordOutlined } from '@ant-design/icons';
import apiClient from '../../../../services/api-client';
import logger from '../../../../utils/logger';

interface Competition {
  id: string;
  name: string;
  status: string;
  sport?: {
    name: string;
  };
  startDate: string;
  endDate: string;
  brackets?: Array<{
    id: string;
    weightCategory: {
      id: string;
      name: string;
    };
  }>;
}

export const CompetitionReports = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [reportType, setReportType] = useState<string>('full');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/competitions', {
        params: {
          limit: 1000,
          status: 'COMPLETED',
          includeBrackets: true,
        },
      });
      setCompetitions(response.data.data.competitions || []);
    } catch (error: any) {
      message.error('Ошибка загрузки соревнований');
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitionSelect = (value: string) => {
    setSelectedCompetitionId(value);
    const competition = competitions.find(c => c.id === value);
    setSelectedCompetition(competition || null);
  };

  const handleGenerateReport = async () => {
    if (!selectedCompetitionId) {
      message.warning('Выберите соревнование');
      return;
    }

    setGenerating(true);
    try {
      let url = '';
      let filename = '';

      switch (reportType) {
        case 'full':
          url = `/competitions/${selectedCompetitionId}/report`;
          filename = `полный-отчет-${selectedCompetitionId}.pdf`;
          break;
        case 'judges':
          url = `/competitions/${selectedCompetitionId}/reports/judges-list`;
          filename = `список-судей-${selectedCompetitionId}.docx`;
          break;
        case 'team-composition':
          url = `/competitions/${selectedCompetitionId}/reports/team-composition`;
          filename = `состав-команд-${selectedCompetitionId}.docx`;
          break;
        case 'winners':
          url = `/competitions/${selectedCompetitionId}/reports/winners-list`;
          filename = `победители-${selectedCompetitionId}.docx`;
          break;
        case 'protocol':
          url = `/competitions/${selectedCompetitionId}/reports/protocol`;
          filename = `протокол-${selectedCompetitionId}.docx`;
          break;
        case 'pairs':
          url = `/competitions/${selectedCompetitionId}/reports/pairs-list`;
          filename = `состав-пар-${selectedCompetitionId}.docx`;
          break;
        default:
          throw new Error('Неизвестный тип отчёта');
      }

      const response = await apiClient.get(url, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { 
        type: reportType === 'full' 
          ? 'application/pdf' 
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      if (blob.size === 0) {
        throw new Error('Сгенерированный файл пуст');
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      message.success(`Отчёт "${getReportTypeName(reportType)}" успешно сгенерирован`);
    } catch (error: any) {
      logger.error('Report generation failed', { error: error.message, reportType });
      
      if (error.response?.data) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          message.error(errorData.error || 'Ошибка генерации отчёта');
        } catch (e) {
          message.error(error.message || 'Ошибка генерации отчёта');
        }
      } else {
        message.error(error.message || 'Ошибка при генерации отчёта');
      }
    } finally {
      setGenerating(false);
    }
  };

  const getReportTypeName = (type: string): string => {
    switch (type) {
      case 'full': return 'Полный отчёт (PDF)';
      case 'judges': return 'Список судей (Word)';
      case 'team-composition': return 'Состав команд по весовым категориям (Word)';
      case 'winners': return 'Список победителей и призёров (Word)';
      case 'protocol': return 'Протокол хода соревнований (Word)';
      case 'pairs': return 'Состав пар (Word)';
      default: return 'Отчёт';
    }
  };

  return (
    <div>
      <Card>
        <h1 style={{ fontSize: '28px', fontWeight: 600, margin: 0, color: '#262626' }}>Генерация отчётов о соревнованиях</h1>
        <p style={{ marginBottom: 24, color: '#666' }}>
          Выберите завершённое соревнование и тип отчёта для генерации.
        </p>
        <p style={{ marginBottom: 24, color: '#ff4d4f', fontStyle: 'italic' }}>
          Примечание: Отчёт можно сгенерировать только для завершённых соревнований.
        </p>

        <Form form={form} layout="vertical">
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Form.Item label="Выберите соревнование:" required>
              <Select
                style={{ width: '100%', maxWidth: 600 }}
                placeholder="Выберите соревнование"
                showSearch
                loading={loading}
                value={selectedCompetitionId}
                onChange={handleCompetitionSelect}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
                options={competitions.map((comp) => ({
                  value: comp.id,
                  label: `${comp.name}${comp.sport ? ` (${comp.sport.name})` : ''} - ${new Date(comp.startDate).toLocaleDateString('ru-RU')}`,
                }))}
              />
            </Form.Item>

            <Form.Item label="Выберите тип отчёта:" required>
              <Radio.Group 
                value={reportType} 
                onChange={(e) => setReportType(e.target.value)}
                style={{ width: '100%' }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Radio value="full" style={{ display: 'block', marginBottom: 8 }}>
                      <strong>Полный отчёт (PDF)</strong>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                        Полная информация о соревновании, командах, спортсменах, тренерах, судьях, турнирных сетках, результатах и статистике
                      </div>
                    </Radio>
                  </Col>
                  <Col span={24}>
                    <Radio value="judges" style={{ display: 'block', marginBottom: 8 }}>
                      <strong>Список судей (Word)</strong>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                        Таблица со списком судей: ФИО, субъект, категория, должность, оценка
                      </div>
                    </Radio>
                  </Col>
                  <Col span={24}>
                    <Radio value="team-composition" style={{ display: 'block', marginBottom: 8 }}>
                      <strong>Состав команд по весовым категориям (Word)</strong>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                        Распределение участников по командам, весовым категориям и разрядам
                      </div>
                    </Radio>
                  </Col>
                  <Col span={24}>
                    <Radio value="winners" style={{ display: 'block', marginBottom: 8 }}>
                      <strong>Список победителей и призёров (Word)</strong>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                        Список победителей по весовым категориям с указанием ФИО, организации, разряда, даты рождения, тренера
                      </div>
                    </Radio>
                  </Col>
                  <Col span={24}>
                    <Radio value="protocol" style={{ display: 'block', marginBottom: 8 }}>
                      <strong>Протокол хода соревнований (Word)</strong>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                        Турнирная сетка и таблица личных результатов
                      </div>
                    </Radio>
                  </Col>
                  <Col span={24}>
                    <Radio value="pairs" style={{ display: 'block' }}>
                      <strong>Состав пар (Word)</strong>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                        Состав пар по возрастным группам и весовым категориям: номера участников, ФИО, команды, коды федеральных округов
                      </div>
                    </Radio>
                  </Col>
                </Row>
              </Radio.Group>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                icon={reportType === 'full' ? <FilePdfOutlined /> : <FileWordOutlined />}
                size="large"
                onClick={handleGenerateReport}
                disabled={!selectedCompetitionId || generating}
                loading={generating}
                style={{ marginTop: 16 }}
              >
                {generating ? 'Генерация отчёта...' : `Сгенерировать ${getReportTypeName(reportType)}`}
              </Button>
              
              <div style={{ fontSize: '12px', color: '#666', marginTop: 8 }}>
                {reportType === 'full' 
                  ? 'Отчёт будет сгенерирован в формате PDF' 
                  : 'Отчёт будет сгенерирован в формате Word (DOCX)'}
              </div>
            </Form.Item>
          </Space>
        </Form>
      </Card>
    </div>
  );
};