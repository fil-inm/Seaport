#include "api.hpp"
#include "port.hpp"
#include "json.hpp"
#include <iostream>
#include <chrono>
#include <iomanip>

using json = nlohmann::json;

// === Цвета для логов ===
namespace logcolor {
    constexpr const char* reset  = "\033[0m";
    constexpr const char* blue   = "\033[36m";
    constexpr const char* green  = "\033[32m";
    constexpr const char* yellow = "\033[33m";
    constexpr const char* red    = "\033[31m";
    constexpr const char* gray   = "\033[90m";
}

// === CORS ===
void add_cors(httplib::Response &res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

// === Глобальные переменные ===
static SimulationConfig config;
static Port port;

// === Инициализация порта ===
void init_port_from_config() {
    port.setConfig(&config);
    port.reset();
}

// === Утилита логирования ===
void logRequest(const httplib::Request& req, int statusCode, double durationMs) {
    using namespace logcolor;

    std::string color = (statusCode >= 200 && statusCode < 300)
                        ? green
                        : (statusCode == 404 ? yellow : red);

    auto now = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
    std::tm* tm = std::localtime(&now);
    std::ostringstream timestamp;
    timestamp << std::put_time(tm, "%H:%M:%S");

    std::cout << gray << "[" << timestamp.str() << "] " << reset
              << blue << req.method << " " << reset
              << req.path << " "
              << color << statusCode << reset
              << " (" << std::fixed << std::setprecision(1) << durationMs << " ms)"
              << std::endl;
}

// === Обёртка для маршрутов с логированием ===
template<typename Handler>
auto withLogging(Handler handler) {
    return [handler](const httplib::Request& req, httplib::Response& res) {
        auto start = std::chrono::steady_clock::now();

        handler(req, res); // выполняем обработчик

        auto end = std::chrono::steady_clock::now();
        double durationMs =
            std::chrono::duration<double, std::milli>(end - start).count();

        logRequest(req, res.status ? res.status : 200, durationMs);
    };
}

// === Настройка маршрутов ===
void setup_routes(httplib::Server& app) {
    // CORS preflight
    app.Options(R"(.*)", withLogging([](const httplib::Request&, httplib::Response& res) {
        add_cors(res);
        res.status = 200;
    }));

    // --- Получить текущий конфиг ---
    app.Get("/config", withLogging([](const httplib::Request&, httplib::Response& res) {
        add_cors(res);
        res.set_content(config.to_json().dump(2), "application/json");
        res.status = 200;
    }));

    // --- Обновить конфиг ---
    app.Post("/config", withLogging([](const httplib::Request& req, httplib::Response& res) {
        add_cors(res);
        try {
            auto body = json::parse(req.body);
            config = SimulationConfig::from_json(body);
            init_port_from_config();

            res.set_content(config.to_json().dump(2), "application/json");
            res.status = 200;
        } catch (std::exception& e) {
            res.status = 400;
            res.set_content(json{{"error", e.what()}}.dump(), "application/json");
        }
    }));

    // --- Получить состояние ---
    app.Get("/state", withLogging([](const httplib::Request&, httplib::Response& res) {
        add_cors(res);
        res.set_content(port.getState().dump(2), "application/json");
        res.status = 200;
    }));

    // --- Сделать шаг ---
    app.Post("/step", withLogging([](const httplib::Request& req, httplib::Response& res) {
        add_cors(res);
        int dt = config.step;

        if (!req.body.empty()) {
            try {
                auto j = json::parse(req.body);
                if (j.contains("dt")) dt = j["dt"];
            } catch (...) {}
        }
        if (req.has_param("dt")) dt = std::stoi(req.get_param_value("dt"));

        port.simulateStep(dt);
        res.set_content(port.getState().dump(2), "application/json");
        res.status = 200;
    }));

    // --- Сброс ---
    app.Post("/reset", withLogging([](const httplib::Request&, httplib::Response& res) {
        add_cors(res);
        port.reset();
        res.set_content(port.getState().dump(2), "application/json");
        res.status = 200;
    }));

    // --- fallback ---
    app.set_error_handler(withLogging([](const httplib::Request& r, httplib::Response& res) {
        add_cors(res);
        res.status = 404;
        res.set_content(json{
            {"error", "Route not found"},
            {"path", r.path}
        }.dump(2), "application/json");
    }));
}