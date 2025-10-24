#pragma once
#include "config.hpp"
#include "json.hpp"
#include <optional>
#include <queue>
#include <random>
#include <string>
#include <vector>

using json = nlohmann::json;

struct Ship {
  std::string name;
  CargoType type;
  int arrival = 0;
  int actualArrival = 0;
  int weight = 0;
  int unloadTime = 0;
  bool inQueue = false;
  bool unloading = false;
  bool finished = false;
  bool assigned = false;
  std::optional<int> startUnload;
  std::optional<int> finish;
};

struct Crane {
  CargoType type;
  bool busy = false;
  int busyUntil = 0;
};

class Port {
public:
  int now = 0;
  double fine = 0.0;
  SimulationConfig *cfg = nullptr;

  std::vector<Ship> ships;
  std::vector<Crane> cranes;

  std::queue<int> qBulk, qLiquid, qContainer;
  std::mt19937 rng{std::random_device{}()};

  void setConfig(SimulationConfig *c);
  void reset();
  void simulateStep(int delta);
  json getState() const;

private:
  int randomJitter(int left, int right);
  int computeUnloadTime(const Ship &ship);
  void enqueueArrivals();
  void tryAssignCranes();
  void completeFinished();
  void accrueFine();
};
