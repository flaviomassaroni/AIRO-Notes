add_library(core_library SHARED
    utils/blob.cpp
    utils/deserializer.cpp
    utils/id_context.cpp
    utils/identifiable.cpp
    utils/id_placeholder.cpp
    utils/object_data.cpp
    utils/property_container.cpp
    utils/property_container_manager.cpp
    utils/property.cpp
    utils/property_eigen.cpp
    utils/property_identifiable.cpp
    utils/serializable.cpp
    utils/serialization_context.cpp
    utils/serializer.cpp


    messages/base_sensor_message.cpp
    messages/odometry_message.cpp
    messages/pose_message.cpp
)

# TODO: Include the current directory ( . ) to the list of directories to search for header files
include_directories(. data_structures, geometry)


# TODO: Include the Eigen3 library to the list of libraries to link against
target_link_libraries(core_library Eigen3::Eigen)