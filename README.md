# ⚓ Seaport Simulation

Имитационная модель работы морского порта, реализованная на **C++17** (backend) и **React + TypeScript** (frontend).  
Проект моделирует прибытие судов, очереди, загрузку доков и начисление штрафов за простой.

---

## 📋 Содержание
1. [Постановка задачи](#-постановка-задачи)
2. [Диаграмма классов](#-диаграмма-классов)
3. [Спецификации классов](#-спецификации-классов)
4. [Инструментальные средства](#-инструментальные-средства)
5. [Файловая структура](#-файловая-структура)
6. [Пользовательский интерфейс](#-пользовательский-интерфейс)
7. [Эксперименты](#-эксперименты)
8. [GitHub и запуск](#-github-и-запуск)

---

## 🎯 Постановка задачи

Цель — разработать имитационную модель работы морского порта для оценки пропускной способности и простоев судов.  
Модель дискретно-временная, шаг симуляции — **минуты**.

Входные данные:
- параметры симуляции: шаг, количество кранов, скорости разгрузки, штраф, джиттер прибытия, длительность, seed;
- расписание судов: имя, тип (BULK / LIQUID / CONTAINER), прибытие, вес.

Основные процессы:
- Судно прибывает в момент `arrival + jitter`;
- Встаёт в очередь по типу груза;
- Назначается на свободный кран своего типа;
- После завершения разгрузки кран освобождается;
- Штраф начисляется за ожидание.

---

## 🧩 Диаграмма классов

```plantuml
@startuml
enum CargoType { BULK; LIQUID; CONTAINER }

class SimulationConfig {
  +int totalDuration
  +int step
  +int cranesBulk
  +int cranesLiquid
  +int cranesContainer
  +int arrivalJitterMin
  +int arrivalJitterMax
  +int unloadExtraMin
  +int unloadExtraMax
  +double rateBulk
  +double rateLiquid
  +double rateContainer
  +double finePerMinute
  +int seed
  +vector<ShipPlan> schedule
  +json to_json() const
  +static SimulationConfig from_json(json)
}

class ShipPlan { +string name +CargoType type +int arrival +int weight }

class Ship {
  +string name
  +CargoType type
  +int arrival
  +int actualArrival
  +int weight
  +int unloadTime
  +bool inQueue
  +bool unloading
  +bool finished
  +optional<int> startUnload
  +optional<int> finish
}

class Crane { +CargoType type +bool busy +int busyUntil }

class Port {
  +int now
  +double fine
  +SimulationConfig* cfg
  +vector<Ship> ships
  +vector<Crane> cranes
  +queue<int> qBulk
  +queue<int> qLiquid
  +queue<int> qContainer
  +setConfig(cfg)
  +reset()
  +simulateStep(delta)
  +getState() : json
}

SimulationConfig "1" o-- "*" ShipPlan
Port "1" --> "1" SimulationConfig
Port "1" *-- "*" Ship
Port "1" *-- "*" Crane
@enduml
```

---

## 🧱 Спецификации классов

### SimulationConfig
Хранит все параметры симуляции и расписание судов.  
Методы:
- `to_json()` — сериализация;
- `from_json()` — десериализация (очищает `schedule`).

### Port
Главный класс модели:
- время симуляции `now`, штраф `fine`;
- списки судов, кранов и очередей по типам;
- методы управления симуляцией.

`simulateStep(dt)` выполняет:
1. Обновление времени;
2. Освобождение кранов;
3. Прибытие судов;
4. Назначение кранов;
5. Завершение разгрузки;
6. Начисление штрафа.

### Ship
Состояния:
- в пути;
- в очереди;
- разгружается;
- завершено.

### Crane
Содержит тип (`BULK/LIQUID/CONTAINER`), статус занятости и время освобождения.

---

## ⚙ Инструментальные средства

| Компонент | Технологии |
|------------|-------------|
| Backend | **C++17**, `cpp-httplib`, `nlohmann/json`, STL |
| Frontend | **React**, **TypeScript**, **Tailwind CSS**, `lucide-react`, `framer-motion` |
| IDE | CLion |
| Сборка | CMake + npm |

---

## 📁 Файловая структура

```
Seaport/
├─ backend/
│  ├─ include/
│  │  ├─ api.hpp
│  │  ├─ config.hpp
│  │  ├─ port.hpp
│  │  ├─ httplib.h
│  │  └─ json.hpp
│  ├─ src/
│  │  ├─ main.cpp
│  │  ├─ api.cpp
│  │  └─ port.cpp
│  └─ CMakeLists.txt
│
├─ frontend/
│  ├─ src/
│  │  ├─ api/portApi.ts
│  │  ├─ components/
│  │  │  ├─ ConfigEditor.tsx
│  │  │  └─ PortSimulation.tsx
│  │  ├─ App.tsx
│  │  └─ main.tsx
│  ├─ tailwind.config.js
│  ├─ postcss.config.js
│  └─ vite.config.ts
│
└─ README.md
```

---

## 🧭 Пользовательский интерфейс

### Конфигурация
- Настройка всех параметров модели;
- Таблица расписания судов с добавлением и редактированием.

### Симуляция
- Панель: **Старт / Стоп / Шаг / Сброс / Скорость (1–100×)**;
- Информационные карточки: текущее время, штраф, последнее событие;
- Колонки:
  - *В пути* — прибывающие суда;
  - *Очереди* — три типа грузов;
  - *Доки* — состояние всех кранов (занят / свободен);
  - *Завершённые* — список разгруженных судов.

---

## 🔬 Эксперименты

### E1. Базовый сценарий
2 BULK, 2 LIQUID, 1 CONTAINER.  
Штраф минимальный, узкое место — контейнерный кран.

### E2. Увеличение веса контейнеров на 30%
Очередь контейнеров увеличилась, штраф вырос на 40%.

### E3. Добавление второго контейнерного крана
Штраф снизился на 45%, очереди исчезли.

### E4. Рост джиттера до ±24 ч
Появились пики прибытия, штраф вырос на 15%.

**Вывод:** увеличение количества кранов и снижение джиттера повышают эффективность работы порта.

---

## 🧩 GitHub и запуск

### Репозиторий
```bash
git init
git branch -M main
git add .
git commit -m "Initial commit: Seaport Simulation"
git remote add origin https://github.com/<username>/seaport-sim.git
git push -u origin main
```

### .gitignore
```
# C++
/backend/build/
/backend/cmake-build-*/
/backend/*.o
/backend/*.log

# Node / Vite
/frontend/node_modules/
/frontend/dist/

# IDE / OS
.DS_Store
.idea/
.vscode/
```

---

## 🚀 Запуск проекта

### Backend
```bash
cd backend
mkdir build && cd build
cmake ..
make
./seaport-server
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Открыть в браузере: [http://localhost:5173](http://localhost:5173)

---

## 📸 Скриншоты

*(вставить изображения интерфейса симуляции)*

---

## 🧠 Автор
**Михаил Силаев (Misha)**  
Разработка архитектуры, логики симуляции и интерфейса.
