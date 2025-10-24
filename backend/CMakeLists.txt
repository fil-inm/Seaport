cmake_minimum_required(VERSION 3.10)
project(Seaport)
set(CMAKE_CXX_STANDARD 17)


set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
if(CMAKE_EXPORT_COMPILE_COMMANDS)
    add_custom_target(copy_compile_commands ALL
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
        ${CMAKE_BINARY_DIR}/compile_commands.json
        ${CMAKE_SOURCE_DIR}/compile_commands.json
    )
endif()

add_executable(backend src/main.cpp
        src/api.cpp
        src/port.cpp)

target_include_directories(backend PRIVATE include)
