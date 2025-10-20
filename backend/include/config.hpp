#pragma once
#include <string>
#include <vector>
#include "json.hpp"

using json = nlohmann::json;

namespace tmux {
    constexpr int MIN  = 1;
    constexpr int HOUR = 60;
    constexpr int DAY  = 24 * HOUR;
}

enum class CargoType { BULK, LIQUID, CONTAINER };

struct SimulationConfig {
    // === Параметры времени ===
    int totalDuration = 30 * tmux::DAY;
    int step = 15; // минута моделирования

    // === Краны ===
    int cranesBulk = 2;
    int cranesLiquid = 2;
    int cranesContainer = 1;

    // === Случайные отклонения ===
    int arrivalJitterMin = -2 * tmux::DAY;
    int arrivalJitterMax =  9 * tmux::DAY;
    int unloadExtraMin   = 0;
    int unloadExtraMax   = 12 * tmux::HOUR;

    // === Скорость разгрузки (минуты за кг) ===
    double rateBulk = 0.02;
    double rateLiquid = 0.015;
    double rateContainer = 0.03;

    // === Штраф ===
    double finePerMinute = 2000.0 / tmux::DAY;

    // === Расписание ===
    struct ShipPlan {
        std::string name;
        CargoType type;
        int arrival; // минуты
        int weight;  // кг
    };
    std::vector<ShipPlan> schedule;

    // === Прочее ===
    bool autoStart = false;
    int seed = 42;

    // --- JSON сериализация ---
    json to_json() const {
        json sched = json::array();
        for (auto const& s : schedule) {
            std::string t;
            switch (s.type) {
                case CargoType::BULK: t = "BULK"; break;
                case CargoType::LIQUID: t = "LIQUID"; break;
                case CargoType::CONTAINER: t = "CONTAINER"; break;
            }
            sched.push_back({
                {"name", s.name},
                {"type", t},
                {"arrival", s.arrival},
                {"weight", s.weight}
            });
        }

        return {
            {"totalDuration", totalDuration},
            {"step", step},
            {"cranesBulk", cranesBulk},
            {"cranesLiquid", cranesLiquid},
            {"cranesContainer", cranesContainer},
            {"arrivalJitterMin", arrivalJitterMin},
            {"arrivalJitterMax", arrivalJitterMax},
            {"unloadExtraMin", unloadExtraMin},
            {"unloadExtraMax", unloadExtraMax},
            {"rateBulk", rateBulk},
            {"rateLiquid", rateLiquid},
            {"rateContainer", rateContainer},
            {"finePerMinute", finePerMinute},
            {"autoStart", autoStart},
            {"seed", seed},
            {"schedule", sched}
        };
    }

    static SimulationConfig from_json(const json& j) {
        SimulationConfig c;
        if (j.contains("totalDuration")) c.totalDuration = j["totalDuration"];
        if (j.contains("step")) c.step = j["step"];
        if (j.contains("cranesBulk")) c.cranesBulk = j["cranesBulk"];
        if (j.contains("cranesLiquid")) c.cranesLiquid = j["cranesLiquid"];
        if (j.contains("cranesContainer")) c.cranesContainer = j["cranesContainer"];
        if (j.contains("arrivalJitterMin")) c.arrivalJitterMin = j["arrivalJitterMin"];
        if (j.contains("arrivalJitterMax")) c.arrivalJitterMax = j["arrivalJitterMax"];
        if (j.contains("unloadExtraMin")) c.unloadExtraMin = j["unloadExtraMin"];
        if (j.contains("unloadExtraMax")) c.unloadExtraMax = j["unloadExtraMax"];
        if (j.contains("rateBulk")) c.rateBulk = j["rateBulk"];
        if (j.contains("rateLiquid")) c.rateLiquid = j["rateLiquid"];
        if (j.contains("rateContainer")) c.rateContainer = j["rateContainer"];
        if (j.contains("finePerMinute")) c.finePerMinute = j["finePerMinute"];
        if (j.contains("autoStart")) c.autoStart = j["autoStart"];
        if (j.contains("seed")) c.seed = j["seed"];

        if (j.contains("schedule")) {
            for (auto& s : j["schedule"]) {
                SimulationConfig::ShipPlan sp;
                sp.name = s["name"];
                std::string t = s["type"];
                if (t == "BULK") sp.type = CargoType::BULK;
                else if (t == "LIQUID") sp.type = CargoType::LIQUID;
                else sp.type = CargoType::CONTAINER;
                sp.arrival = s["arrival"];
                sp.weight = s["weight"];
                c.schedule.push_back(sp);
            }
        }

        return c;
    }

    SimulationConfig() {
        schedule = {
            {"Aurora",      CargoType::BULK,      1,        450000},
            {"Poseidon",    CargoType::LIQUID,    720,      600000},
            {"Mercury",     CargoType::CONTAINER, 1440,     220000},
            {"Orion",       CargoType::BULK,      2160,     520000},
            {"Neptune",     CargoType::LIQUID,    2880,     780000},
            {"Vega",        CargoType::CONTAINER, 3600,     310000},
            {"Sirius",      CargoType::BULK,      4320,     480000},
            {"Andromeda",   CargoType::LIQUID,    5040,     640000},
            {"Titan",       CargoType::CONTAINER, 5760,     260000},
            {"Altair",      CargoType::BULK,      6480,     570000},
            {"Nereid",      CargoType::LIQUID,    7200,     700000},
            {"Callisto",    CargoType::CONTAINER, 7920,     280000}
        };
    }
};