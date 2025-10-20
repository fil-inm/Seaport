cmake_minimum_required(VERSION 3.10)
project(Seaport)
set(CMAKE_CXX_STANDARD 17)

add_executable(backend src/main.cpp
        include/api.hpp
        src/api.cpp
        include/port.hpp
        src/port.cpp
        include/config.hpp)
target_include_directories(backend PRIVATE include)