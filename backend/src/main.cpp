#include "httplib.h"
#include "api.hpp"
#include <iostream>

int main() {
    httplib::Server app;
    setup_routes(app);


    init_port_from_config();



    std::cout << " 🚢 Портовый сервер http://localhost:3000" << std::endl;
    app.listen("localhost", 3000);
    return 0;
}
