#include "port.hpp"
#include <algorithm>
#include <cmath>

// === helpers ===
int Port::randomJitter(int a, int b){
    if (a > b) std::swap(a, b);
    std::uniform_int_distribution<int> dist(a, b);
    return dist(rng);
}

int Port::computeUnloadTime(const Ship& s) {
    double rate = 0.0;
    switch (s.type) {
        case CargoType::BULK:      rate = cfg->rateBulk; break;
        case CargoType::LIQUID:    rate = cfg->rateLiquid; break;
        case CargoType::CONTAINER: rate = cfg->rateContainer; break;
    }

    int base = static_cast<int>(std::round(s.weight * rate));
    int extra = 0;
    if (cfg->unloadExtraMax > cfg->unloadExtraMin)
        extra = randomJitter(cfg->unloadExtraMin, cfg->unloadExtraMax);
    return std::max(1, base + extra);
}

// === public ===
void Port::setConfig(SimulationConfig* c) {
    cfg = c;
    rng.seed(cfg->seed);
}

void Port::reset() {
    if (!cfg) return;

    now = 0;
    fine = 0;
    ships.clear();
    cranes.clear();
    while (!qBulk.empty()) qBulk.pop();
    while (!qLiquid.empty()) qLiquid.pop();
    while (!qContainer.empty()) qContainer.pop();

    // Краны
    for (int i = 0; i < cfg->cranesBulk; ++i)
        cranes.push_back({CargoType::BULK, false, 0});
    for (int i = 0; i < cfg->cranesLiquid; ++i)
        cranes.push_back({CargoType::LIQUID, false, 0});
    for (int i = 0; i < cfg->cranesContainer; ++i)
        cranes.push_back({CargoType::CONTAINER, false, 0});

    // Корабли
    for (auto const& plan : cfg->schedule) {
        Ship s;
        s.name = plan.name;
        s.type = plan.type;
        s.arrival = plan.arrival;
        s.weight = plan.weight;
        s.actualArrival = std::max(0, s.arrival + randomJitter(cfg->arrivalJitterMin, cfg->arrivalJitterMax));
        s.unloadTime = computeUnloadTime(s);
        ships.push_back(s);
    }
}

void Port::simulateStep(int delta) {
    if (!cfg) return;
    if (delta <= 0) return;

    int target = now + delta;
    while (now < target) {
        now += cfg->step;

        // 1. освободить краны
        for (auto& c : cranes)
            if (c.busy && c.busyUntil <= now)
                c.busy = false;

        // 2. новые прибытия
        enqueueArrivals();

        // 3. дать кранам работу
        tryAssignCranes();

        // 4. завершить разгрузку
        completeFinished();

        // 5. начислить штрафы
        accrueFine();
    }
}

void Port::enqueueArrivals() {
    for (int i = 0; i < (int)ships.size(); ++i) {
        auto& s = ships[i];
        if (!s.finished && !s.unloading && !s.inQueue && s.actualArrival <= now) {
            s.inQueue = true;
            switch (s.type) {
                case CargoType::BULK: qBulk.push(i); break;
                case CargoType::LIQUID: qLiquid.push(i); break;
                case CargoType::CONTAINER: qContainer.push(i); break;
            }
        }
    }
}

void Port::tryAssignCranes() {
    auto popQ = [&](CargoType t, int& idx) -> bool {
        if (t == CargoType::BULK && !qBulk.empty()) { idx = qBulk.front(); qBulk.pop(); return true; }
        if (t == CargoType::LIQUID && !qLiquid.empty()) { idx = qLiquid.front(); qLiquid.pop(); return true; }
        if (t == CargoType::CONTAINER && !qContainer.empty()) { idx = qContainer.front(); qContainer.pop(); return true; }
        return false;
    };

    for (auto& c : cranes) {
        if (c.busy) continue;
        int idx = -1;
        if (!popQ(c.type, idx)) continue;
        auto& s = ships[idx];
        s.inQueue = false;
        s.unloading = true;
        s.startUnload = now;
        s.finish = now + s.unloadTime;
        c.busy = true;
        c.busyUntil = *s.finish;
    }
}

void Port::completeFinished() {
    for (auto& s : ships)
        if (s.unloading && s.finish && *s.finish <= now) {
            s.unloading = false;
            s.finished = true;
        }
}

void Port::accrueFine() {
    for (auto const& s : ships)
        if (!s.finished && !s.unloading && s.actualArrival <= now)
            fine += cfg->finePerMinute * cfg->step;
}

json Port::getState() const {
    json shipsJson = json::array();
    for (auto const& s : ships) {
        shipsJson.push_back({
            {"name", s.name},
            {"type", (s.type == CargoType::BULK ? "BULK" : s.type == CargoType::LIQUID ? "LIQUID" : "CONTAINER")},
            {"arrival", s.arrival},
            {"actualArrival", s.actualArrival},
            {"weight", s.weight},
            {"unloadTime", s.unloadTime},
            {"inQueue", s.inQueue},
            {"unloading", s.unloading},
            {"finished", s.finished},
            {"startUnload", s.startUnload ? *s.startUnload : -1},
            {"finish", s.finish ? *s.finish : -1}
        });
    }

    json cranesJson = json::array();
    for (auto const& c : cranes)
        cranesJson.push_back({
            {"type", (c.type == CargoType::BULK ? "BULK" : c.type == CargoType::LIQUID ? "LIQUID" : "CONTAINER")},
            {"busy", c.busy},
            {"busyUntil", c.busyUntil}
        });

    return {
        {"now", now},
        {"fine", fine},
        {"ships", shipsJson},
        {"cranes", cranesJson},
        {"queueBulk", qBulk.size()},
        {"queueLiquid", qLiquid.size()},
        {"queueContainer", qContainer.size()}
    };
}