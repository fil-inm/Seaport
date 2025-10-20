#include "api.hpp"
#include "json.hpp"
#include <ctime>
using json = nlohmann::json;

// Хелпер для CORS
void add_cors(httplib::Response &res) {
    res.set_header("Access-Control-Allow-Origin", "*");
    res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

void setup_routes(httplib::Server &app) {
    app.Options(".*", [](const httplib::Request &, httplib::Response &res) {
        add_cors(res);
        res.status = 200;
    });

    // --- GET /api/now ---
    app.Get("/api/now", [](const httplib::Request &, httplib::Response &res) {
        std::time_t now = std::time(nullptr);
        json response = {{"timestamp", now}};
        add_cors(res);
        res.set_content(response.dump(), "application/json");

        // TODO: заменить простую метку времени на данные из системы или другой источник
    });

    // --- GET /api/settings ---
    app.Get("/api/settings", [](const httplib::Request &, httplib::Response &res) {
        json settings = {
            {"theme", "light"},
            {"volume", 50},
            {"language", "en"}
        };
        add_cors(res);
        res.set_content(settings.dump(), "application/json");

        // TODO: вернуть реальные настройки из файла или БД
    });

    // --- POST /api/settings ---
    app.Post("/api/settings", [](const httplib::Request &req, httplib::Response &res) {
        json body;
        try {
            body = json::parse(req.body);
        } catch (...) {
            body = {{"error", "invalid JSON"}};
        }

        json response = {
            {"status", "ok"},
            {"received", body},
            {"message", "settings accepted"} // временный ответ-заглушка
        };

        add_cors(res);
        res.set_content(response.dump(), "application/json");

        // TODO: сохранить настройки в файл или базу данных
    });
}