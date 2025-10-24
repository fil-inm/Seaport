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
    Ship s;
    s.name = plan.name;
    s.type = plan.type;
    s.arrival = plan.arrival;
    s.weight = plan.weight;
    s.actualArrival =
        std::max(0, s.arrival + randomJitter(cfg->arrivalJitterMin,
                                             cfg->arrivalJitterMax));
    s.unloadTime = computeUnloadTime(s);
    ships.push_back(s);
  }

  using namespace std;
  cout << "\n⚓ Порт инициализирован\n";
  cout << "───────────────────────────────────────────────\n";
  cout << "📦 Кораблей: " << ships.size() << "   ⚙️  Кранов: " << cranes.size()
       << "\n";
  cout << "───────────────────────────────────────────────\n";

  for (auto const &s : ships) {
    string typeIcon, typeName;
    switch (s.type) {
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

    cout << typeIcon << " " << setw(10) << left << s.name << " | " << setw(10)
         << left << typeName << " | Прибытие: " << setw(5) << s.arrival << " → "
         << setw(5) << s.actualArrival << " | Вес: " << setw(7) << s.weight
         << " | Разгрузка: " << s.unloadTime << " мин"
         << "\n";
  }

  cout << "───────────────────────────────────────────────\n";
  cout << " Краны:\n";
  cout << "  • BULK: " << cfg->cranesBulk << "\n";
  cout << "  • LIQUID: " << cfg->cranesLiquid << "\n";
  cout << "  • CONTAINER: " << cfg->cranesContainer << "\n";
  cout << "───────────────────────────────────────────────\n\n";
}

void Port::simulateStep(int delta) {
  if (!cfg || delta <= 0)
    return;

  now += delta;

  for (auto &c : cranes)
    if (c.busy && c.busyUntil <= now)
      c.busy = false;

  enqueueArrivals();

  tryAssignCranes();

  completeFinished();

  accrueFine();
}

void Port::enqueueArrivals() {
  using namespace std;
  using namespace termcolor;

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

      string typeIcon = (s.type == CargoType::BULK)     ? "⛏"
                        : (s.type == CargoType::LIQUID) ? "🛢"
                                                        : "📦";

      cout << blue << "🕓 [t=" << setw(5) << now << "] " << termcolor::reset
           << typeIcon << " " << setw(10) << left << s.name
           << " — прибыл в порт (очередь: " << typeIcon << ")" << endl;
    }
  }
}

void Port::tryAssignCranes() {
  using namespace std;
  using namespace termcolor;

  auto popQ = [&](CargoType t, int &idx) -> bool {
    queue<int> *q = nullptr;
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

    string typeStr = (c.type == CargoType::BULK)     ? "BULK"
                     : (c.type == CargoType::LIQUID) ? "LIQUID"
                                                     : "CONTAINER";

    string typeIcon = (c.type == CargoType::BULK)     ? "⛏"
                      : (c.type == CargoType::LIQUID) ? "🛢"
                                                      : "📦";

    cout << cyan << "🕓 [t=" << setw(5) << now << "] " << termcolor::reset
         << "🏗 " << typeIcon << " Назначен " << setw(10) << left << s.name
         << " → док " << typeStr << " (⏱ до " << *s.finish << ")" << endl;
  }
}

void Port::completeFinished() {
  using namespace std;
  using namespace termcolor;

  for (auto &s : ships) {
    if (s.unloading && s.finish && *s.finish <= now) {
      s.unloading = false;
      s.finished = true;
      s.assigned = false;

      string icon = (s.type == CargoType::BULK)     ? "⛏"
                    : (s.type == CargoType::LIQUID) ? "🛢"
                                                    : "📦";

      cout << green << "🕓 [t=" << setw(5) << now << "] " << termcolor::reset
           << "✅ Завершена разгрузка: " << icon << " " << s.name << endl;
    }
  }
}

void Port::accrueFine() {
  using namespace std;
  using namespace termcolor;

  double prevFine = fine;
  for (auto const &s : ships)
    if (!s.finished && !s.unloading && s.actualArrival <= now)
      fine += cfg->finePerMinute * cfg->step;

  if (fine > prevFine) {
    cout << yellow << "💰 Начислен штраф: +" << (fine - prevFine)
         << " (итого: " << fine << ")" << termcolor::reset << endl;
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
