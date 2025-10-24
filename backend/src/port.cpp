#include "port.hpp"
#include <algorithm>
#include <cmath>
#include <iostream>

namespace termcolor {
constexpr const char *reset = "\033[0m";
constexpr const char *gray = "\033[90m";
constexpr const char *cyan = "\033[36m";
constexpr const char *yellow = "\033[33m";
constexpr const char *green = "\033[32m";
constexpr const char *blue = "\033[34m";
constexpr const char *magenta = "\033[35m";
} // namespace termcolor

int Port::randomJitter(int left, int right) {
  if (left > right) {
    std::swap(left, right);
  }

  std::uniform_int_distribution<int> dist(left, right);
  return dist(rng);
}

int Port::computeUnloadTime(const Ship &ship) {
  double rate = 0.0;
  switch (ship.type) {
  case CargoType::BULK:
    rate = cfg->rateBulk;
    break;
  case CargoType::LIQUID:
    rate = cfg->rateLiquid;
    break;
  case CargoType::CONTAINER:
    rate = cfg->rateContainer;
    break;
  }

  int base = static_cast<int>(std::round(ship.weight / rate));

  int extra = 0;
  if (cfg->unloadExtraMax > cfg->unloadExtraMin) {
    extra = randomJitter(cfg->unloadExtraMin, cfg->unloadExtraMax);
  }

  return std::max(1, base + extra);
}

void Port::setConfig(SimulationConfig *conf) {
  cfg = conf;
  rng.seed(cfg->seed);
}

void Port::reset() {
  if (cfg == nullptr) {
    return;
  }

  now = 0;
  fine = 0.0;
  ships.clear();
  cranes.clear();
  while (!qBulk.empty()) {
    qBulk.pop();
  }
  while (!qLiquid.empty()) {
    qLiquid.pop();
  }
  while (!qContainer.empty()) {
    qContainer.pop();
  }

  // --- создаём краны ---
  for (int i = 0; i < cfg->cranesBulk; ++i) {
    cranes.push_back({CargoType::BULK, false, 0});
  }
  for (int i = 0; i < cfg->cranesLiquid; ++i) {
    cranes.push_back({CargoType::LIQUID, false, 0});
  }
  for (int i = 0; i < cfg->cranesContainer; ++i) {
    cranes.push_back({CargoType::CONTAINER, false, 0});
  }

  for (auto const &plan : cfg->schedule) {
    Ship ship;
    ship.name = plan.name;
    ship.type = plan.type;
    ship.arrival = plan.arrival;
    ship.weight = plan.weight;
    ship.actualArrival =
        std::max(0, ship.arrival + randomJitter(cfg->arrivalJitterMin,
                                                cfg->arrivalJitterMax));
    ship.unloadTime = computeUnloadTime(ship);
    ships.push_back(ship);
  }

  std::cout << "\n⚓ Порт инициализирован\n";
  std::cout << "───────────────────────────────────────────────\n";
  std::cout << "📦 Кораблей: " << ships.size()
            << "   ⚙️  Кранов: " << cranes.size() << "\n";
  std::cout << "───────────────────────────────────────────────\n";

  for (auto const &shipEl : ships) {
    std::string typeIcon;
    std::string typeName;
    switch (shipEl.type) {
    case CargoType::BULK:
      typeIcon = "⛏";
      typeName = "BULK";
      break;
    case CargoType::LIQUID:
      typeIcon = "🛢";
      typeName = "LIQUID";
      break;
    case CargoType::CONTAINER:
      typeIcon = "📦";
      typeName = "CONTAINER";
      break;
    }

    std::cout << typeIcon << " " << std::setw(10) << std::left << shipEl.name
              << " | " << std::setw(10) << std::left << typeName
              << " | Прибытие: " << std::setw(5) << shipEl.arrival << " → "
              << std::setw(5) << shipEl.actualArrival
              << " | Вес: " << std::setw(7) << shipEl.weight
              << " | Разгрузка: " << shipEl.unloadTime << " мин"
              << "\n";
  }

  std::cout << "───────────────────────────────────────────────\n";
  std::cout << " Краны:\n";
  std::cout << "  • BULK: " << cfg->cranesBulk << "\n";
  std::cout << "  • LIQUID: " << cfg->cranesLiquid << "\n";
  std::cout << "  • CONTAINER: " << cfg->cranesContainer << "\n";
  std::cout << "───────────────────────────────────────────────\n\n";
}

void Port::simulateStep(int delta) {
  if ((cfg == nullptr) || delta <= 0) {
    return;
  }

  now += delta;

  for (auto &craneEl : cranes) {
    if (craneEl.busy && craneEl.busyUntil <= now) {
      craneEl.busy = false;
    }
  }

  enqueueArrivals();

  tryAssignCranes();

  completeFinished();

  accrueFine();
}

void Port::enqueueArrivals() {

  for (int i = 0; i < (int)ships.size(); ++i) {
    auto &s = ships[i];
    if (!s.finished && !s.unloading && !s.inQueue && s.actualArrival <= now) {
      s.inQueue = true;
      switch (s.type) {
      case CargoType::BULK:
        qBulk.push(i);
        break;
      case CargoType::LIQUID:
        qLiquid.push(i);
        break;
      case CargoType::CONTAINER:
        qContainer.push(i);
        break;
      }

      std::string typeIcon = (s.type == CargoType::BULK)     ? "⛏"
                        : (s.type == CargoType::LIQUID) ? "🛢"
                                                        : "📦";

        std::cout << termcolor::blue << "🕓 [t=" << std::setw(5) << now << "] " << termcolor::reset
           << typeIcon << " " << std::setw(10) << std::left << s.name
           << " — прибыл в порт (очередь: " << typeIcon << ")" << '\n';
    }
  }
}

void Port::tryAssignCranes() {

  auto popQ = [&](CargoType t, int &idx) -> bool {
    std::queue<int> *q = nullptr;
    if (t == CargoType::BULK)
      q = &qBulk;
    else if (t == CargoType::LIQUID)
      q = &qLiquid;
    else
      q = &qContainer;

    while (!q->empty()) {
      int front = q->front();
      q->pop();
      auto &s = ships[front];
      if (s.unloading || s.finished || s.assigned)
        continue;
      idx = front;
      return true;
    }
    return false;
  };

  for (auto &c : cranes) {
    if (c.busy)
      continue;

    int idx = -1;
    if (!popQ(c.type, idx))
      continue;
    auto &s = ships[idx];
    if (s.unloading || s.finished || s.assigned)
      continue;

    s.inQueue = false;
    s.unloading = true;
    s.assigned = true;
    s.startUnload = now;
    s.finish = now + s.unloadTime;

    c.busy = true;
    c.busyUntil = *s.finish;

    std::string typeStr = (c.type == CargoType::BULK)     ? "BULK"
                     : (c.type == CargoType::LIQUID) ? "LIQUID"
                                                     : "CONTAINER";

    std::string typeIcon = (c.type == CargoType::BULK)     ? "⛏"
                      : (c.type == CargoType::LIQUID) ? "🛢"
                                                      : "📦";

    std::cout << termcolor::cyan << "🕓 [t=" << std::setw(5) << now << "] " << termcolor::reset
         << "🏗 " << typeIcon << " Назначен " << std::setw(10) << std::left << s.name
         << " → док " << typeStr << " (⏱ до " << *s.finish << ")" << '\n';
  }
}

void Port::completeFinished() {
  for (auto &s : ships) {
    if (s.unloading && s.finish && *s.finish <= now) {
      s.unloading = false;
      s.finished = true;
      s.assigned = false;

      std::string icon = (s.type == CargoType::BULK)     ? "⛏"
                    : (s.type == CargoType::LIQUID) ? "🛢"
                                                    : "📦";

      std::cout << termcolor::green << "🕓 [t=" << std::setw(5) << now << "] " << termcolor::reset
           << "✅ Завершена разгрузка: " << icon << " " << s.name << '\n';
    }
  }
}

void Port::accrueFine() {
  double prevFine = fine;
  for (auto const &s : ships)
    if (!s.finished && !s.unloading && s.actualArrival <= now)
      fine += cfg->finePerMinute * cfg->step;

  if (fine > prevFine) {
    std::cout << termcolor::yellow << "Начислен штраф: +" << (fine - prevFine)
         << " (итого: " << fine << ")" << termcolor::reset << '\n';
  }
}

json Port::getState() const {
  json shipsJson = json::array();

  for (auto const &s : ships) {
    int timeToArrival = std::max(0, s.actualArrival - now);
    int timeToFinish = 0;

    if (s.unloading && s.finish && *s.finish > now)
      timeToFinish = *s.finish - now;

    double currentFine = 0.0;
    if (s.inQueue && s.actualArrival <= now)
      currentFine = (now - s.actualArrival) * cfg->finePerMinute;

    shipsJson.push_back(
        {{"name", s.name},
         {"type", (s.type == CargoType::BULK     ? "BULK"
                   : s.type == CargoType::LIQUID ? "LIQUID"
                                                 : "CONTAINER")},
         {"arrival", s.arrival},
         {"actualArrival", s.actualArrival},
         {"weight", s.weight},
         {"unloadTime", s.unloadTime},
         {"inQueue", s.inQueue},
         {"unloading", s.unloading},
         {"finished", s.finished},
         {"startUnload", s.startUnload ? *s.startUnload : -1},
         {"finish", s.finish ? *s.finish : -1},
         {"timeToArrival", timeToArrival},
         {"timeToFinish", timeToFinish},
         {"currentFine", currentFine}});
  }

  json cranesJson = json::array();
  for (auto const &c : cranes) {
    cranesJson.push_back(
        {{"type", (c.type == CargoType::BULK     ? "BULK"
                   : c.type == CargoType::LIQUID ? "LIQUID"
                                                 : "CONTAINER")},
         {"busy", c.busy},
         {"busyUntil", c.busyUntil}});
  }

  return {{"now", now},
          {"fine", fine},
          {"ships", shipsJson},
          {"cranes", cranesJson},
          {"queueBulk", qBulk.size()},
          {"queueLiquid", qLiquid.size()},
          {"queueContainer", qContainer.size()}};
}
