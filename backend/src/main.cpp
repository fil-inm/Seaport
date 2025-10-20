#include "httplib.h"
#include "api.hpp"
#include <iostream>

int main() {
    httplib::Server app;
    setup_routes(app);
    std::cout << " Server running on http://localhost:3000" << std::endl;
    app.listen("localhost", 3000);
    return 0;
}