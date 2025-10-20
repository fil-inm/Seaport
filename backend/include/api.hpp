#pragma once
#include "httplib.h"

void setup_routes(httplib::Server& app);

void init_port_from_config();