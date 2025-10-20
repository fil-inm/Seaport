cmake_minimum_required(VERSION 3.10)
project(Seaport)
set(CMAKE_CXX_STANDARD 17)

add_executable(backend src/main.cpp
        include/api.hpp
        src/api.cpp)
target_include_directories(backend PRIVATE include)