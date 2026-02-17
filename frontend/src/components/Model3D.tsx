/**
 * Компонент для отображения 3D моделей
 * 
 * Функциональность:
 * - Загрузка и отображение GLB/GLTF моделей
 * - Интерактивное управление камерой (OrbitControls)
 * - Автоматическое вращение модели
 * - Настройка позиции, масштаба, вращения
 * - Обработка ошибок загрузки
 * 
 * Использует:
 * - React Three Fiber для 3D рендеринга
 * - Drei для загрузки моделей и контролов
 * - Three.js для 3D графики
 */

import React, { Suspense, useRef, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import logger from '../utils/logger';

interface Model3DProps {
  modelPath: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  autoRotate?: boolean;
  className?: string;
  targetRotation?: number | null;
  rotationSpeed?: number;
}

let BASE_TIME = typeof performance !== 'undefined' ? performance.now() : Date.now();

function Model({ 
  modelPath, 
  scale = 1, 
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  autoRotate = false,
  targetRotation = null,
  rotationSpeed = 0.3
}: Omit<Model3DProps, 'className'>) {
  // Используем useGLTF для загрузки модели
  // useGLTF автоматически обрабатывает текстуры из GLB файла
  const { scene } = useGLTF(modelPath);
  const { camera } = useThree();
  const modelRef = useRef<THREE.Group>(null);
  const initialRotationRef = useRef<number>(rotation[1]);
  const currentRotationRef = useRef<number>(rotation[1]);
  const wasTargetingRef = useRef<boolean>(false);
  const previousTargetRotationRef = useRef<number | null>(null); // Отслеживаем предыдущее значение targetRotation
  const baseRotationRef = useRef<number | null>(null); // Начальное положение модели (лицом к камере)

  // Клонируем сцену для каждого экземпляра модели
  const clonedScene = useMemo(() => {
    return scene.clone();
  }, [scene]);

  useFrame(() => {
    if (!modelRef.current) return;

    // Вычисляем угол поворота для "лицом к камере"
    const getFaceToCameraRotation = () => {
      const modelPosition = new THREE.Vector3(...position);
      const cameraPosition = new THREE.Vector3();
      camera.getWorldPosition(cameraPosition);
      
      // Вычисляем направление от модели к камере
      const direction = new THREE.Vector3()
        .subVectors(cameraPosition, modelPosition)
        .normalize();
      
      // Вычисляем угол поворота вокруг оси Y
      // atan2 возвращает угол от -PI до PI
      const angle = Math.atan2(direction.x, direction.z);
      
      // Смещение угла для настройки (в радианах)
      // Можно менять это значение для поворота модели влево/вправо
      // Например: 0 = прямо к камере, Math.PI/4 = 45° вправо, -Math.PI/4 = 45° влево
      const angleOffset = 0.5; // Измените это значение для настройки
      
      return angle + angleOffset;
    };

    // При первом рендере сохраняем начальное положение
    if (baseRotationRef.current === null) {
      const faceToCameraAngle = getFaceToCameraRotation();
      baseRotationRef.current = faceToCameraAngle;
      initialRotationRef.current = rotation[1];
      currentRotationRef.current = rotation[1];
    }

    // Обнаруживаем переход в состояние наведения (targetRotation становится !== null)
    const justStartedTargeting = previousTargetRotationRef.current === null && targetRotation !== null;
    
    // Обнаруживаем переход из состояния наведения (targetRotation !== null) в состояние авто-вращения (targetRotation === null)
    const justStoppedTargeting = previousTargetRotationRef.current !== null && targetRotation === null;

    if (justStartedTargeting) {
      // Только что навели мышь - устанавливаем начальную точку вращения равной "лицом к камере"
      const faceToCameraAngle = getFaceToCameraRotation();
      initialRotationRef.current = faceToCameraAngle;
      BASE_TIME = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
    
    if (justStoppedTargeting) {
      // Только что убрали мышь - сохраняем ТЕКУЩЕЕ положение модели (лицом к камере) как начальную точку для продолжения вращения
      initialRotationRef.current = currentRotationRef.current;
      BASE_TIME = typeof performance !== 'undefined' ? performance.now() : Date.now();
      wasTargetingRef.current = false;
    }

    // Обновляем предыдущее значение
    previousTargetRotationRef.current = targetRotation;

    if (targetRotation !== null) {
      // Поворачиваем к положению "лицом к камере" (вычисляем динамически)
      const target = getFaceToCameraRotation();
      let current = currentRotationRef.current;
      
      // Нормализуем углы для выбора кратчайшего пути поворота
      const normalizeAngle = (angle: number) => {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
      };
      
      // Вычисляем кратчайший путь к цели
      let diff = normalizeAngle(target - current);
      
      // Используем интерполяцию для плавного поворота
      const lerpFactor = 0.3; // Скорость поворота
      
      // Если разница маленькая, устанавливаем точно target
      if (Math.abs(diff) < 0.01) {
        // Точное достижение цели - лицом к камере
        currentRotationRef.current = target;
        modelRef.current.rotation.y = target;
        wasTargetingRef.current = true;
        return;
      } else {
        // Плавный поворот к камере
        const newRotation = normalizeAngle(current + diff * lerpFactor);
        currentRotationRef.current = newRotation;
        modelRef.current.rotation.y = newRotation;
        wasTargetingRef.current = true;
      }
    } else if (autoRotate) {
      // Обычное автоматическое вращение с начальной точки (сохраненной при уходе мыши)
      const currentTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsedTime = (currentTime - BASE_TIME) / 1000;
      const rotationTime = elapsedTime * rotationSpeed;
      const newRotation = initialRotationRef.current + rotationTime;
      currentRotationRef.current = newRotation;
      modelRef.current.rotation.y = newRotation;
    }
  });

  // Фиксируем позицию модели (НЕ трогаем initialRotationRef здесь, чтобы не перезаписывать значение при наведении)
  React.useEffect(() => {
    if (modelRef.current) {
      modelRef.current.position.set(...position);
      modelRef.current.rotation.set(...rotation);
      // НЕ обновляем initialRotationRef здесь - это делается в useFrame при наведении/уходе мыши
      if (baseRotationRef.current === null) {
        initialRotationRef.current = rotation[1];
        currentRotationRef.current = rotation[1];
      }
    }
  }, [position, rotation]);

  return (
    <primitive
      ref={modelRef}
      object={clonedScene}
      scale={scale}
      position={position}
      rotation={[rotation[0], currentRotationRef.current, rotation[2]]}
    />
  );
}

// ErrorBoundary для изоляции ошибок загрузки HDRI
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class EnvironmentErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку, но не блокируем работу приложения
    if (error.message?.includes('hdr') || 
        error.message?.includes('HDRI') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('ERR_TIMED_OUT')) {
      logger.warn('Failed to load HDRI environment, using basic lighting', { error: error.message });
    } else {
      logger.error('Environment component error', { error: error.message, stack: errorInfo.componentStack });
    }
  }

  render() {
    if (this.state.hasError) {
      // Если ошибка загрузки HDRI, просто не рендерим Environment
      // Базовое освещение (ambientLight + directionalLight) продолжит работать
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}

// Компонент Environment с обработкой ошибок загрузки HDRI
// Если внешний HDRI недоступен (таймаут, проблемы с сетью),
// используется только базовое освещение (ambientLight + directionalLight)
function SafeEnvironment() {
  return (
    <EnvironmentErrorBoundary>
      <Suspense fallback={null}>
        {/* 
          Если preset "sunset" недоступен (таймаут, проблемы с сетью),
          ErrorBoundary поймает ошибку и просто не отрендерит Environment.
          Базовое освещение продолжит работать.
        */}
        <Environment preset="sunset" />
      </Suspense>
    </EnvironmentErrorBoundary>
  );
}

export const Model3D: React.FC<Model3DProps> = ({
  modelPath,
  scale = 1.5,
  position = [0, -1, 0],
  rotation = [0, 0, 0],
  autoRotate = true,
  className,
  targetRotation = null,
  rotationSpeed = 0.3,
}) => {
  return (
    <div className={className} style={{ width: '100%', height: '1800px', position: 'relative', overflow: 'visible' }}>
      <Canvas
        camera={{ position: [0, 0, 13], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
        frameloop="always"
      >
        <Suspense 
          fallback={null}
          // Обрабатываем ошибки загрузки HDRI без прерывания рендера сцены
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <directionalLight position={[-5, -5, -5]} intensity={0.5} />
          <Model
            modelPath={modelPath}
            scale={scale}
            position={position}
            rotation={rotation}
            autoRotate={autoRotate}
            targetRotation={targetRotation}
            rotationSpeed={rotationSpeed}
          />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.5}
            autoRotate={autoRotate && targetRotation === null}
            autoRotateSpeed={0.5}
            enableDamping={false}
            dampingFactor={0}
          />
          {/* Environment обернут в отдельный Suspense для изоляции ошибок загрузки HDRI */}
          <SafeEnvironment />
        </Suspense>
      </Canvas>
    </div>
  );
};


