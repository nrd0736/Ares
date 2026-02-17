/**
 * Точка входа React приложения
 * 
 * Функциональность:
 * - Инициализация React приложения
 * - Подключение Redux store
 * - Настройка Ant Design (русская локализация)
 * - Рендеринг главного компонента App
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import App from './App';
import { store } from './store/store';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider locale={ruRU}>
        <App />
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
);

