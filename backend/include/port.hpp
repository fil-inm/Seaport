#pragma once
#include <vector>
#include <string>
#include <queue>
#include <optional>
#include <random>
#include "json.hpp"
#include "config.hpp"

using json = nlohmann::json;



struct Ship {
    std::string name;
    CargoType type;
    int arrival = 0;        // запланированное прибытие
    int actualArrival = 0;  // с джиттером
    int weight = 0;         // кг
    int unloadTime = 0;     // мин
    bool inQueue = false;
    bool unloading = false;
    bool finished = false;
    std::optional<int> startUnload;
    std::optional<int> finish;
};

struct Crane {
    CargoType type;
    bool busy = false;
    int busyUntil = 0; // минута, когда освободится
};

class Port {
public:
    int now = 0;         // текущее время (мин)
    double fine = 0.0;   // суммарный штраф
    SimulationConfig* cfg = nullptr;

    std::vector<Ship> ships;
    std::vector<Crane> cranes;

    std::queue<int> qBulk, qLiquid, qContainer;
    std::mt19937 rng{std::random_device{}()};

    // --- Основные методы ---
    void setConfig(SimulationConfig* c);
    void reset();
    void simulateStep(int delta);
    json getState() const;

private:
    int randomJitter(int a, int b);
    int computeUnloadTime(const Ship& s);
    void enqueueArrivals();
    void tryAssignCranes();
    void completeFinished();
    void accrueFine();
};